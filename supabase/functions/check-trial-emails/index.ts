// check-trial-emails
// Cron-invoked hourly. Sends 3 trial lifecycle emails:
//   D+0 'welcome'      ~1h after signup (trial_started_at between 1h..2h ago)
//   D-2 'ending_soon'  48h before trial_ends_at (between 47h..49h from now)
//   D-0 'ended'        when trial_ends_at is 0..1h in the past AND user has no paid sub
//
// Dedup via public.trial_email_log (unique on user_id+stage).
// Skips users who already have an active paid/grandfathered subscription.

import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const APP_URL = "https://usevolant.app/app";
const COUPON = "primeiros25";

type Stage = "welcome" | "ending_soon" | "ended";

function firstNameOf(meta: Record<string, unknown>): string {
  const name = (meta.display_name as string) || (meta.full_name as string) || (meta.name as string) || "";
  return name.split(" ")[0] || "";
}

function formatBRL(value: number): string {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

  // Authorization: cron uses service-role; allow shared notify secret too.
  const authHeader = req.headers.get("Authorization") || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  let authorized = !!token && token === SERVICE_ROLE;
  if (!authorized && token) {
    const { data: shared } = await admin.rpc("get_notify_shared_secret");
    if (typeof shared === "string" && shared.length > 0 && token === shared) authorized = true;
  }
  if (!authorized) {
    return new Response(JSON.stringify({ error: "forbidden" }), {
      status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const now = Date.now();
  const oneHourAgo = new Date(now - 60 * 60 * 1000).toISOString();
  const twoHoursAgo = new Date(now - 2 * 60 * 60 * 1000).toISOString();
  const in47h = new Date(now + 47 * 60 * 60 * 1000).toISOString();
  const in49h = new Date(now + 49 * 60 * 60 * 1000).toISOString();
  const oneHourFromPast = new Date(now - 60 * 60 * 1000).toISOString();
  const nowIso = new Date(now).toISOString();

  type Profile = {
    id: string;
    trial_started_at: string | null;
    trial_ends_at: string | null;
    trial_access_granted: boolean | null;
    beta_grandfathered: boolean | null;
  };

  // Janela de cada estágio.
  const [welcomeRes, endingSoonRes, endedRes] = await Promise.all([
    admin.from("profiles")
      .select("id, trial_started_at, trial_ends_at, trial_access_granted, beta_grandfathered")
      .eq("trial_access_granted", true)
      .gte("trial_started_at", twoHoursAgo)
      .lte("trial_started_at", oneHourAgo) as unknown as Promise<{ data: Profile[] | null }>,
    admin.from("profiles")
      .select("id, trial_started_at, trial_ends_at, trial_access_granted, beta_grandfathered")
      .eq("trial_access_granted", true)
      .gte("trial_ends_at", in47h)
      .lte("trial_ends_at", in49h) as unknown as Promise<{ data: Profile[] | null }>,
    admin.from("profiles")
      .select("id, trial_started_at, trial_ends_at, trial_access_granted, beta_grandfathered")
      .eq("trial_access_granted", true)
      .gte("trial_ends_at", oneHourFromPast)
      .lte("trial_ends_at", nowIso) as unknown as Promise<{ data: Profile[] | null }>,
  ]);

  const buckets: Array<{ stage: Stage; profiles: Profile[] }> = [
    { stage: "welcome", profiles: welcomeRes.data || [] },
    { stage: "ending_soon", profiles: endingSoonRes.data || [] },
    { stage: "ended", profiles: endedRes.data || [] },
  ];

  let enqueued = 0;
  let skipped = 0;

  for (const { stage, profiles } of buckets) {
    for (const profile of profiles) {
      if (profile.beta_grandfathered) { skipped++; continue; }

      // Skip if already paid sub active (live env).
      const { data: sub } = await admin
        .from("subscriptions")
        .select("status, current_period_end")
        .eq("user_id", profile.id)
        .eq("environment", "live")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (sub) {
        const end = sub.current_period_end ? new Date(sub.current_period_end as string).getTime() : null;
        const subActive =
          (["active", "trialing", "past_due"].includes(sub.status as string) && (!end || end > now)) ||
          (sub.status === "canceled" && end !== null && end > now);
        if (subActive) { skipped++; continue; }
      }

      // Already sent?
      const { data: existing } = await admin
        .from("trial_email_log")
        .select("id")
        .eq("user_id", profile.id)
        .eq("stage", stage)
        .maybeSingle();
      if (existing) { skipped++; continue; }

      // Fetch user email + name.
      const { data: userRes } = await admin.auth.admin.getUserById(profile.id);
      const email = userRes?.user?.email;
      if (!email) { skipped++; continue; }
      const firstName = firstNameOf((userRes?.user?.user_metadata || {}) as Record<string, unknown>);

      // Build templateData per stage.
      let templateName: string;
      let templateData: Record<string, unknown>;
      const checkoutUrl = APP_URL;

      if (stage === "welcome") {
        templateName = "trial-welcome";
        templateData = { name: firstName, appUrl: APP_URL };
      } else {
        // Compute net total + entries count during trial period.
        const startIso = profile.trial_started_at || twoHoursAgo;
        const { data: entries } = await admin
          .from("entries")
          .select("type, gross, expense_amount, entry_date")
          .eq("user_id", profile.id)
          .gte("entry_date", startIso);
        const rows = (entries || []) as Array<{ type: string; gross: number | null; expense_amount: number | null }>;
        const gross = rows.filter(r => r.type === "earning").reduce((s, r) => s + Number(r.gross || 0), 0);
        const expenses = rows.filter(r => r.type === "expense").reduce((s, r) => s + Number(r.expense_amount || 0), 0);
        const net = gross - expenses;
        templateName = stage === "ending_soon" ? "trial-ending-soon" : "trial-ended";
        templateData = {
          name: firstName,
          netTotal: formatBRL(Math.max(0, net)),
          entriesCount: rows.length,
          checkoutUrl,
          couponCode: COUPON,
        };
      }

      const sendRes = await fetch(`${SUPABASE_URL}/functions/v1/send-transactional-email`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${SERVICE_ROLE}`,
          apikey: SERVICE_ROLE,
        },
        body: JSON.stringify({
          templateName,
          recipientEmail: email,
          idempotencyKey: `trial-${stage}-${profile.id}`,
          templateData,
        }),
      });

      if (sendRes.ok) {
        await admin.from("trial_email_log").insert({ user_id: profile.id, stage });
        enqueued++;
      } else {
        console.warn("[trial-emails] send failed", { stage, userId: profile.id, status: sendRes.status });
      }
    }
  }

  console.log("[trial-emails] done", { enqueued, skipped });
  return new Response(JSON.stringify({ ok: true, enqueued, skipped }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
