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

/**
 * Only these keys are eligible to occupy the hero slot (index 0).
 * The Reports screen only knows how to render "net" or "grossExpenses"
 * as the big hero card — any other card in position 0 breaks the layout.
 */
export const HERO_KEYS: ReadonlyArray<ReportCardKey> = ["net", "grossExpenses"];

export function isHeroKey(k: ReportCardKey): boolean {
  return k === "net" || k === "grossExpenses";
}

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

const STORAGE_KEY = "volant.reportOrder.v3";
const LEGACY_STORAGE_KEYS = ["volant.reportOrder", "volant.reportOrder.v2"];
const INSIGHTS_MIGRATION_KEY = "volant.reportOrder.insightsMigrated.v1";
const HERO_MIGRATION_KEY = "volant.reportOrder.heroMigrated.v3";

/**
 * Ensures the array always has a HERO_KEY at index 0. If the current
 * position 0 isn't a hero, we promote the first hero found; if none
 * is present, we insert "net" at the top. Order of remaining cards is
 * preserved.
 */
function enforceHero(list: ReportCardKey[]): ReportCardKey[] {
  if (list.length === 0) return ["net"];
  if (isHeroKey(list[0])) return list;
  const firstHeroIdx = list.findIndex(isHeroKey);
  if (firstHeroIdx === -1) return ["net", ...list];
  const next = list.slice();
  const [hero] = next.splice(firstHeroIdx, 1);
  next.unshift(hero);
  return next;
}

function readLegacy(): string[] | null {
  for (const k of LEGACY_STORAGE_KEYS) {
    try {
      const raw = window.localStorage.getItem(k);
      if (raw) return JSON.parse(raw) as string[];
    } catch {
      /* ignore */
    }
  }
  return null;
}

function read(): ReportCardKey[] {
  if (typeof window === "undefined") return DEFAULT_REPORT_ORDER;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const heroMigrated = window.localStorage.getItem(HERO_MIGRATION_KEY) === "1";
    const known = new Set<ReportCardKey>(DEFAULT_REPORT_ORDER);
    const seen = new Set<ReportCardKey>();
    let filtered: ReportCardKey[] = [];

    const source: string[] | null = raw ? (JSON.parse(raw) as string[]) : readLegacy();

    if (source) {
      for (const k of source) {
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

    // v2 → v3 hero migration: on the FIRST read after this update, force
    // "net" into position 0 for every user (fresh or migrating), preserving
    // the relative order of the remaining cards. Runs exactly once.
    if (!heroMigrated) {
      filtered = filtered.filter((k) => k !== "net");
      filtered.unshift("net");
      try { window.localStorage.setItem(HERO_MIGRATION_KEY, "1"); } catch { /* ignore */ }
      try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered)); } catch { /* ignore */ }
    }

    // Final invariant guard.
    filtered = enforceHero(filtered);

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
      // Guard: never allow a non-hero to land at index 0, and never
      // allow the current hero to leave index 0 unless swapped with
      // the other hero.
      if (target === 0 && !isHeroKey(key)) return prev;
      if (idx === 0 && !isHeroKey(prev[target])) return prev;
      const next = prev.slice();
      [next[idx], next[target]] = [next[target], next[idx]];
      return enforceHero(next);
    });
  }, []);

  const reorder = useCallback((fromKey: ReportCardKey, toKey: ReportCardKey) => {
    setOrder((prev) => {
      const from = prev.indexOf(fromKey);
      const to = prev.indexOf(toKey);
      if (from < 0 || to < 0 || from === to) return prev;
      // Guard: dropping a non-hero at index 0 is forbidden.
      if (to === 0 && !isHeroKey(fromKey)) return prev;
      // Guard: pulling the current hero out of index 0 into a slot
      // where the replacement isn't a hero is forbidden. Since we
      // splice-insert, the item currently at index 0 (if fromKey isn't
      // it) would shift only when from > 0 and to === 0 — already
      // covered above. If fromKey IS the current hero, only allow the
      // drop when toKey is the OTHER hero.
      if (from === 0 && !isHeroKey(toKey)) return prev;
      const next = prev.slice();
      const [item] = next.splice(from, 1);
      next.splice(to, 0, item);
      return enforceHero(next);
    });
  }, []);

  /** Promote a hero-eligible key to index 0 (swap with current hero). */
  const setHero = useCallback((key: ReportCardKey) => {
    if (!isHeroKey(key)) return;
    setOrder((prev) => {
      if (prev[0] === key) return prev;
      const next = prev.filter((k) => k !== key);
      next.unshift(key);
      return enforceHero(next);
    });
  }, []);

  return [order, move, reorder, setHero] as const;
}
