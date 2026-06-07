import { useEffect, useState, useCallback } from "react";

/** Keys of reorderable Home cards. Net hero and maintenance alert are fixed and not part of this list. */
export type HomeCardKey = "greeting" | "goal" | "smartKm" | "stats" | "byApp" | "byExpense" | "journey";

export const DEFAULT_HOME_ORDER: HomeCardKey[] = [
  "greeting",
  "goal",
  "smartKm",
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
    // Reconcile: keep stored order but insert any missing defaults at their
    // canonical position (right after the previous default that exists in the
    // saved order). Falls back to appending if no anchor is found.
    const known = new Set<HomeCardKey>(DEFAULT_HOME_ORDER);
    const filtered: HomeCardKey[] = parsed.filter((k) => known.has(k));
    for (let i = 0; i < DEFAULT_HOME_ORDER.length; i++) {
      const k = DEFAULT_HOME_ORDER[i];
      if (filtered.includes(k)) continue;
      // Walk backwards through defaults to find the nearest predecessor that
      // is already present, and insert right after it.
      let insertAt = filtered.length;
      for (let j = i - 1; j >= 0; j--) {
        const prev = DEFAULT_HOME_ORDER[j];
        const idx = filtered.indexOf(prev);
        if (idx >= 0) {
          insertAt = idx + 1;
          break;
        }
      }
      filtered.splice(insertAt, 0, k);
    }
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

  const reorder = useCallback((fromKey: HomeCardKey, toKey: HomeCardKey) => {
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
