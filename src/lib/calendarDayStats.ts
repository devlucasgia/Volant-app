import { format, isSameMonth, startOfDay } from "date-fns";
import type { Entry, EarningEntry, ExpenseEntry, GoalType } from "@/types";

export interface DayStat {
  gross: number;
  expenses: number;
  net: number;
  hasEarnings: boolean;
  hasAnyEntry: boolean;
}

export type DayStats = Map<string, DayStat>;

/** Constrói stats por dia (ISO yyyy-MM-dd) para o mês de referência. */
export function buildDailyStats(entries: Entry[], monthRef: Date): DayStats {
  const out: DayStats = new Map();
  for (const e of entries) {
    const d = new Date(e.date);
    if (!isSameMonth(d, monthRef)) continue;
    const iso = format(d, "yyyy-MM-dd");
    const cur =
      out.get(iso) ?? { gross: 0, expenses: 0, net: 0, hasEarnings: false, hasAnyEntry: false };
    if (e.type === "earning") {
      cur.gross += (e as EarningEntry).gross;
      cur.hasEarnings = true;
    } else if (e.type === "expense") {
      cur.expenses += (e as ExpenseEntry).expense.amount;
    }
    cur.net = cur.gross - cur.expenses;
    cur.hasAnyEntry = true;
    out.set(iso, cur);
  }
  return out;
}

export type DayClass =
  | "work-profit"
  | "work-loss"
  | "miss"
  | "off"
  | "future"
  | "none";

export interface ClassifyOpts {
  today: Date;
  goalType: GoalType;
  plannedSet?: Set<string>;
  showPlanSemantics?: boolean;
}

export function classifyDay(date: Date, stats: DayStats, opts: ClassifyOpts): DayClass {
  const iso = format(date, "yyyy-MM-dd");
  const monthKey = format(date, "yyyy-MM");
  const today = startOfDay(opts.today);
  const day = startOfDay(date);
  const isPast = day.getTime() < today.getTime();
  const stat = stats.get(iso);

  if (stat && stat.hasAnyEntry) {
    const shownValue = opts.goalType === "liquido" ? stat.net : stat.gross;
    return shownValue >= 0 ? "work-profit" : "work-loss";
  }
  if (!isPast) return "future";
  if (opts.showPlanSemantics && opts.plannedSet) {
    const belongsToPlanMonth = Array.from(opts.plannedSet).some((d) => d.startsWith(monthKey));
    if (!belongsToPlanMonth) return "none";
    if (opts.plannedSet.has(iso)) return "miss";
    if (opts.plannedSet.size > 0) return "off";
  }
  return "none";
}

/** Formato compacto para caber na célula: "R$ 342", "R$ 1,2k", "-R$ 89". */
export function compactBRL(v: number): string {
  const abs = Math.abs(v);
  const prefix = v < 0 ? "-R$ " : "R$ ";
  if (abs >= 10000) return `${prefix}${Math.round(abs / 1000)}k`;
  if (abs >= 1000) {
    const k = (abs / 1000).toFixed(1).replace(".", ",");
    return `${prefix}${k}k`;
  }
  return `${prefix}${Math.round(abs)}`;
}
