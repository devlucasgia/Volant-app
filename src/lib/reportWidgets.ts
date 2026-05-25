import { useEffect, useState } from "react";

/**
 * Report cards visibility — each key maps to an actual block in the
 * Reports screen. Toggling a key hides/shows that block in real time.
 *
 * Grouped keys (daysGroup, kmGroup, tripsGroup) hide/show their two
 * historic indicators together (total + average).
 */
export interface ReportWidgets {
  net: boolean;          // Lucro líquido (hero)
  perHour: boolean;      // Média por hora (hero)
  gross: boolean;        // Bruto
  expenses: boolean;     // Gastos
  daysGroup: boolean;    // Dias ativos + Média / dia
  kmGroup: boolean;      // KM total + Média / km
  tripsGroup: boolean;   // Corridas + R$ / corrida
  chart: boolean;        // Painel principal de gráfico
}

const STORAGE_KEY = "volant.reportWidgets.v3";
const LEGACY_KEYS = ["volant.reportWidgets", "volant.reportWidgets.v2"];

const DEFAULTS: ReportWidgets = {
  net: true,
  perHour: true,
  gross: true,
  expenses: true,
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
    for (const k of LEGACY_KEYS) {
      if (window.localStorage.getItem(k)) window.localStorage.removeItem(k);
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
