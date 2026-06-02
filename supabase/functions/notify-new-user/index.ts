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
      if ((insertErr as { code?: string }).code === "23505") {
        return new Response(JSON.stringify({ ok: true, duplicate: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      console.warn("[notify-new-user] insert failed", insertErr);
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

    const { error: invokeErr } = await admin.functions.invoke("send-transactional-email", {
      body: {
        templateName: "new-user-signup",
        idempotencyKey: `new-user-signup-${u.id}`,
        templateData: {
          name,
          email: u.email || "—",
          method: methodLabel,
          createdAt,
          userId: u.id,
        },
      },
    });

    if (invokeErr) {
      console.error("[notify-new-user] invoke failed", invokeErr);
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
