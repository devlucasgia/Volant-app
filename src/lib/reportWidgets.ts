import { useEffect, useState } from "react";

/**
 * Report cards visibility — each key maps to an actual block in the
 * Reports screen. Toggling a key hides/shows that block in real time.
 *
 * Grouped keys (daysGroup, kmGroup, tripsGroup) hide/show their two
 * historic indicators together (total + average).
 *
 * `grossExpenses` is a combined block that renders Bruto + Gastos side
 * by side, preserving the historic layout of the Reports screen.
 */
export interface ReportWidgets {
  net: boolean;             // Lucro líquido (hero)
  perHour: boolean;         // Média por hora (hero)
  grossExpenses: boolean;   // Bruto + Gastos (lado a lado)
  daysGroup: boolean;       // Dias ativos + Média / dia
  kmGroup: boolean;         // KM total + Média / km
  tripsGroup: boolean;      // Corridas + R$ / corrida
  chart: boolean;           // Painel principal de gráfico
}

const STORAGE_KEY = "volant.reportWidgets.v4";
const LEGACY_KEYS = ["volant.reportWidgets", "volant.reportWidgets.v2", "volant.reportWidgets.v3"];

const DEFAULTS: ReportWidgets = {
  net: true,
  perHour: true,
  grossExpenses: true,
  daysGroup: true,
  kmGroup: true,
  tripsGroup: true,
  chart: true,
};

function read(): ReportWidgets {
  if (typeof window === "undefined") return DEFAULTS;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) return { ...DEFAULTS, ...(JSON.parse(raw) as Partial<ReportWidgets>) };
    // Migrate from legacy schema (`gross` / `expenses` as separate flags).
    for (const k of LEGACY_KEYS) {
      const legacy = window.localStorage.getItem(k);
      if (legacy) {
        try {
          const parsed = JSON.parse(legacy) as Record<string, boolean>;
          const merged: ReportWidgets = {
            ...DEFAULTS,
            net: parsed.net ?? DEFAULTS.net,
            perHour: parsed.perHour ?? DEFAULTS.perHour,
            grossExpenses: (parsed.gross ?? true) || (parsed.expenses ?? true),
            daysGroup: parsed.daysGroup ?? DEFAULTS.daysGroup,
            kmGroup: parsed.kmGroup ?? DEFAULTS.kmGroup,
            tripsGroup: parsed.tripsGroup ?? DEFAULTS.tripsGroup,
            chart: parsed.chart ?? DEFAULTS.chart,
          };
          window.localStorage.removeItem(k);
          return merged;
        } catch {
          window.localStorage.removeItem(k);
        }
      }
    }
    return DEFAULTS;
  } catch {
    return DEFAULTS;
  }
}

export function useReportWidgets() {
  const [widgets, setWidgets] = useState<ReportWidgets>(read);
  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(widgets));
    } catch {
      /* ignore */
    }
  }, [widgets]);
  const toggle = (k: keyof ReportWidgets) =>
    setWidgets((w) => ({ ...w, [k]: !w[k] }));
  return [widgets, toggle] as const;
}
