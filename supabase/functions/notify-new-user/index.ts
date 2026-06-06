import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Require either the service-role key (when called from another edge
    // function) or the shared vault secret (when called from the DB trigger
    // via pg_net). We fetch the shared secret lazily via a SECURITY DEFINER
    // RPC so we never need to plumb it into edge function env vars.
    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
    let authorized = !!token && token === SERVICE_ROLE;
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
    if (!authorized && token) {
      const { data: shared } = await admin.rpc("get_notify_shared_secret");
      if (typeof shared === "string" && shared.length > 0 && token === shared) {
        authorized = true;
      }
    }
    if (!authorized) {
      return new Response(JSON.stringify({ error: "forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const userId = String(body?.user_id || "").trim();
    if (!userId || !/^[0-9a-f-]{36}$/i.test(userId)) {
      return new Response(JSON.stringify({ error: "invalid user_id" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    // admin client already created above for auth validation


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

    // Dedup check (read-only). NÃO marcamos como notificado aqui — só após o
    // envio bem-sucedido. Isso evita que uma falha intermediária bloqueie
    // novas tentativas para o mesmo usuário.
    const { data: existing } = await admin
      .from("signup_notifications")
      .select("user_id")
      .eq("user_id", userId)
      .maybeSingle();
    if (existing) {
      return new Response(JSON.stringify({ ok: true, duplicate: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

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
      (appMeta.provider as string) ||
      (Array.isArray(appMeta.providers) ? (appMeta.providers as string[])[0] : "") ||
      "email";
    const methodLabel = provider === "google" ? "Google" : provider === "email" ? "Email/Senha" : provider;
    const name =
      (meta.display_name as string) ||
      (meta.full_name as string) ||
      (meta.name as string) ||
      "—";
    const createdAt = u.created_at || new Date().toISOString();

    // Invoke send-transactional-email directly using service-role auth.
    // Using fetch with explicit Authorization header avoids the
    // UNAUTHORIZED_INVALID_JWT_FORMAT issue seen with functions.invoke()
    // under the new Supabase signing-keys system.
    const sendRes = await fetch(`${SUPABASE_URL}/functions/v1/send-transactional-email`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${SERVICE_ROLE}`,
        apikey: SERVICE_ROLE,
      },
      body: JSON.stringify({
        templateName: "new-user-signup",
        idempotencyKey: `new-user-signup-${u.id}`,
        templateData: {
          name,
          email: u.email || "—",
          method: methodLabel,
          createdAt,
          userId: u.id,
        },
      }),
    });

    if (!sendRes.ok) {
      const errText = await sendRes.text().catch(() => "");
      console.error("[notify-new-user] send_failed", { status: sendRes.status, errText });
      return new Response(
        JSON.stringify({ error: "email_failed", stage: "send", status: sendRes.status }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Marca como notificado apenas após sucesso confirmado do envio.
    // Conflito (23505) significa que outra execução já marcou — sem problema.
    const { error: markErr } = await admin
      .from("signup_notifications")
      .insert({ user_id: userId });
    if (markErr && (markErr as { code?: string }).code !== "23505") {
      console.warn("[notify-new-user] mark_dedup_failed", markErr);
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
