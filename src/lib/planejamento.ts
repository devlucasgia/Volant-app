import { Car, GoalType } from "@/types";

/**
 * Custos mensais considerados do veículo.
 *
 * Inclui custos fixos (financiamento/aluguel, IPVA, seguro, outros) e, quando
 * `plannedKmTotal > 0`, prorrateia também óleo e pneus pelo KM planejado do
 * período — usando os mesmos campos cadastrados em Custos do veículo.
 *
 * Sem loop circular: `plannedKmTotal` é derivado de `avgKmPerDay × dias`,
 * portanto não depende de custo.
 */
export function computeFixedMonthlyCosts(
  car: Car | null,
  plannedKmTotal?: number,
): {
  total: number;
  items: { label: string; value: number }[];
  /** Mensal puro: financiamento/aluguel + IPVA + seguro + outros. */
  monthlyPureTotal: number;
  /** Uso/desgaste rateado por KM: óleo + pneus. */
  usageTotal: number;
} {
  const items: { label: string; value: number }[] = [];
  let monthlyPureTotal = 0;
  let usageTotal = 0;
  const pushMonthly = (label: string, value: number) => {
    items.push({ label, value });
    monthlyPureTotal += value;
  };
  const pushUsage = (label: string, value: number) => {
    items.push({ label, value });
    usageTotal += value;
  };

  if (!car) return { total: 0, items, monthlyPureTotal: 0, usageTotal: 0 };

  const status = car.ownership_status;
  if (status === "financiado" && (car.financing_monthly ?? 0) > 0) {
    pushMonthly("Financiamento", Number(car.financing_monthly));
  } else if (status === "alugado") {
    // Mensal tem prioridade sobre semanal para evitar duplicidade.
    if ((car.rental_monthly ?? 0) > 0) {
      pushMonthly("Aluguel", Number(car.rental_monthly));
    } else if ((car.rental_weekly ?? 0) > 0) {
      pushMonthly("Aluguel", Number(car.rental_weekly) * 4.33);
    }
  }
  if ((car.ipva_yearly ?? 0) > 0) {
    pushMonthly("IPVA estimado", Number(car.ipva_yearly) / 12);
  }
  if ((car.insurance_monthly ?? 0) > 0) {
    pushMonthly("Seguro", Number(car.insurance_monthly));
  }
  if ((car.other_monthly_costs ?? 0) > 0) {
    pushMonthly("Outros custos", Number(car.other_monthly_costs));
  }

  // Prorrateio por KM planejado (somente quando há plano definido).
  if (plannedKmTotal && plannedKmTotal > 0) {
    const oilCost = Number(car.oil_change_cost ?? 0);
    const oilInterval = Number(car.oil_change_interval_km ?? 0);
    if (oilCost > 0 && oilInterval > 0) {
      pushUsage("Óleo estimado", (plannedKmTotal / oilInterval) * oilCost);
    }
    const tiresCost = Number(car.tires_cost ?? 0);
    const tiresInterval = Number(car.tires_interval_km ?? 0);
    if (tiresCost > 0 && tiresInterval > 0) {
      pushUsage("Pneus estimados", (plannedKmTotal / tiresInterval) * tiresCost);
    }
  }

  const total = monthlyPureTotal + usageTotal;
  return { total, items, monthlyPureTotal, usageTotal };
}

/** True quando o item de custo fixo é do tipo uso (rateado por km). */
export function isUsageCostLabel(label: string): boolean {
  return /óleo|oleo|pneu/i.test(label);
}

/**
 * Custos variáveis mensais estimados a partir do plano (KM × dias).
 * Inclui combustível (consumo + tipo + preço) e alimentação média/dia.
 * Usados apenas no alvo BRUTO da home — não entram no líquido.
 */
export function computeVariableMonthlyCosts(
  car: Car | null,
  averageKmPerDay: number,
  selectedWorkdaysCount: number,
): {
  total: number;
  items: { label: string; value: number }[];
} {
  const items: { label: string; value: number }[] = [];
  if (!car || averageKmPerDay <= 0 || selectedWorkdaysCount <= 0) {
    return { total: 0, items };
  }
  const c = car as any;
  const consumo = Number(c.fuel_consumption_kml ?? 0);
  const preco = Number(c.fuel_price ?? 0);
  const food = Number(c.food_avg_per_day ?? 0);
  const kmTotal = averageKmPerDay * selectedWorkdaysCount;

  if (consumo > 0 && preco > 0) {
    const unidades = kmTotal / consumo;
    const isElectric = c.fuel_type === "eletrico";
    items.push({
      label: isElectric ? "Energia estimada" : "Combustível estimado",
      value: unidades * preco,
    });
  }
  if (food > 0) {
    items.push({ label: "Alimentação estimada", value: food * selectedWorkdaysCount });
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
  const metaDiaria = diasSelecionados > 0 ? faturamentoNecessario / diasSelecionados : null;
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
