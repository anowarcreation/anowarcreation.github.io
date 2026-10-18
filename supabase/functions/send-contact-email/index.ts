import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const ADMIN_INBOX = "anowarali0499@gmail.com";
const ALLOWED_ORIGIN = "https://anowarcreation.github.io";
const corsHeaders = {
  "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Vary": "Origin",
};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { ...corsHeaders, "Content-Type": "application/json; charset=utf-8" },
});
const clean = (value: unknown, max: number) => String(value ?? "").trim().slice(0, max);
const htmlEscape = (value: string) => value.replace(/[&<>"']/g, c => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
}[c] as string));

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return json({ success: false, message: "Method not allowed." }, 405);
  const origin = request.headers.get("origin") || "";
  if (origin && origin !== ALLOWED_ORIGIN) return json({ success: false, message: "Origin not allowed." }, 403);

  try {
    const body = await request.json();
    // Honeypot for simple bots; intentionally return success without sending mail.
    if (clean(body?.website, 200)) return json({ success: true });
    const name = clean(body?.name, 120);
    const email = clean(body?.email, 180).toLowerCase();
    const subject = clean(body?.subject, 150);
    const message = clean(body?.message, 2500);
    if (!name || !subject || !message || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return json({ success: false, message: "Please provide a valid name, email, subject and message." }, 400);
    }
    const resendKey = Deno.env.get("RESEND_API_KEY");
    if (!resendKey) return json({ success: false, message: "Email backend is not configured yet. Add the RESEND_API_KEY secret in Supabase Edge Functions." }, 503);

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceRoleKey) return json({ success: false, message: "The Supabase server environment is not configured." }, 503);
    const serviceClient = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });

    // Lightweight server-side limit: no more than 3 messages from one email in 10 minutes.
    const since = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    const { count } = await serviceClient.from("contact_messages").select("id", { count: "exact", head: true }).eq("email", email).gte("created_at", since);
    if ((count || 0) >= 3) return json({ success: false, message: "Too many messages were sent recently. Please try again in a few minutes." }, 429);

    const { data: saved, error: saveError } = await serviceClient.from("contact_messages").insert({
      name, email, subject, message, email_status: "pending",
    }).select("id").single();
    if (saveError) return json({ success: false, message: "The contact inbox database is not set up. Run the included SQL file first." }, 503);

    const from = Deno.env.get("CONTACT_FROM_EMAIL") || "Anowar Creation <onboarding@resend.dev>";
    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Authorization": `Bearer ${resendKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from,
        to: [ADMIN_INBOX],
        reply_to: email,
        subject: `[Anowar Creation] ${subject}`,
        text: `New Contact Message\n\nName: ${name}\nEmail: ${email}\nSubject: ${subject}\n\nMessage:\n${message}\n\nSent from Anowar Creation website.`,
        html: `<h2>New Contact Message</h2><p><b>Name:</b> ${htmlEscape(name)}</p><p><b>Email:</b> ${htmlEscape(email)}</p><p><b>Subject:</b> ${htmlEscape(subject)}</p><hr><p style="white-space:pre-wrap">${htmlEscape(message)}</p><p style="color:#667085;font-size:12px">Sent from Anowar Creation website.</p>`,
      }),
    });
    const resendData = await resendResponse.json().catch(() => ({}));
    if (!resendResponse.ok) {
      await serviceClient.from("contact_messages").update({ email_status: "failed", delivery_error: clean(resendData?.message || resendData?.error || `Resend returned ${resendResponse.status}`, 1000) }).eq("id", saved.id);
      return json({ success: false, message: "Your message could not be emailed. Please check the email provider setup, or use the Open Email Draft link." }, 502);
    }
    await serviceClient.from("contact_messages").update({ email_status: "sent", provider_message_id: clean(resendData?.id || "", 200) }).eq("id", saved.id);
    return json({ success: true, message: "Message sent successfully.", id: saved.id });
  } catch (error) {
    console.error("send-contact-email failed:", error);
    return json({ success: false, message: "Could not send the email right now. Please try again later." }, 500);
  }
});
