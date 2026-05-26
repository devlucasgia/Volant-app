import { useEffect, useState, useCallback } from "react";

/**
 * Order of report cards on the Reports screen.
 * Each key maps to a visible block that can be toggled via reportWidgets.
 *
 * Grouped keys (daysGroup, kmGroup, tripsGroup) render the historic
 * "pair" layout (total + average together) as a single compact card.
 */
export type ReportCardKey =
  | "net"
  | "perHour"
  | "grossExpenses" // Bruto + Gastos lado a lado (bloco combinado)
  | "daysGroup"   // Dias ativos + Média / dia
  | "kmGroup"     // KM total + Média / km
  | "tripsGroup"  // Corridas + R$ / corrida
  | "chart";

export const DEFAULT_REPORT_ORDER: ReportCardKey[] = [
  "net",
  "perHour",
  "grossExpenses",
  "daysGroup",
  "kmGroup",
  "tripsGroup",
  "chart",
];

// Legacy keys ("gross", "expenses") are stripped during migration so the
// new combined block ("grossExpenses") is appended cleanly by read().
const LEGACY_KEY_MAP: Record<string, ReportCardKey | null> = {
  gross: "grossExpenses",
  expenses: null,
};

const STORAGE_KEY = "volant.reportOrder.v2";

function read(): ReportCardKey[] {
  if (typeof window === "undefined") return DEFAULT_REPORT_ORDER;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_REPORT_ORDER;
    const parsed = JSON.parse(raw) as string[];
    const known = new Set<ReportCardKey>(DEFAULT_REPORT_ORDER);
    const seen = new Set<ReportCardKey>();
    const filtered: ReportCardKey[] = [];
    for (const k of parsed) {
      const mapped = (LEGACY_KEY_MAP[k] !== undefined ? LEGACY_KEY_MAP[k] : (k as ReportCardKey));
      if (mapped && known.has(mapped) && !seen.has(mapped)) {
        seen.add(mapped);
        filtered.push(mapped);
      }
    }
    for (const k of DEFAULT_REPORT_ORDER) if (!seen.has(k)) filtered.push(k);
    return filtered;
  } catch {
    return DEFAULT_REPORT_ORDER;
  }
}

export function useReportOrder() {
  const [order, setOrder] = useState<ReportCardKey[]>(read);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(order));
    } catch {
      /* ignore */
    }
  }, [order]);

  const move = useCallback((key: ReportCardKey, dir: -1 | 1) => {
    setOrder((prev) => {
      const idx = prev.indexOf(key);
      if (idx < 0) return prev;
      const target = idx + dir;
      if (target < 0 || target >= prev.length) return prev;
      const next = prev.slice();
      [next[idx], next[target]] = [next[target], next[idx]];
      return next;
    });
  }, []);

  const reorder = useCallback((fromKey: ReportCardKey, toKey: ReportCardKey) => {
    setOrder((prev) => {
      const from = prev.indexOf(fromKey);
      const to = prev.indexOf(toKey);
      if (from < 0 || to < 0 || from === to) return prev;
      const next = prev.slice();
      const [item] = next.splice(from, 1);
      next.splice(to, 0, item);
      return next;
    });
  }, []);

  return [order, move, reorder] as const;
}
