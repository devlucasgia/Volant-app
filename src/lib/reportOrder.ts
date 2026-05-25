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
  | "gross"
  | "expenses"
  | "daysGroup"   // Dias ativos + Média / dia
  | "kmGroup"     // KM total + Média / km
  | "tripsGroup"  // Corridas + R$ / corrida
  | "chart";

export const DEFAULT_REPORT_ORDER: ReportCardKey[] = [
  "net",
  "perHour",
  "gross",
  "expenses",
  "daysGroup",
  "kmGroup",
  "tripsGroup",
  "chart",
];

const STORAGE_KEY = "volant.reportOrder.v2";

function read(): ReportCardKey[] {
  if (typeof window === "undefined") return DEFAULT_REPORT_ORDER;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_REPORT_ORDER;
    const parsed = JSON.parse(raw) as ReportCardKey[];
    const known = new Set<ReportCardKey>(DEFAULT_REPORT_ORDER);
    const filtered = parsed.filter((k) => known.has(k));
    for (const k of DEFAULT_REPORT_ORDER) if (!filtered.includes(k)) filtered.push(k);
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
