import { Car, Entry, EarningEntry, ExpenseEntry, GoalType } from "@/types";
import { startOfMonth, endOfMonth, getDaysInMonth } from "date-fns";

export interface SmartKmCostBreakdown {
  /** Monthly amount in BRL. */
  value: number;
  label: string;
}

export interface SmartKmCostsResult {
  total: number;
  items: SmartKmCostBreakdown[];
  /** Total mensal dividido pelos dias do mês de referência. */
  dailyFixed: number;
}

/**
 * Converts the vehicle's recurring + wear-and-tear costs into a monthly total,
 * prorating oil/tires against the user-supplied planned km for the month.
 *
 * Used as the FULL monthly cost reference. The Smart calculation later
 * proportionalizes this total against the remaining working days of the month
 * — see computeSmartKm.
 */
export function computeMonthlyVehicleCosts(
  car: Car | null,
  kmPlanned: number | null,
  reference: Date = new Date(),
): SmartKmCostsResult {
  const items: SmartKmCostBreakdown[] = [];
  if (!car) return { total: 0, items, dailyFixed: 0 };

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
  const daysInMonth = getDaysInMonth(reference);
  const dailyFixed = daysInMonth > 0 ? total / daysInMonth : 0;
  return { total, items, dailyFixed };
}

export interface CurrentMonthRealData {
  grossThisMonth: number;
  expensesThisMonth: number;
  netThisMonth: number;
  kmThisMonth: number;
  /** Distinct calendar dates with at least one earning entry in the month. */
  daysWorkedThisMonth: number;
}

export function getCurrentMonthRealData(entries: Entry[], reference: Date = new Date()): CurrentMonthRealData {
  const from = +startOfMonth(reference);
  const to = +endOfMonth(reference);
  let gross = 0;
  let expenses = 0;
  let km = 0;
  const workedDates = new Set<string>();
  for (const e of entries) {
    const d = new Date(e.date);
    const t = +d;
    if (t < from || t > to) continue;
    if (e.type === "earning") {
      const en = e as EarningEntry;
      gross += en.gross || 0;
      km += en.km || 0;
      workedDates.add(`${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`);
    } else {
      const ex = e as ExpenseEntry;
      expenses += ex.expense.amount || 0;
    }
  }
  return {
    grossThisMonth: gross,
    expensesThisMonth: expenses,
    netThisMonth: gross - expenses,
    kmThisMonth: km,
    daysWorkedThisMonth: workedDates.size,
  };
}

export type SmartKmState =
  | { kind: "needs-goal" }
  | { kind: "needs-km-planned" }
  | { kind: "needs-remaining-days" }
  | { kind: "goal-reached"; base: number; kmRemainingEstimated: number }
  | { kind: "km-planned-reached"; base: number; kmRemainingEstimated: number }
  | {
      kind: "ok";
      base: number;
      smart: number;
      kmRemainingEstimated: number;
      kmUsed: number;
      kmUsedSource: "manual" | "estimated";
    };

export interface SmartKmInput {
  monthlyGoal: number;
  goalType: GoalType;
  kmPlanned: number | null;
  vehicleMonthlyCost: number;
  real: CurrentMonthRealData;
  /** Dias que o motorista ainda pretende trabalhar até o fim do mês (adaptativo). */
  remainingWorkingDays?: number | null;
  /** Manual override for KM restante. When > 0, overrides the estimated value. */
  kmRemainingOverride?: number | null;
  /** Reference date for the current month — defaults to today. */
  reference?: Date;
}

/**
 * Computes the base and adaptive R$/km targets.
 *
 * - Base = initial planning reference, fixed for the whole month. Uses the full
 *   vehicle monthly cost and the full planned km.
 * - Smart = adaptive. Uses what is missing from the goal, the real progress so
 *   far, the remaining km (manual override if provided, otherwise
 *   kmPlanned - kmThisMonth), and ONLY the vehicle cost proportional to the
 *   user-declared remaining working days of the month — so a R$1.200 monthly
 *   cost is NOT crammed into the final 7 days as if it were spent in that window.
 */
export function computeSmartKm(input: SmartKmInput): SmartKmState {
  const {
    monthlyGoal,
    goalType,
    kmPlanned,
    vehicleMonthlyCost,
    real,
    remainingWorkingDays,
    kmRemainingOverride,
    reference = new Date(),
  } = input;

  if (!monthlyGoal || monthlyGoal <= 0) return { kind: "needs-goal" };
  if (!kmPlanned || kmPlanned <= 0) return { kind: "needs-km-planned" };

  // ---------- Base (fixed) ----------
  const baseObjective = goalType === "liquido" ? monthlyGoal + vehicleMonthlyCost : monthlyGoal;
  const base = baseObjective / kmPlanned;

  // ---------- KM remaining ----------
  const kmRemainingEstimated = Math.max(0, kmPlanned - real.kmThisMonth);
  const hasManual = kmRemainingOverride != null && kmRemainingOverride > 0;
  const kmUsed = hasManual ? (kmRemainingOverride as number) : kmRemainingEstimated;
  const kmUsedSource: "manual" | "estimated" = hasManual ? "manual" : "estimated";

  const progress = goalType === "liquido" ? real.netThisMonth : real.grossThisMonth;
  const goalRemaining = monthlyGoal - progress;

  if (goalRemaining <= 0) return { kind: "goal-reached", base, kmRemainingEstimated };

  // Days the driver still plans to work — required for adaptive R$/km. Falls back
  // to calendar days remaining in the month when not configured by the user.
  const daysInMonth = getDaysInMonth(reference);
  const today = reference.getDate();
  const calendarRemaining = Math.max(0, daysInMonth - today + 1);
  const daysRemaining =
    remainingWorkingDays != null && remainingWorkingDays > 0
      ? Math.floor(remainingWorkingDays)
      : calendarRemaining;

  if (daysRemaining <= 0) return { kind: "needs-remaining-days" };
  if (kmUsed <= 0) return { kind: "km-planned-reached", base, kmRemainingEstimated };

  let remainingTotal = goalRemaining;
  if (goalType === "liquido" && vehicleMonthlyCost > 0 && daysInMonth > 0) {
    const dailyVehicleCost = vehicleMonthlyCost / daysInMonth;
    remainingTotal += dailyVehicleCost * daysRemaining;
  }

  const smart = remainingTotal / kmUsed;
  if (!isFinite(smart) || smart < 0) {
    return { kind: "km-planned-reached", base, kmRemainingEstimated };
  }

  return { kind: "ok", base, smart, kmRemainingEstimated, kmUsed, kmUsedSource };
}

