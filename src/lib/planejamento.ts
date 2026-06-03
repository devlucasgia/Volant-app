import { Car, GoalType } from "@/types";

/**
 * Custos mensais FIXOS do veículo. Sem prorrateio por km (óleo/pneus ficam
 * fora nesta sprint para evitar loop circular: custo ↔ km necessário ↔ custo).
 */
export function computeFixedMonthlyCosts(car: Car | null): {
  total: number;
  items: { label: string; value: number }[];
} {
  const items: { label: string; value: number }[] = [];
  if (!car) return { total: 0, items };

  const status = car.ownership_status;
  if (status === "financiado" && (car.financing_monthly ?? 0) > 0) {
    items.push({ label: "Financiamento", value: Number(car.financing_monthly) });
  } else if (status === "alugado" && (car.rental_weekly ?? 0) > 0) {
    items.push({ label: "Aluguel", value: Number(car.rental_weekly) * 4.33 });
  }
  if ((car.ipva_yearly ?? 0) > 0) {
    items.push({ label: "IPVA estimado", value: Number(car.ipva_yearly) / 12 });
  }
  if ((car.insurance_monthly ?? 0) > 0) {
    items.push({ label: "Seguro", value: Number(car.insurance_monthly) });
  }
  if ((car.other_monthly_costs ?? 0) > 0) {
    items.push({ label: "Outros custos", value: Number(car.other_monthly_costs) });
  }
  const total = items.reduce((s, i) => s + i.value, 0);
  return { total, items };
}

export interface PlanResult {
  diasSelecionados: number;
  custosFixos: number;
  faturamentoNecessario: number;
  plannedKmTotal: number;
  requiredRpk: number | null;
  metaDiaria: number | null;
  lucroEstimado: number | null;
}

/**
 * Novo modelo: o usuário informa KM médio por dia trabalhado.
 * O app calcula KM planejado e o R$/KM mínimo necessário.
 */
export function computePlan(params: {
  monthlyGoal: number;
  goalType: GoalType;
  diasSelecionados: number;
  custosFixos: number;
  avgKmPerDay: number | null;
}): PlanResult {
  const { monthlyGoal, goalType, diasSelecionados, custosFixos, avgKmPerDay } = params;
  const faturamentoNecessario =
    goalType === "liquido" ? monthlyGoal + custosFixos : monthlyGoal;
  const km = avgKmPerDay && avgKmPerDay > 0 ? avgKmPerDay : 0;
  const plannedKmTotal = diasSelecionados > 0 && km > 0 ? diasSelecionados * km : 0;
  const requiredRpk =
    plannedKmTotal > 0 && faturamentoNecessario > 0
      ? faturamentoNecessario / plannedKmTotal
      : null;
  const metaDiaria = diasSelecionados > 0 ? monthlyGoal / diasSelecionados : null;
  const lucroEstimado = goalType === "bruto" ? monthlyGoal - custosFixos : null;
  return {
    diasSelecionados,
    custosFixos,
    faturamentoNecessario,
    plannedKmTotal,
    requiredRpk,
    metaDiaria,
    lucroEstimado,
  };
}

/** Sugestão inicial — média realista para motoristas urbanos. */
export const DEFAULT_AVG_KM_PER_DAY = 200;
/** Legado — mantido por compat de imports antigos. */
export const DEFAULT_RPK_BASE = 2.0;

/** yyyy-MM-dd em fuso local (não UTC). */
export function toIsoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export function datesOfMonth(reference: Date = new Date()): Date[] {
  const year = reference.getFullYear();
  const month = reference.getMonth();
  const last = new Date(year, month + 1, 0).getDate();
  const out: Date[] = [];
  for (let i = 1; i <= last; i++) out.push(new Date(year, month, i));
  return out;
}

export type ShortcutKey = "all" | "weekdays" | "weekdaysWithSat" | "clear";

/** Pré-marca datas do hoje até o fim do mês conforme regra. "clear" → lista vazia. */
export function applyShortcut(
  shortcut: ShortcutKey,
  reference: Date = new Date(),
): string[] {
  if (shortcut === "clear") return [];
  const today = startOfDay(reference);
  return datesOfMonth(reference)
    .filter((d) => startOfDay(d) >= today)
    .filter((d) => {
      const dow = d.getDay();
      if (shortcut === "all") return true;
      if (shortcut === "weekdays") return dow >= 1 && dow <= 5;
      if (shortcut === "weekdaysWithSat") return dow >= 1 && dow <= 6;
      return false;
    })
    .map(toIsoDate);
}
