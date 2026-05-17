import { Entry, EarningEntry, ExpenseEntry } from "@/types";
import { startOfDay, endOfDay, startOfWeek, startOfMonth, endOfMonth, isAfter, differenceInCalendarDays, subDays } from "date-fns";

export type Period = "day" | "week" | "month" | "all" | "custom";

export interface CustomRange { from: Date; to: Date }

export function filterByPeriod(entries: Entry[], period: Period, customRange?: CustomRange): Entry[] {
  if (period === "all") return entries;
  if (period === "custom" && customRange) {
    const from = +startOfDay(customRange.from);
    const to = +endOfDay(customRange.to);
    return entries.filter((e) => {
      const t = +new Date(e.date);
      return t >= from && t <= to;
    });
  }
  const now = new Date();
  const start =
    period === "day" ? startOfDay(now) : period === "week" ? startOfWeek(now, { weekStartsOn: 1 }) : startOfMonth(now);
  return entries.filter((e) => isAfter(new Date(e.date), start) || +new Date(e.date) === +start);
}

export function summarize(entries: Entry[], isSimplePlatform?: (key: string) => boolean) {
  const earnings = entries.filter((e): e is EarningEntry => e.type === "earning");
  const expenses = entries.filter((e): e is ExpenseEntry => e.type === "expense");
  const operational = isSimplePlatform ? earnings.filter((e) => !isSimplePlatform(e.app)) : earnings;
  const gross = earnings.reduce((s, e) => s + e.gross, 0);
  const operationalGross = operational.reduce((s, e) => s + e.gross, 0);
  const totalExpenses = expenses.reduce((s, e) => s + e.expense.amount, 0);
  const net = gross - totalExpenses;
  const totalKm = operational.reduce((s, e) => s + e.km, 0);
  const totalHours = operational.reduce((s, e) => s + e.hours, 0);
  const totalRides = operational.reduce((s, e) => s + (e.rides || 0), 0);
  const perHour = totalHours > 0 ? operationalGross / totalHours : 0;
  const perKm = totalKm > 0 ? operationalGross / totalKm : 0;
  const perRide = totalRides > 0 ? operationalGross / totalRides : 0;
  return { gross, totalExpenses, net, totalKm, totalHours, totalRides, perHour, perKm, perRide, count: earnings.length };
}

export function byApp(entries: Entry[]): Record<string, number> {
  const out: Record<string, number> = {};
  entries.forEach((e) => {
    if (e.type === "earning") out[e.app] = (out[e.app] || 0) + e.gross;
  });
  return out;
}

export function totalKmAllTime(entries: Entry[]): number {
  return entries.filter((e): e is EarningEntry => e.type === "earning").reduce((s, e) => s + e.km, 0);
}

export function byExpenseCategory(entries: Entry[]): Record<string, number> {
  const out: Record<string, number> = {};
  entries.forEach((e) => {
    if (e.type === "expense") {
      const k = e.expense.category === "manutencao_preventiva" ? "manutencao" : e.expense.category;
      out[k] = (out[k] || 0) + e.expense.amount;
    }
  });
  return out;
}

/**
 * Compute suggested daily/weekly goals from a monthly goal and the user's
 * recent activity. Falls back to simple defaults when there is not enough
 * history (fewer than 3 active days in last 30 days).
 */
export function deriveGoals(monthlyGoal: number, entries: Entry[]) {
  if (!monthlyGoal || monthlyGoal <= 0) {
    return { monthly: 0, weekly: 0, daily: 0, activeDays: 0 };
  }
  // count distinct days with earning entries in the last 30 days
  const since = startOfDay(subDays(new Date(), 30));
  const days = new Set<string>();
  entries.forEach((e) => {
    if (e.type !== "earning") return;
    const d = new Date(e.date);
    if (d >= since) days.add(d.toISOString().slice(0, 10));
  });
  const activeDays = days.size;
  // Estimated working days per month: scale last-30 active days; fallback 22
  const estDaysPerMonth = activeDays >= 3 ? activeDays : 22;
  const daily = monthlyGoal / estDaysPerMonth;
  const weekly = monthlyGoal / 4.345;
  return { monthly: monthlyGoal, weekly, daily, activeDays };
}

/**
 * Goal value to display for a given period selection.
 */
export function goalForPeriod(
  period: Period,
  monthlyGoal: number,
  entries: Entry[],
  customRange?: CustomRange,
  dailyOverride?: number | null,
): { value: number; title: string } {
  const g = deriveGoals(monthlyGoal, entries);
  if (period === "day") {
    return { value: dailyOverride && dailyOverride > 0 ? dailyOverride : g.daily, title: "Meta do dia" };
  }
  if (period === "week") return { value: g.weekly, title: "Meta semanal" };
  if (period === "month") return { value: g.monthly, title: "Meta mensal" };
  if (period === "custom" && customRange) {
    const days = Math.max(1, differenceInCalendarDays(customRange.to, customRange.from) + 1);
    return { value: g.daily * days, title: "Meta do período" };
  }
  return { value: g.monthly, title: "Meta" };
}

export function monthRange(): CustomRange {
  const now = new Date();
  return { from: startOfMonth(now), to: endOfMonth(now) };
}
