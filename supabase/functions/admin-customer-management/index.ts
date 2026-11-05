import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
});

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ message: 'Method not allowed.' }, 405);

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!serviceRoleKey) return json({ message: 'Server configuration is missing SUPABASE_SERVICE_ROLE_KEY.' }, 500);

  const authHeader = req.headers.get('Authorization') || '';
  const token = authHeader.replace(/^Bearer\s+/i, '');
  if (!token) return json({ message: 'Sign in as the authorised admin first.' }, 401);

  const authClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: `Bearer ${token}` } } });
  const { data: authData, error: authError } = await authClient.auth.getUser(token);
  const adminUser = authData?.user;
  if (authError || !adminUser || String(adminUser.email || '').toLowerCase() !== 'anowarali2707@outlook.com') {
    return json({ message: 'Not authorised to manage customer passwords.' }, 403);
  }

  let body: { action?: string; user_id?: string };
  try { body = await req.json(); } catch { return json({ message: 'Invalid request body.' }, 400); }
  if (body.action !== 'temporary_password' || !body.user_id) return json({ message: 'A valid action and customer user_id are required.' }, 400);
  if (body.user_id === adminUser.id) return json({ message: 'You cannot issue a customer password for the admin account.' }, 400);

  const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } });
  const { data: targetData, error: targetError } = await admin.auth.admin.getUserById(body.user_id);
  if (targetError || !targetData?.user) return json({ message: 'Customer account was not found.' }, 404);
  const customer = targetData.user;
  if (String(customer.email || '').toLowerCase() === 'anowarali2707@outlook.com') return json({ message: 'Admin account cannot be changed from this action.' }, 400);

  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%';
  const random = new Uint8Array(18);
  crypto.getRandomValues(random);
  const temporaryPassword = Array.from(random, n => alphabet[n % alphabet.length]).join('') + 'a7!';
  const metadata = { ...(customer.user_metadata || {}), must_change_password: true, temporary_password_issued_at: new Date().toISOString() };
  const { error: updateError } = await admin.auth.admin.updateUserById(body.user_id, {
    password: temporaryPassword,
    user_metadata: metadata,
  });
  if (updateError) return json({ message: updateError.message }, 400);

  // The generated credential is returned once to the authorised admin only.
  return json({ success: true, temporary_password: temporaryPassword, customer_email: customer.email, message: 'Temporary password generated. Share it privately with the customer.' });
});
