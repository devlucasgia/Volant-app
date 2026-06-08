// admin-metrics
// Aggregated metrics for /admin/metrics dashboard.
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

// Plan prices in BRL (fallback if not stored elsewhere).
const PLAN_PRICE_MONTHLY = 29.9;
const PLAN_PRICE_YEARLY_AS_MONTHLY = 299 / 12;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") || Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!;

  const authHeader = req.headers.get("Authorization") || "";
  const jwt = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  if (!jwt) return json({ error: "unauthorized" }, 401);

  const userClient = createClient(SUPABASE_URL, ANON_KEY, { global: { headers: { Authorization: `Bearer ${jwt}` } } });
  const { data: userRes } = await userClient.auth.getUser();
  if (!userRes?.user) return json({ error: "unauthorized" }, 401);

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
  const { data: roleRow } = await admin
    .from("user_roles").select("id").eq("user_id", userRes.user.id).eq("role", "admin").maybeSingle();
  if (!roleRow) return json({ error: "forbidden" }, 403);

  let body: any = {};
  try { body = await req.json(); } catch {}
  const range = String(body?.range || "30d");
  const days = range === "7d" ? 7 : range === "90d" ? 90 : range === "1y" ? 365 : range === "all" ? 3650 : 30;

  const now = new Date();
  const dStart = new Date(now.getTime() - days * 24 * 3600 * 1000);
  const dPrevStart = new Date(now.getTime() - 2 * days * 24 * 3600 * 1000);

  // Totals
  const [totalProfiles, signupsCurrent, signupsPrev, allProfiles] = await Promise.all([
    admin.from("profiles").select("id", { count: "exact", head: true }),
    admin.from("profiles").select("id, created_at").gte("created_at", dStart.toISOString()),
    admin.from("profiles").select("id", { count: "exact", head: true }).gte("created_at", dPrevStart.toISOString()).lt("created_at", dStart.toISOString()),
    admin.from("profiles").select("id, beta_grandfathered, trial_ends_at"),
  ]);

  // Active users (current + prev)
  const d7 = new Date(now.getTime() - 7 * 86400000).toISOString();
  const d30 = new Date(now.getTime() - 30 * 86400000).toISOString();
  const dRangeIso = dStart.toISOString();
  const dPrevIso = dPrevStart.toISOString();

  const [actCur, act7, act30, actPrev] = await Promise.all([
    admin.from("entries").select("user_id").gte("entry_date", dRangeIso).limit(20000),
    admin.from("entries").select("user_id").gte("entry_date", d7).limit(20000),
    admin.from("entries").select("user_id").gte("entry_date", d30).limit(20000),
    admin.from("entries").select("user_id").gte("entry_date", dPrevIso).lt("entry_date", dRangeIso).limit(20000),
  ]);
  const uniq = (rows: any[] | null) => new Set((rows || []).map((r) => r.user_id)).size;

  // Subscriptions (live)
  const { data: subsLive } = await admin
    .from("subscriptions")
    .select("user_id, status, price_id, current_period_end, created_at")
    .eq("environment", "live");
  const activeSubs = (subsLive || []).filter(
    (s) => ["active", "trialing", "past_due"].includes(s.status) &&
      (!s.current_period_end || new Date(s.current_period_end).getTime() > now.getTime()),
  );
  const mrrCurrent = activeSubs.reduce((acc, s) => {
    if ((s.price_id || "").includes("yearly")) return acc + PLAN_PRICE_YEARLY_AS_MONTHLY;
    return acc + PLAN_PRICE_MONTHLY;
  }, 0);
  // prev MRR ~ subs created before previous window
  const prevActive = (subsLive || []).filter((s) =>
    new Date(s.created_at).getTime() < dStart.getTime() &&
    ["active", "trialing", "past_due", "canceled"].includes(s.status),
  );
  const mrrPrev = prevActive.reduce((acc, s) => {
    if ((s.price_id || "").includes("yearly")) return acc + PLAN_PRICE_YEARLY_AS_MONTHLY;
    return acc + PLAN_PRICE_MONTHLY;
  }, 0);

  // Signups time series
  const buckets = new Map<string, number>();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 86400000);
    const k = d.toISOString().slice(0, 10);
    buckets.set(k, 0);
  }
  for (const p of signupsCurrent.data || []) {
    const k = String(p.created_at).slice(0, 10);
    if (buckets.has(k)) buckets.set(k, (buckets.get(k) || 0) + 1);
  }
  const signupsSeries = [...buckets.entries()].map(([date, count]) => ({ date, count }));

  // Conversion breakdown
  const nowMs = now.getTime();
  const activeSubsIds = new Set(activeSubs.map((s) => s.user_id));
  let premium = 0, trial = 0, free = 0;
  for (const p of allProfiles.data || []) {
    if (activeSubsIds.has(p.id) || p.beta_grandfathered) premium++;
    else if (p.trial_ends_at && new Date(p.trial_ends_at).getTime() > nowMs) trial++;
    else free++;
  }

  return json({
    ok: true,
    range,
    generatedAt: now.toISOString(),
    users: {
      total: totalProfiles.count || 0,
      newCurrent: (signupsCurrent.data || []).length,
      newPrev: signupsPrev.count || 0,
      activeCurrent: uniq(actCur.data),
      activePrev: uniq(actPrev.data),
      active7: uniq(act7.data),
      active30: uniq(act30.data),
    },
    subscriptions: {
      activeLive: activeSubs.length,
    },
    mrr: { current: mrrCurrent, prev: mrrPrev },
    conversion: { free, trial, premium },
    signupsSeries,
  });
});
