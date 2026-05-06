import { Entry, EarningEntry, ExpenseEntry, AppName, ExpenseCategory } from "@/types";
import { startOfDay, startOfWeek, startOfMonth, isAfter } from "date-fns";

export type Period = "day" | "week" | "month" | "all";

export function filterByPeriod(entries: Entry[], period: Period): Entry[] {
  if (period === "all") return entries;
  const now = new Date();
  const start =
    period === "day" ? startOfDay(now) : period === "week" ? startOfWeek(now, { weekStartsOn: 1 }) : startOfMonth(now);
  return entries.filter((e) => isAfter(new Date(e.date), start) || +new Date(e.date) === +start);
}

export function summarize(entries: Entry[]) {
  const earnings = entries.filter((e): e is EarningEntry => e.type === "earning");
  const expenses = entries.filter((e): e is ExpenseEntry => e.type === "expense");
  const gross = earnings.reduce((s, e) => s + e.gross, 0);
  const totalExpenses = expenses.reduce((s, e) => s + e.expense.amount, 0);
  const net = gross - totalExpenses;
  const totalKm = earnings.reduce((s, e) => s + e.km, 0);
  const totalHours = earnings.reduce((s, e) => s + e.hours, 0);
  const perHour = totalHours > 0 ? gross / totalHours : 0;
  const perKm = totalKm > 0 ? gross / totalKm : 0;
  return { gross, totalExpenses, net, totalKm, totalHours, perHour, perKm, count: earnings.length };
}

export function byApp(entries: Entry[]): Record<AppName, number> {
  const out: Record<AppName, number> = { uber: 0, "99": 0, indriver: 0, particular: 0 };
  entries.forEach((e) => {
    if (e.type === "earning") out[e.app] += e.gross;
  });
  return out;
}

export function totalKmAllTime(entries: Entry[]): number {
  return entries.filter((e): e is EarningEntry => e.type === "earning").reduce((s, e) => s + e.km, 0);
}

export function byExpenseCategory(entries: Entry[]): Record<ExpenseCategory, number> {
  const out: Record<ExpenseCategory, number> = { combustivel: 0, alimentacao: 0, manutencao: 0, outros: 0 };
  entries.forEach((e) => {
    if (e.type === "expense") out[e.expense.category] += e.expense.amount;
  });
  return out;
}
