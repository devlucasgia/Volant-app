// check-maintenance-alerts
// Cron-invoked daily. For each active car with maintenance intervals set,
// compute total km rodados (initial_km + sum(entries.km where earning))
// and compare to the last `oleo` / `pneus` entry (treating each maintenance
// entry as resetting the counter at that point in time). If the user is
// within 500 km (or already past) the next interval, send one email per
// milestone (deduped via public.maintenance_alerts_sent).

import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const WARN_THRESHOLD_KM = 500;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

  // Same auth scheme as weekly summary
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

  // 1. All active cars with at least one interval configured
  const { data: cars, error: carsErr } = await admin
    .from("cars")
    .select("id, user_id, brand, model, initial_km, oil_change_interval_km, tires_interval_km, is_active")
    .eq("is_active", true);
  if (carsErr) {
    console.error("[maint] cars query failed", carsErr);
    return new Response(JSON.stringify({ error: "cars_query_failed" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let alertsEnqueued = 0;
  for (const car of cars || []) {
    const userId = (car as any).user_id as string;
    const carId = (car as any).id as string;
    const initialKm = Number((car as any).initial_km || 0);
    const oilInterval = Number((car as any).oil_change_interval_km || 0);
    const tiresInterval = Number((car as any).tires_interval_km || 0);
    if (oilInterval <= 0 && tiresInterval <= 0) continue;

    // Total km driven by this user (proxy for car km — single-car assumption ok for MVP)
    const { data: kmRows } = await admin
      .from("entries")
      .select("km")
      .eq("user_id", userId)
      .eq("type", "earning");
    const totalKm = initialKm + (kmRows || []).reduce((s: number, r: any) => s + Number(r.km || 0), 0);

    // Last maintenance entries
    for (const [intervalKm, mtype] of [[oilInterval, "oleo"], [tiresInterval, "pneus"]] as Array<[number, string]>) {
      if (intervalKm <= 0) continue;

      const { data: lastMaint } = await admin
        .from("entries")
        .select("entry_date")
        .eq("user_id", userId)
        .eq("type", "expense")
        .eq("maintenance_type", mtype)
        .order("entry_date", { ascending: false })
        .limit(1);

      let kmSinceLast = totalKm; // se nunca registrou, considera tudo
      if (lastMaint && lastMaint.length > 0) {
        const lastDate = (lastMaint[0] as any).entry_date as string;
        const { data: kmAfter } = await admin
          .from("entries")
          .select("km")
          .eq("user_id", userId)
          .eq("type", "earning")
          .gte("entry_date", lastDate);
        kmSinceLast = (kmAfter || []).reduce((s: number, r: any) => s + Number(r.km || 0), 0);
      }

      if (kmSinceLast < intervalKm - WARN_THRESHOLD_KM) continue;

      const milestone = Math.floor(kmSinceLast / intervalKm) * intervalKm + intervalKm;

      // Dedup
      const { data: existing } = await admin
        .from("maintenance_alerts_sent")
        .select("id")
        .eq("user_id", userId).eq("car_id", carId)
        .eq("alert_type", mtype).eq("milestone_km", milestone)
        .maybeSingle();
      if (existing) continue;

      // Resolve user email
      const { data: u } = await admin.auth.admin.getUserById(userId);
      const email = u?.user?.email;
      if (!email) continue;
      const meta = (u?.user?.user_metadata || {}) as Record<string, unknown>;
      const fullName = (meta.display_name as string) || (meta.full_name as string) || "";
      const firstName = fullName.split(" ")[0] || "";
      const carLabel = [(car as any).brand, (car as any).model].filter(Boolean).join(" ").trim() || "seu carro";

      const sendRes = await fetch(`${SUPABASE_URL}/functions/v1/send-transactional-email`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${SERVICE_ROLE}`,
          apikey: SERVICE_ROLE,
        },
        body: JSON.stringify({
          templateName: "maintenance-alert",
          recipientEmail: email,
          idempotencyKey: `maint-${carId}-${mtype}-${milestone}`,
          templateData: {
            name: firstName,
            carLabel: carLabel.startsWith("seu") ? carLabel : `seu ${carLabel}`,
            alertType: mtype,
            intervalKm: intervalKm.toLocaleString("pt-BR"),
            kmSinceLast: Math.round(kmSinceLast).toLocaleString("pt-BR"),
            appUrl: "https://usevolant.app/app/ajustes/veiculos/manutencao",
          },
        }),
      });
      if (sendRes.ok) {
        await admin.from("maintenance_alerts_sent").insert({
          user_id: userId, car_id: carId, alert_type: mtype, milestone_km: milestone,
        });
        alertsEnqueued++;
      } else {
        console.warn("[maint] send failed", { userId, mtype, status: sendRes.status });
      }
    }
  }

  console.log("[maint] done", { cars: cars?.length || 0, alertsEnqueued });
  return new Response(JSON.stringify({ ok: true, cars: cars?.length || 0, alertsEnqueued }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
