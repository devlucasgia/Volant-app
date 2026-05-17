import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPPORT_EMAIL = "suporte.volant@gmail.com";
const FROM_EMAIL = "Volant <onboarding@resend.dev>";

function esc(s: string) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    if (!RESEND_API_KEY) throw new Error("missing RESEND_API_KEY");

    const body = await req.json().catch(() => ({}));
    const userId = String(body?.user_id || "").trim();
    if (!userId || !/^[0-9a-f-]{36}$/i.test(userId)) {
      return new Response(JSON.stringify({ error: "invalid user_id" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

    // Global rate limit: max 30 notifications per minute (across all users)
    const oneMinAgo = new Date(Date.now() - 60_000).toISOString();
    const { count } = await admin
      .from("signup_notifications")
      .select("user_id", { count: "exact", head: true })
      .gte("sent_at", oneMinAgo);

    if ((count ?? 0) >= 30) {
      console.warn("[notify-new-user] rate_limited", { recent: count });
      return new Response(JSON.stringify({ error: "rate_limited" }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Dedup: insert first; if conflict, we've already notified about this user.
    const { error: insertErr } = await admin
      .from("signup_notifications")
      .insert({ user_id: userId });
    if (insertErr) {
      // Unique violation -> already sent
      if ((insertErr as { code?: string }).code === "23505") {
        return new Response(JSON.stringify({ ok: true, duplicate: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      console.warn("[notify-new-user] insert failed", insertErr);
      // Fall through: still try to send the email
    }

    // Fetch the user (validates that user_id exists)
    const { data: userRes, error: userErr } = await admin.auth.admin.getUserById(userId);
    if (userErr || !userRes?.user) {
      console.warn("[notify-new-user] user not found", userId, userErr);
      return new Response(JSON.stringify({ error: "user_not_found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const u = userRes.user;
    const meta = (u.user_metadata || {}) as Record<string, unknown>;
    const appMeta = (u.app_metadata || {}) as Record<string, unknown>;
    const provider =
      (appMeta.provider as string) || (Array.isArray(appMeta.providers) ? (appMeta.providers as string[])[0] : "") || "email";
    const methodLabel = provider === "google" ? "Google" : provider === "email" ? "Email/Senha" : provider;
    const name =
      (meta.display_name as string) ||
      (meta.full_name as string) ||
      (meta.name as string) ||
      "—";
    const createdAt = u.created_at || new Date().toISOString();

    const subject = `[Volant] Novo cadastro: ${u.email || name}`;
    const text = [
      `Novo usuário cadastrado no Volant.`,
      ``,
      `Nome: ${name}`,
      `E-mail: ${u.email || "—"}`,
      `Método de cadastro: ${methodLabel}`,
      `Data/hora: ${createdAt}`,
      `User ID: ${u.id}`,
    ].join("\n");
    const html = `
      <div style="font-family:ui-sans-serif,system-ui,Arial;background:#f8fafc;padding:24px;color:#0f172a">
        <div style="max-width:520px;margin:0 auto;background:#ffffff;border-radius:12px;padding:24px;border:1px solid #e2e8f0">
          <h2 style="margin:0 0 12px;font-size:18px">Novo cadastro no Volant</h2>
          <p style="margin:0 0 16px;color:#475569;font-size:14px">Um novo usuário acabou de criar uma conta.</p>
          <table style="width:100%;border-collapse:collapse;font-size:14px">
            <tr><td style="padding:6px 0;color:#64748b">Nome</td><td style="padding:6px 0;text-align:right"><strong>${esc(name)}</strong></td></tr>
            <tr><td style="padding:6px 0;color:#64748b">E-mail</td><td style="padding:6px 0;text-align:right"><strong>${esc(u.email || "—")}</strong></td></tr>
            <tr><td style="padding:6px 0;color:#64748b">Método</td><td style="padding:6px 0;text-align:right"><strong>${esc(methodLabel)}</strong></td></tr>
            <tr><td style="padding:6px 0;color:#64748b">Data/hora</td><td style="padding:6px 0;text-align:right">${esc(createdAt)}</td></tr>
            <tr><td style="padding:6px 0;color:#64748b">User ID</td><td style="padding:6px 0;text-align:right;font-family:ui-monospace,Menlo,monospace;font-size:12px">${esc(u.id)}</td></tr>
          </table>
        </div>
      </div>
    `;

    const emailRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: [SUPPORT_EMAIL],
        subject,
        text,
        html,
      }),
    });

    if (!emailRes.ok) {
      const errText = await emailRes.text();
      console.error("[notify-new-user] resend error", emailRes.status, errText);
      return new Response(JSON.stringify({ error: "email_failed" }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("[notify-new-user]", e);
    return new Response(JSON.stringify({ error: "internal" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
