// Ativa planos do "slot futuro" (next_plan_*) quando o mês de destino chega.
// - Disparo agendado: cron diário às 03:00 UTC (meia-noite Brasília) com Bearer service-role.
// - Disparo on-demand: a guarda do frontend invoca com JWT do próprio usuário,
//   passando { user_id } no body. Idempotente: depois de ativar, next_plan_dates = NULL.
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

interface NextCostFields {
  ownership_status: string | null;
  financing_monthly: number | null;
  rental_monthly: number | null;
  rental_weekly: number | null;
  ipva_yearly: number | null;
  insurance_monthly: number | null;
  other_monthly_costs: number | null;
}

interface SettingsRow {
  user_id: string;
  next_plan_goal: number | null;
  next_plan_goal_type: string | null;
  next_plan_avg_km: number | null;
  next_plan_dates: string[] | null;
  next_plan_created_at: string | null;
  next_plan_fixed_applied: number | null;
  next_plan_fixed_items: Array<{ label: string; value: number }> | null;
  next_plan_cost_fields: NextCostFields | null;
}

function firstDayOfMonthIso(iso: string): string {
  const [y, m] = iso.split("-");
  return `${y}-${m}-01`;
}

function pickEarliestDate(dates: string[]): string | null {
  if (!dates.length) return null;
  return [...dates].sort()[0];
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const auth = req.headers.get("Authorization") ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  let scopedUserId: string | null = null;

  try {
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

    // Auth aceita 3 formas (em ordem de tentativa):
    //  1. Service-role direto via env (cron interno / outra edge function).
    //  2. Vault shared secret (cron pg_net usa esse).
    //  3. JWT de usuário logado (disparo on-demand do frontend).
    let authorized = !!token && token === SERVICE_ROLE;
    if (!authorized && token) {
      const { data: shared } = await admin.rpc("get_notify_shared_secret");
      if (typeof shared === "string" && shared.length > 0 && token === shared) {
        authorized = true;
      }
    }
    if (!authorized) {
      if (!token) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const userClient = createClient(SUPABASE_URL, ANON_KEY, {
        global: { headers: { Authorization: auth } },
      });
      const { data: claims, error: claimsErr } = await userClient.auth.getClaims(token);
      if (claimsErr || !claims?.claims?.sub) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      scopedUserId = claims.claims.sub as string;
    }

    // body opcional { user_id } — só respeitado quando o caller é service-role.
    let bodyUserId: string | null = null;
    try {
      const body = await req.json();
      if (body && typeof body.user_id === "string") bodyUserId = body.user_id;
    } catch {
      /* sem body, ok */
    }

    const targetUserId = scopedUserId ?? bodyUserId; // user → seu próprio id; service-role → opcional

    // admin client já criado acima durante a validação de auth.

    let query = admin
      .from("user_settings")
      .select(
        "user_id, next_plan_goal, next_plan_goal_type, next_plan_avg_km, next_plan_dates, next_plan_created_at, next_plan_fixed_applied, next_plan_fixed_items, next_plan_cost_fields",
      )
      .not("next_plan_dates", "is", null);

    if (targetUserId) query = query.eq("user_id", targetUserId);

    const { data: rows, error } = await query;
    if (error) {
      console.error("[activate-next-plans] select failed", error);
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const now = new Date();
    const nowIso = now.toISOString();
    const todayIso = nowIso.slice(0, 10);
    let activated = 0;

    for (const r of (rows ?? []) as SettingsRow[]) {
      const dates = Array.isArray(r.next_plan_dates) ? r.next_plan_dates : null;
      if (!dates || dates.length === 0) continue;
      const earliest = pickEarliestDate(dates);
      if (!earliest) continue;
      if (todayIso < firstDayOfMonthIso(earliest)) continue; // ainda não é o mês alvo

      const goal = Number(r.next_plan_goal ?? 0);
      const goalType = r.next_plan_goal_type ?? "liquido";
      const avgKm = Number(r.next_plan_avg_km ?? 0);
      const daysCount = dates.length;
      const kmPlanned = avgKm > 0 ? Math.round(avgKm * daysCount) : null;

      const update: Record<string, unknown> = {
          monthly_goal: goal,
          goal_type: goalType,
          planning_avg_km_per_day: avgKm,
          planning_selected_dates: dates,
          planning_status: "configured",
          working_days_per_month: daysCount,
          km_planned_month: kmPlanned,
          // Snapshot De/Para
          planning_original_goal: goal,
          planning_original_goal_type: goalType,
          planning_original_avg_km: avgKm,
          planning_original_dates: dates,
          planning_original_created_at: nowIso,
          // Sinal do banner "entrou em vigor"
          next_plan_activated_at: nowIso,
          // Limpa slot futuro (idempotência)
          next_plan_goal: null,
          next_plan_goal_type: null,
          next_plan_avg_km: null,
          next_plan_dates: null,
          next_plan_created_at: null,
          next_plan_fixed_applied: null,
          next_plan_fixed_items: null,
          next_plan_cost_fields: null,
      };

      // Snapshot do custo do plano futuro (sprint Custos): copia para o slot
      // original e sobrescreve o carro ativo. Compat: planos antigos (snapshot
      // nulo) ativam como antes, sem sobrescrita — engine cai no fallback ao vivo.
      if (r.next_plan_fixed_applied != null) {
        update.planning_original_fixed_applied = r.next_plan_fixed_applied;
        update.planning_original_fixed_items = r.next_plan_fixed_items;
        if (r.next_plan_cost_fields) {
          const { error: carErr } = await admin
            .from("cars")
            .update(r.next_plan_cost_fields)
            .eq("user_id", r.user_id)
            .eq("is_active", true);
          if (carErr) console.error("[activate-next-plans] car overwrite failed", r.user_id, carErr);
        }
      }

      const { error: updErr } = await admin
        .from("user_settings")
        .update(update)
        .eq("user_id", r.user_id);

      if (updErr) {
        console.error("[activate-next-plans] update failed", r.user_id, updErr);
        continue;
      }
      activated += 1;
    }

    return new Response(JSON.stringify({ activated }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("[activate-next-plans] unexpected", e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
