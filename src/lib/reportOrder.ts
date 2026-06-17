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
  | "insights"
  | "perHour"
  | "grossExpenses" // Bruto + Gastos lado a lado (bloco combinado)
  | "daysGroup"   // Dias ativos + Média / dia
  | "kmGroup"     // KM total + Média / km
  | "tripsGroup"  // Corridas + R$ / corrida
  | "chart";

export const DEFAULT_REPORT_ORDER: ReportCardKey[] = [
  "net",
  "insights",
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
const INSIGHTS_MIGRATION_KEY = "volant.reportOrder.insightsMigrated.v1";

function read(): ReportCardKey[] {
  if (typeof window === "undefined") return DEFAULT_REPORT_ORDER;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const known = new Set<ReportCardKey>(DEFAULT_REPORT_ORDER);
    const seen = new Set<ReportCardKey>();
    const filtered: ReportCardKey[] = [];

    if (raw) {
      const parsed = JSON.parse(raw) as string[];
      for (const k of parsed) {
        const mapped = (LEGACY_KEY_MAP[k] !== undefined ? LEGACY_KEY_MAP[k] : (k as ReportCardKey));
        if (mapped && known.has(mapped) && !seen.has(mapped)) {
          seen.add(mapped);
          filtered.push(mapped);
        }
      }
    }

    // Idempotent one-time migration: place "insights" right after the hero
    // (index 1) for existing users on first load. Runs once; afterwards
    // the user's chosen position is respected.
    const insightsMigrated = window.localStorage.getItem(INSIGHTS_MIGRATION_KEY) === "1";
    if (!seen.has("insights") && !insightsMigrated) {
      const insertAt = Math.min(1, filtered.length);
      filtered.splice(insertAt, 0, "insights");
      seen.add("insights");
      try { window.localStorage.setItem(INSIGHTS_MIGRATION_KEY, "1"); } catch { /* ignore */ }
    }

    // Append any default key still missing (preserves forward compatibility).
    for (const k of DEFAULT_REPORT_ORDER) if (!seen.has(k)) filtered.push(k);

    // For brand new users (no raw stored), also mark the migration as done
    // so the flag is consistent across sessions.
    if (!raw) {
      try { window.localStorage.setItem(INSIGHTS_MIGRATION_KEY, "1"); } catch { /* ignore */ }
    }

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
