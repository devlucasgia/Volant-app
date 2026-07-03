import { format, startOfDay } from "date-fns";
import type { Entry, EarningEntry, ExpenseEntry } from "@/types";

/**
 * Contrato do calendário enriquecido:
 * - Dias com registro (ganho/gasto) sempre aparecem, com valor.
 * - Semântica de plano ("folga" / "miss") só dispara nos meses que
 *   pertencem ao plano ativo (via `plannedSet`). Usuário sem plano →
 *   plannedSet vazio → o calendário mostra apenas fatos registrados,
 *   sem folgas nem faltas.
 */

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
  const refKey = format(monthRef, "yyyy-MM");
  for (const e of entries) {
    const d = new Date(e.date);
    const iso = format(d, "yyyy-MM-dd");
    if (!iso.startsWith(refKey)) continue;
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
  | "work-gross"
  | "miss"
  | "off"
  | "future"
  | "none";

export interface ClassifyOpts {
  today: Date;
  /** Lente de exibição do calendário: líquido (verde/vermelho) ou bruto (azul). */
  valueMode?: "net" | "gross";
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
  const valueMode = opts.valueMode ?? "net";

  if (stat && stat.hasAnyEntry) {
    if (valueMode === "gross") return "work-gross";
    return stat.net >= 0 ? "work-profit" : "work-loss";
  }

  const planActive = !!(opts.showPlanSemantics && opts.plannedSet && opts.plannedSet.size > 0);
  const belongsToPlanMonth =
    planActive && Array.from(opts.plannedSet!).some((d) => d.startsWith(monthKey));

  if (belongsToPlanMonth) {
    const isPlanned = opts.plannedSet!.has(iso);
    if (isPlanned) {
      // dia planejado sem registro: passado = miss, futuro = neutro
      return isPast ? "miss" : "future";
    }
    // dia NÃO planejado dentro do mês do plano → folga (passado ou futuro)
    return "off";
  }

  return isPast ? "none" : "future";
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
