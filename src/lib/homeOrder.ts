import { useEffect, useState, useCallback } from "react";

/** Keys of reorderable Home cards. Net hero and maintenance alert are fixed and not part of this list. */
export type HomeCardKey = "greeting" | "goal" | "stats" | "byApp" | "byExpense" | "journey";

export const DEFAULT_HOME_ORDER: HomeCardKey[] = [
  "greeting",
  "goal",
  "stats",
  "byApp",
  "byExpense",
  "journey",
];

const STORAGE_KEY = "volant.homeOrder.v1";

function read(): HomeCardKey[] {
  if (typeof window === "undefined") return DEFAULT_HOME_ORDER;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_HOME_ORDER;
    const parsed = JSON.parse(raw) as HomeCardKey[];
    // Reconcile: keep stored order but append any new defaults missing.
    const known = new Set<HomeCardKey>(DEFAULT_HOME_ORDER);
    const filtered = parsed.filter((k) => known.has(k));
    for (const k of DEFAULT_HOME_ORDER) if (!filtered.includes(k)) filtered.push(k);
    return filtered;
  } catch {
    return DEFAULT_HOME_ORDER;
  }
}

export function useHomeOrder() {
  const [order, setOrder] = useState<HomeCardKey[]>(read);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(order));
    } catch {
      /* ignore */
    }
  }, [order]);

  const move = useCallback((key: HomeCardKey, dir: -1 | 1) => {
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

  return [order, move] as const;
}
