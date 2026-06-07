// admin-users
// Single backend for admin panel actions:
// - list_grandfathered
// - grant_lifetime { email }
// - revoke_lifetime { user_id }
// - list_subscribers
// Authorization: caller must have role='admin' in public.user_roles.

import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") || Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!;

  const authHeader = req.headers.get("Authorization") || "";
  const userJwt = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  if (!userJwt) return json({ error: "unauthorized" }, 401);

  const userClient = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${userJwt}` } },
  });
  const { data: userRes, error: userErr } = await userClient.auth.getUser();
  if (userErr || !userRes?.user) return json({ error: "unauthorized" }, 401);

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
  const { data: roleRow } = await admin
    .from("user_roles")
    .select("id")
    .eq("user_id", userRes.user.id)
    .eq("role", "admin")
    .maybeSingle();
  if (!roleRow) return json({ error: "forbidden" }, 403);

  let body: any = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }
  const action = String(body.action || "");

  try {
    if (action === "list_grandfathered") {
      const { data: profs, error } = await admin
        .from("profiles")
        .select("id, display_name, updated_at, created_at")
        .eq("beta_grandfathered", true)
        .order("updated_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      const ids = (profs || []).map((p: any) => p.id);
      const emails = await fetchEmails(admin, ids);
      return json({
        ok: true,
        users: (profs || []).map((p: any) => ({
          id: p.id,
          email: emails.get(p.id) || null,
          display_name: p.display_name,
          granted_at: p.updated_at,
        })),
      });
    }

    if (action === "grant_lifetime") {
      const email = String(body.email || "").trim().toLowerCase();
      if (!email) return json({ error: "missing_email" }, 400);
      const userId = await findUserIdByEmail(admin, email);
      if (!userId) return json({ error: "user_not_found" }, 404);
      const { error } = await admin
        .from("profiles")
        .update({ beta_grandfathered: true, updated_at: new Date().toISOString() })
        .eq("id", userId);
      if (error) throw error;
      return json({ ok: true, user_id: userId });
    }

    if (action === "revoke_lifetime") {
      const userId = String(body.user_id || "");
      if (!userId) return json({ error: "missing_user_id" }, 400);
      const { error } = await admin
        .from("profiles")
        .update({ beta_grandfathered: false, updated_at: new Date().toISOString() })
        .eq("id", userId);
      if (error) throw error;
      return json({ ok: true });
    }

    if (action === "list_subscribers") {
      const { data: subs, error } = await admin
        .from("subscriptions")
        .select("user_id, status, price_id, current_period_end, cancel_at_period_end, environment, created_at")
        .order("created_at", { ascending: false })
        .limit(1000);
      if (error) throw error;
      const ids = Array.from(new Set((subs || []).map((s: any) => s.user_id)));
      const [emails, profs] = await Promise.all([
        fetchEmails(admin, ids),
        admin.from("profiles").select("id, display_name").in("id", ids.length ? ids : ["00000000-0000-0000-0000-000000000000"]),
      ]);
      const nameById = new Map<string, string>();
      for (const p of (profs.data || [])) nameById.set((p as any).id, (p as any).display_name);
      return json({
        ok: true,
        subscribers: (subs || []).map((s: any) => ({
          user_id: s.user_id,
          email: emails.get(s.user_id) || null,
          display_name: nameById.get(s.user_id) || null,
          status: s.status,
          price_id: s.price_id,
          current_period_end: s.current_period_end,
          cancel_at_period_end: s.cancel_at_period_end,
          environment: s.environment,
          created_at: s.created_at,
        })),
      });
    }

    return json({ error: "unknown_action" }, 400);
  } catch (e: any) {
    console.error("admin-users error:", e?.message || e);
    return json({ error: e?.message || "internal_error" }, 500);
  }
});

// Helpers

async function findUserIdByEmail(admin: any, email: string): Promise<string | null> {
  // listUsers pages through auth.users; scan up to a few pages.
  for (let page = 1; page <= 20; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error || !data?.users?.length) return null;
    const hit = data.users.find((u: any) => (u.email || "").toLowerCase() === email);
    if (hit) return hit.id;
    if (data.users.length < 200) return null;
  }
  return null;
}

async function fetchEmails(admin: any, ids: string[]): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  if (!ids.length) return map;
  const set = new Set(ids);
  // Walk auth.users pages until all ids resolved or pages exhausted.
  for (let page = 1; page <= 50; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error || !data?.users?.length) break;
    for (const u of data.users) {
      if (set.has(u.id) && u.email) map.set(u.id, u.email);
    }
    if (data.users.length < 200) break;
    if (map.size >= set.size) break;
  }
  return map;
}
