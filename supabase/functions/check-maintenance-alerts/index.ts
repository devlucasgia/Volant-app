// check-maintenance-alerts
// Cron-invoked daily. For each active car with maintenance intervals set
// (oleo / pneus), compute the car's real KM (initial_km + sum(earnings.km) +
// km_adjustment) and the KM in which the last maintenance of that type
// happened (heuristic via entry date). If the user is within 500 km of —
// or already past — the next milestone (lastKm + intervalKm), send one
// email per milestone, deduped via public.maintenance_alerts_sent.

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

  // Body opcional: { user_id } restringe a varredura a um único usuário.
  // Permite disparo on-demand (UI dispara ao salvar earning / ajustar KM / registrar manutenção)
  // sem precisar esperar o cron diário.
  let targetUserId: string | null = null;
  try {
    const body = await req.json();
    if (body && typeof body.user_id === "string") targetUserId = body.user_id;
  } catch { /* sem body — varredura global */ }

  // Autorização: cron usa service role; cliente autenticado pode disparar
  // apenas para o próprio user_id (validado pelo JWT do Supabase).
  const authHeader = req.headers.get("Authorization") || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  let authorized = !!token && token === SERVICE_ROLE;
  if (!authorized && token) {
    const { data: shared } = await admin.rpc("get_notify_shared_secret");
    if (typeof shared === "string" && shared.length > 0 && token === shared) authorized = true;
  }
  if (!authorized && targetUserId) {
    // Tenta validar token de usuário autenticado e exigir que user_id bata.
    const { data: userData } = await admin.auth.getUser(token);
    if (userData?.user?.id && userData.user.id === targetUserId) authorized = true;
  }
  if (!authorized) {
    return new Response(JSON.stringify({ error: "forbidden" }), {
      status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let carsQuery = admin
    .from("cars")
    .select("id, user_id, brand, model, initial_km, km_adjustment, oil_change_interval_km, tires_interval_km, is_active")
    .eq("is_active", true);
  if (targetUserId) carsQuery = carsQuery.eq("user_id", targetUserId);
  const { data: cars, error: carsErr } = await carsQuery;
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
    const adjustment = Number((car as any).km_adjustment || 0);
    const oilInterval = Number((car as any).oil_change_interval_km || 0);
    const tiresInterval = Number((car as any).tires_interval_km || 0);
    if (oilInterval <= 0 && tiresInterval <= 0) continue;

    const { data: kmRows } = await admin
      .from("entries")
      .select("km, entry_date")
      .eq("user_id", userId)
      .eq("type", "earning");
    const earnings = (kmRows || []) as Array<{ km: number | null; entry_date: string }>;
    const totalDriven = earnings.reduce((s, r) => s + Number(r.km || 0), 0);
    const currentKm = initialKm + totalDriven + adjustment;

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

      let lastKm = initialKm;
      if (lastMaint && lastMaint.length > 0) {
        const lastDate = new Date((lastMaint[0] as any).entry_date as string).getTime();
        const kmAfter = earnings.reduce((s, r) => {
          if (new Date(r.entry_date).getTime() <= lastDate) return s;
          return s + Number(r.km || 0);
        }, 0);
        lastKm = currentKm - kmAfter;
      }

      const milestone = lastKm + intervalKm;
      const kmRemaining = milestone - currentKm;
      if (kmRemaining > WARN_THRESHOLD_KM) continue;
      const isOverdue = kmRemaining < 0;
      const alertStatus = isOverdue ? "overdue" : "approaching";

      const { data: existing } = await admin
        .from("maintenance_alerts_sent")
        .select("id")
        .eq("user_id", userId).eq("car_id", carId)
        .eq("alert_type", mtype).eq("milestone_km", milestone)
        .eq("alert_status", alertStatus)
        .maybeSingle();
      if (existing) continue;

      const { data: u } = await admin.auth.admin.getUserById(userId);
      const email = u?.user?.email;
      if (!email) continue;
      const meta = (u?.user?.user_metadata || {}) as Record<string, unknown>;
      const fullName = (meta.display_name as string) || (meta.full_name as string) || "";
      const firstName = fullName.split(" ")[0] || "";
      const carLabel = [(car as any).brand, (car as any).model].filter(Boolean).join(" ").trim() || "seu carro";
      const kmSinceLast = Math.max(0, currentKm - lastKm);

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
          idempotencyKey: `maint-${carId}-${mtype}-${milestone}-${alertStatus}`,
          templateData: {
            name: firstName,
            carLabel: carLabel.startsWith("seu") ? carLabel : `seu ${carLabel}`,
            alertType: mtype,
            status: alertStatus,
            intervalKm: intervalKm.toLocaleString("pt-BR"),
            kmSinceLast: Math.round(kmSinceLast).toLocaleString("pt-BR"),
            kmRemaining: Math.max(0, Math.round(kmRemaining)).toLocaleString("pt-BR"),
            kmOverdue: Math.max(0, Math.round(-kmRemaining)).toLocaleString("pt-BR"),
            appUrl: "https://usevolant.app/app/ajustes/veiculos/manutencao",
          },
        }),
      });
      if (sendRes.ok) {
        await admin.from("maintenance_alerts_sent").insert({
          user_id: userId, car_id: carId, alert_type: mtype, milestone_km: milestone, alert_status: alertStatus,
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
