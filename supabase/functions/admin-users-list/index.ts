// admin-users-list
// Returns paginated user list with engagement flags for the admin dashboard.
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

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
  const { data: role } = await admin
    .from("user_roles").select("id").eq("user_id", userRes.user.id).eq("role", "admin").maybeSingle();
  if (!role) return json({ error: "forbidden" }, 403);

  try {
    // 1. all profiles (limit 2000)
    const { data: profiles } = await admin
      .from("profiles")
      .select("id, display_name, created_at, beta_grandfathered, trial_started_at, trial_ends_at, costs_onboarded, planning_onboarded")
      .order("created_at", { ascending: false })
      .limit(2000);

    const ids = (profiles || []).map((p: any) => p.id);
    if (ids.length === 0) return json({ ok: true, users: [] });

    // 2. live subscriptions
    const { data: subs } = await admin
      .from("subscriptions")
      .select("user_id, status, price_id, current_period_end")
      .in("user_id", ids)
      .eq("environment", "live");
    const subByUser = new Map<string, any>();
    for (const s of subs || []) {
      const prev = subByUser.get(s.user_id);
      if (!prev || (s.current_period_end && (!prev.current_period_end || s.current_period_end > prev.current_period_end))) {
        subByUser.set(s.user_id, s);
      }
    }

    // 3. cars with cost data
    const { data: cars } = await admin
      .from("cars")
      .select("user_id, fuel_consumption_kml, oil_change_cost, financing_monthly, rental_monthly")
      .in("user_id", ids);
    const carsByUser = new Set<string>();
    for (const c of cars || []) {
      if ((c.fuel_consumption_kml ?? 0) > 0 || (c.oil_change_cost ?? 0) > 0 || (c.financing_monthly ?? 0) > 0 || (c.rental_monthly ?? 0) > 0) {
        carsByUser.add(c.user_id);
      }
    }

    // 4. entries (latest per user + has-any)
    const { data: entries } = await admin
      .from("entries")
      .select("user_id, entry_date")
      .in("user_id", ids)
      .order("entry_date", { ascending: false })
      .limit(50000);
    const lastByUser = new Map<string, string>();
    const hasEntries = new Set<string>();
    for (const e of entries || []) {
      hasEntries.add(e.user_id);
      if (!lastByUser.has(e.user_id)) lastByUser.set(e.user_id, e.entry_date);
    }

    // 5. emails
    const emails = new Map<string, string>();
    const idSet = new Set(ids);
    for (let page = 1; page <= 30; page++) {
      const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
      if (error || !data?.users?.length) break;
      for (const u of data.users) if (idSet.has(u.id) && u.email) emails.set(u.id, u.email);
      if (data.users.length < 200) break;
      if (emails.size >= idSet.size) break;
    }

    const now = Date.now();
    const users = (profiles || []).map((p: any) => {
      const sub = subByUser.get(p.id);
      const isPremiumLive = sub && ["active", "trialing", "past_due"].includes(sub.status) &&
        (!sub.current_period_end || new Date(sub.current_period_end).getTime() > now);
      let status: "premium" | "lifetime" | "trial" | "free" = "free";
      if (p.beta_grandfathered) status = "lifetime";
      else if (isPremiumLive) status = "premium";
      else if (p.trial_ends_at && new Date(p.trial_ends_at).getTime() > now) status = "trial";
      return {
        id: p.id,
        email: emails.get(p.id) || null,
        display_name: p.display_name,
        created_at: p.created_at,
        status,
        plan: sub?.price_id?.includes("yearly") ? "Anual" : sub?.price_id?.includes("monthly") ? "Mensal" : null,
        last_activity: lastByUser.get(p.id) || null,
        engagement: {
          vehicle: carsByUser.has(p.id),
          planning: !!p.planning_onboarded,
          financial: hasEntries.has(p.id),
        },
      };
    });

    return json({ ok: true, users });
  } catch (e: any) {
    console.error("admin-users-list error", e);
    return json({ error: e?.message || "internal_error" }, 500);
  }
});
