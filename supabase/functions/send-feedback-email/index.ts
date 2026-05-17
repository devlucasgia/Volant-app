import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPPORT_EMAIL = "suporte.volant@gmail.com";
const FROM_EMAIL = "Volant Feedback <onboarding@resend.dev>";

interface DeviceInfo {
  appVersion?: string;
  userAgent?: string;
  platform?: string;
  language?: string;
  screen?: string;
  viewport?: string;
  pwa?: boolean;
  timezone?: string;
  submittedAt?: string;
}

interface Payload {
  type: "bug" | "suggestion";
  title: string;
  description: string;
  contactEmail?: string;
  screenshotPath?: string; // path inside feedback-screenshots bucket
  deviceInfo?: DeviceInfo;
}

function escapeHtml(s: string) {
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

    // Authenticated user
    const authHeader = req.headers.get("Authorization") || "";
    const userClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData } = await userClient.auth.getUser();
    const user = userData.user;
    if (!user) return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: corsHeaders });

    const body = (await req.json()) as Payload;
    if (!body || (body.type !== "bug" && body.type !== "suggestion")) {
      return new Response(JSON.stringify({ error: "invalid type" }), { status: 400, headers: corsHeaders });
    }
    const title = String(body.title || "").trim().slice(0, 200);
    const description = String(body.description || "").trim().slice(0, 4000);
    if (!title || !description) {
      return new Response(JSON.stringify({ error: "missing fields" }), { status: 400, headers: corsHeaders });
    }

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

    // ---- Rate limiting (per authenticated user) ----
    // Limit: max 3 submissions per minute.
    // Also blocks exact duplicate (same type+title+description) within 60s.
    const nowMs = Date.now();
    const oneMinAgo = new Date(nowMs - 60 * 1000).toISOString();

    const { data: recent, error: recentErr } = await admin
      .from("feedback_reports")
      .select("created_at,type,title,description")
      .eq("user_id", user.id)
      .gte("created_at", oneMinAgo)
      .order("created_at", { ascending: false })
      .limit(10);

    if (recentErr) {
      console.error("[send-feedback-email] rate-limit lookup failed", recentErr);
    } else if (recent) {
      const inLastMinute = recent.length;

      if (inLastMinute >= 3) {
        console.warn("[send-feedback-email] rate_limited", {
          user_id: user.id,
          inLastMinute,
        });
        return new Response(
          JSON.stringify({
            error: "rate_limited",
            message:
              "Você enviou muitas mensagens em pouco tempo. Tente novamente em alguns minutos.",
            retryAfter: 60,
          }),
          {
            status: 429,
            headers: { ...corsHeaders, "Content-Type": "application/json", "Retry-After": "60" },
          },
        );
      }

      const dup = recent.find(
        (r) =>
          r.created_at >= oneMinAgo &&
          r.type === body.type &&
          r.title === title &&
          r.description === description,
      );
      if (dup) {
        console.warn("[send-feedback-email] duplicate_submission_blocked", { user_id: user.id });
        return new Response(
          JSON.stringify({
            error: "duplicate",
            message: "Este feedback acabou de ser enviado. Aguarde um instante antes de reenviar.",
          }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json", "Retry-After": "60" } },
        );
      }
    }

    // Build attachment + signed URL when present
    let attachment: { filename: string; content: string } | null = null;
    let signedUrl: string | null = null;
    if (body.screenshotPath && body.type === "bug") {
      // Ensure user owns this path: must start with their uid/
      if (!body.screenshotPath.startsWith(`${user.id}/`)) {
        return new Response(JSON.stringify({ error: "invalid screenshot path" }), { status: 400, headers: corsHeaders });
      }
      const { data: signed } = await admin.storage
        .from("feedback-screenshots")
        .createSignedUrl(body.screenshotPath, 60 * 60 * 24 * 7); // 7 days
      signedUrl = signed?.signedUrl ?? null;

      const { data: file } = await admin.storage.from("feedback-screenshots").download(body.screenshotPath);
      if (file) {
        const buf = new Uint8Array(await file.arrayBuffer());
        // base64 encode
        let bin = "";
        for (let i = 0; i < buf.length; i++) bin += String.fromCharCode(buf[i]);
        attachment = {
          filename: body.screenshotPath.split("/").pop() || "screenshot.png",
          content: btoa(bin),
        };
      }
    }

    const d = body.deviceInfo || {};
    const subject = `${body.type === "bug" ? "[BUG]" : "[SUGESTÃO]"} ${title}`;

    const lines = [
      `Tipo: ${body.type === "bug" ? "Bug" : "Sugestão"}`,
      `Título: ${title}`,
      ``,
      `Descrição:`,
      description,
      ``,
      `E-mail de contato: ${body.contactEmail || "—"}`,
      `Usuário logado: ${user.id}`,
      `E-mail da conta: ${user.email || "—"}`,
      `Data/hora: ${d.submittedAt || new Date().toISOString()}`,
      ``,
      `Versão do app: ${d.appVersion || "—"}`,
      `Sistema/plataforma: ${d.platform || "—"}`,
      `Idioma: ${d.language || "—"}`,
      `Tamanho da tela: ${d.screen || "—"}`,
      `Viewport: ${d.viewport || "—"}`,
      `Modo PWA: ${d.pwa ? "sim" : "não"}`,
      `Fuso horário: ${d.timezone || "—"}`,
      `User Agent: ${d.userAgent || "—"}`,
      ``,
      `Anexo: ${signedUrl ? signedUrl : attachment ? "(em anexo)" : "—"}`,
    ];
    const text = lines.join("\n");
    const html = `<pre style="font-family:ui-monospace,Menlo,Consolas,monospace;font-size:13px;line-height:1.5;white-space:pre-wrap;background:#f8fafc;padding:16px;border-radius:8px;color:#0f172a">${escapeHtml(
      text,
    )}</pre>`;

    // Send via Resend
    const emailRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: [SUPPORT_EMAIL],
        reply_to: body.contactEmail || user.email || undefined,
        subject,
        text,
        html,
        attachments: attachment ? [attachment] : undefined,
      }),
    });

    if (!emailRes.ok) {
      const errText = await emailRes.text();
      console.error("[send-feedback-email] resend error", emailRes.status, errText);
      return new Response(JSON.stringify({ error: "email_failed" }), { status: 502, headers: corsHeaders });
    }

    // Backup to DB (best-effort)
    await admin.from("feedback_reports").insert({
      user_id: user.id,
      type: body.type,
      title,
      description,
      contact_email: body.contactEmail || null,
      account_email: user.email || null,
      app_version: d.appVersion || null,
      device_info: JSON.stringify(d).slice(0, 4000),
      screenshot_url: signedUrl,
    });

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("[send-feedback-email]", e);
    return new Response(JSON.stringify({ error: "internal" }), { status: 500, headers: corsHeaders });
  }
});
