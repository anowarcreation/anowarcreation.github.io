import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const ADMIN_EMAIL = "anowarali2707@outlook.com";
const ALLOWED_ORIGIN = "https://anowarcreation.github.io";
const corsHeaders = {
  "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Vary": "Origin",
};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status, headers: { ...corsHeaders, "Content-Type": "application/json; charset=utf-8" },
});
const clean = (value: unknown, max = 10000) => String(value ?? "").trim().slice(0, max);
const escapeHtml = (value: string) => value.replace(/[&<>"']/g, c => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
}[c] as string));
const htmlToText = (value: string) => value
  .replace(/<br\s*\/?\s*>/gi, "\n")
  .replace(/<\/(p|div|li|h[1-6])\s*>/gi, "\n")
  .replace(/<[^>]*>/g, " ")
  .replace(/&nbsp;/gi, " ").replace(/&amp;/gi, "&").replace(/&lt;/gi, "<").replace(/&gt;/gi, ">")
  .replace(/[ \t]+/g, " ").replace(/\n\s*\n+/g, "\n\n").trim();

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return json({ success: false, message: "Method not allowed." }, 405);
  const origin = request.headers.get("origin") || "";
  if (origin && origin !== ALLOWED_ORIGIN) return json({ success: false, message: "Origin not allowed." }, 403);

  try {
    const authHeader = request.headers.get("Authorization") || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
    if (!token) return json({ success: false, message: "Admin sign-in is required." }, 401);
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const resendKey = Deno.env.get("RESEND_API_KEY");
    if (!supabaseUrl || !anonKey || !serviceKey) return json({ success: false, message: "Supabase server environment is not configured." }, 503);
    if (!resendKey) return json({ success: false, message: "Email provider is not configured. Add RESEND_API_KEY in Supabase Edge Function secrets." }, 503);

    const authClient = createClient(supabaseUrl, anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data: userData, error: authError } = await authClient.auth.getUser(token);
    if (authError || !userData?.user || String(userData.user.email || "").toLowerCase() !== ADMIN_EMAIL) {
      return json({ success: false, message: "Only the verified Anowar Creation admin can email subscribers." }, 403);
    }

    const body = await request.json().catch(() => ({}));
    const noticeId = clean(body?.notice_id, 80);
    if (!noticeId) return json({ success: false, message: "A notice ID is required." }, 400);
    const adminClient = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data: notice, error: noticeError } = await adminClient.from("site_notices").select("*").eq("id", noticeId).eq("is_active", true).maybeSingle();
    if (noticeError || !notice) return json({ success: false, message: "The published notice could not be found." }, 404);
    const { data: subscribers, error: subscribersError } = await adminClient.from("email_subscribers").select("email").eq("is_active", true);
    if (subscribersError) return json({ success: false, message: "Subscription list is not set up. Run the email_subscribers SQL first." }, 503);
    const emails = [...new Set((subscribers || []).map((s: {email: string}) => clean(s.email,254).toLowerCase()).filter((e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)))];
    if (!emails.length) return json({ success: true, sent: 0, failed: 0, subscribers: 0, message: "Notice published. No subscribers yet." });

    const content = clean(notice.content || notice.message || notice.body || "", 20000);
    const plain = htmlToText(content) || "A new notice has been published on Anowar Creation.";
    const imageMatch = content.match(/<img\b[^>]*\bsrc\s*=\s*["']([^"']+)["']/i);
    const imageUrl = imageMatch?.[1] || clean(notice.image_url || "", 1000);
    const trustedImage = imageUrl.startsWith(`${supabaseUrl}/storage/v1/object/public/notice-images/`) ? imageUrl : "";
    const title = clean(notice.title || "Anowar Creation Notice", 120);
    const from = Deno.env.get("CONTACT_FROM_EMAIL") || "Anowar Creation <onboarding@resend.dev>";
    let sent = 0, failed = 0;
    // Send in small parallel batches to avoid provider rate spikes.
    for (let i = 0; i < emails.length; i += 5) {
      const batch = emails.slice(i, i + 5);
      const outcomes = await Promise.all(batch.map(async (email: string) => {
        const response = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            from, to: [email], subject: `[Anowar Creation] ${title}`,
            text: `${title}\n\n${plain}\n\nYou received this email because you subscribed to Anowar Creation website notices and updates.`,
            html: `<div style="font-family:Arial,sans-serif;max-width:640px;margin:auto;padding:24px;color:#10213b"><div style="font-size:12px;letter-spacing:2px;color:#078fe8;font-weight:700">ANOWAR CREATION · WEBSITE NOTICE</div><h1 style="font-size:25px">${escapeHtml(title)}</h1>${trustedImage ? `<p><img src="${escapeHtml(trustedImage)}" alt="Notice image" style="display:block;max-width:100%;height:auto;border-radius:12px"></p>` : ""}<div style="font-size:15px;line-height:1.7;white-space:pre-wrap">${escapeHtml(plain)}</div><hr style="margin-top:28px;border:0;border-top:1px solid #d9e3f0"><p style="font-size:12px;color:#687890">You received this email because you subscribed to Anowar Creation website notices and updates.</p></div>`,
          }),
        });
        return response.ok;
      }).map(p => p.catch(() => false)));
      sent += outcomes.filter(Boolean).length;
      failed += outcomes.filter(ok => !ok).length;
    }
    return json({ success: true, sent, failed, subscribers: emails.length, message: failed ? `Notice published; ${sent} email(s) sent and ${failed} could not be sent.` : `Notice emailed to ${sent} subscriber(s).` });
  } catch (error) {
    console.error("send-site-notice-email failed:", error);
    return json({ success: false, message: "Could not send subscriber updates. Check the Edge Function logs." }, 500);
  }
});
