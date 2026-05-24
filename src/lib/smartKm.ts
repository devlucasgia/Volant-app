import { Car, Entry, EarningEntry, ExpenseEntry, GoalType } from "@/types";
import { startOfMonth, endOfMonth } from "date-fns";

export interface SmartKmCostBreakdown {
  /** Monthly amount in BRL. */
  value: number;
  label: string;
}

export interface SmartKmCostsResult {
  total: number;
  items: SmartKmCostBreakdown[];
}

/**
 * Converts the vehicle's recurring + wear-and-tear costs into a monthly total,
 * prorating oil/tires against the user-supplied planned km for the month.
 *
 * Empty fields are skipped. Used only for the KM Inteligente planning module —
 * never written back as actual expenses.
 */
export function computeMonthlyVehicleCosts(car: Car | null, kmPlanned: number | null): SmartKmCostsResult {
  const items: SmartKmCostBreakdown[] = [];
  if (!car) return { total: 0, items };

  const status = car.ownership_status;

  if (status === "financiado" && (car.financing_monthly ?? 0) > 0) {
    items.push({ label: "Financiamento", value: Number(car.financing_monthly) });
  } else if (status === "alugado" && (car.rental_weekly ?? 0) > 0) {
    // 4.33 = average weeks per month (52 / 12).
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

  if (kmPlanned && kmPlanned > 0) {
    const oilCost = car.oil_change_cost ?? 0;
    const oilInterval = car.oil_change_interval_km ?? 0;
    if (oilCost > 0 && oilInterval > 0) {
      items.push({ label: "Óleo estimado", value: (kmPlanned / oilInterval) * oilCost });
    }
    const tiresCost = car.tires_cost ?? 0;
    const tiresInterval = car.tires_interval_km ?? 0;
    if (tiresCost > 0 && tiresInterval > 0) {
      items.push({ label: "Pneus estimados", value: (kmPlanned / tiresInterval) * tiresCost });
    }
  }

  const total = items.reduce((s, i) => s + i.value, 0);
  return { total, items };
}

export interface CurrentMonthRealData {
  grossThisMonth: number;
  expensesThisMonth: number;
  netThisMonth: number;
  kmThisMonth: number;
}

export function getCurrentMonthRealData(entries: Entry[], reference: Date = new Date()): CurrentMonthRealData {
  const from = +startOfMonth(reference);
  const to = +endOfMonth(reference);
  let gross = 0;
  let expenses = 0;
  let km = 0;
  for (const e of entries) {
    const t = +new Date(e.date);
    if (t < from || t > to) continue;
    if (e.type === "earning") {
      const en = e as EarningEntry;
      gross += en.gross || 0;
      km += en.km || 0;
    } else {
      const ex = e as ExpenseEntry;
      expenses += ex.expense.amount || 0;
    }
  }
  return { grossThisMonth: gross, expensesThisMonth: expenses, netThisMonth: gross - expenses, kmThisMonth: km };
}

export type SmartKmState =
  | { kind: "needs-goal" }
  | { kind: "needs-km-planned" }
  | { kind: "goal-reached"; base: number }
  | { kind: "km-planned-reached"; base: number }
  | { kind: "ok"; base: number; smart: number };

export interface SmartKmInput {
  monthlyGoal: number;
  goalType: GoalType;
  kmPlanned: number | null;
  vehicleMonthlyCost: number;
  real: CurrentMonthRealData;
}

/**
 * Computes the base and adaptive R$/km targets.
 *
 * - Base = total objective / planned km, fixed at the start of the month.
 * - Smart = remaining objective / remaining km, recalculated as the month progresses.
 */
export function computeSmartKm(input: SmartKmInput): SmartKmState {
  const { monthlyGoal, goalType, kmPlanned, vehicleMonthlyCost, real } = input;

  if (!monthlyGoal || monthlyGoal <= 0) return { kind: "needs-goal" };
  if (!kmPlanned || kmPlanned <= 0) return { kind: "needs-km-planned" };

  const objective = goalType === "liquido" ? monthlyGoal + vehicleMonthlyCost : monthlyGoal;
  const progress = goalType === "liquido" ? real.netThisMonth : real.grossThisMonth;

  const base = objective / kmPlanned;
  const remaining = objective - progress;
  const kmRemaining = kmPlanned - real.kmThisMonth;

  if (remaining <= 0) return { kind: "goal-reached", base };
  if (kmRemaining <= 0) return { kind: "km-planned-reached", base };

  return { kind: "ok", base, smart: remaining / kmRemaining };
}
