// admin-metrics
// Returns aggregated platform metrics for the /admin/metrics page.
// Authorization: caller must be an authenticated user with role='admin'
// in public.user_roles. Verified server-side via the user's JWT.

import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") || Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!;

  const authHeader = req.headers.get("Authorization") || "";
  const userJwt = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  if (!userJwt) {
    return new Response(JSON.stringify({ error: "unauthorized" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Verify caller is admin
  const userClient = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${userJwt}` } },
  });
  const { data: userRes, error: userErr } = await userClient.auth.getUser();
  if (userErr || !userRes?.user) {
    return new Response(JSON.stringify({ error: "unauthorized" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
  const { data: roleRow } = await admin
    .from("user_roles")
    .select("id")
    .eq("user_id", userRes.user.id)
    .eq("role", "admin")
    .maybeSingle();
  if (!roleRow) {
    return new Response(JSON.stringify({ error: "forbidden" }), {
      status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Compute metrics
  const now = new Date();
  const d7 = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const d14 = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000).toISOString();
  const d30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const [profilesTotal, signups7, signups30, active7, active14, active30, subsActive] = await Promise.all([
    admin.from("profiles").select("id", { count: "exact", head: true }),
    admin.from("profiles").select("id", { count: "exact", head: true }).gte("created_at", d7),
    admin.from("profiles").select("id", { count: "exact", head: true }).gte("created_at", d30),
    admin.from("entries").select("user_id", { count: "exact", head: true }).gte("entry_date", d7),
    admin.from("entries").select("user_id", { count: "exact", head: true }).gte("entry_date", d14),
    admin.from("entries").select("user_id", { count: "exact", head: true }).gte("entry_date", d30),
    admin.from("subscriptions").select("id", { count: "exact", head: true })
      .in("status", ["active", "trialing", "past_due"]).eq("environment", "live"),
  ]);

  // distinct active users (count above counts entries, not users) — fall back to extra queries
  const { data: actUsers7 } = await admin.from("entries").select("user_id").gte("entry_date", d7).limit(10000);
  const { data: actUsers14 } = await admin.from("entries").select("user_id").gte("entry_date", d14).limit(10000);
  const { data: actUsers30 } = await admin.from("entries").select("user_id").gte("entry_date", d30).limit(10000);
  const uniq = (rows: any[] | null) => new Set((rows || []).map((r) => r.user_id)).size;

  return new Response(JSON.stringify({
    ok: true,
    users: {
      total: profilesTotal.count || 0,
      newLast7: signups7.count || 0,
      newLast30: signups30.count || 0,
      active7: uniq(actUsers7),
      active14: uniq(actUsers14),
      active30: uniq(actUsers30),
    },
    subscriptions: {
      activeLive: subsActive.count || 0,
    },
    generatedAt: now.toISOString(),
  }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
