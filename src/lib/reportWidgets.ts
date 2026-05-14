import { useEffect, useState } from "react";

/**
 * Report cards visibility — each key maps to an actual block in the
 * Reports screen. Toggling a key hides/shows that block in real time.
 */
export interface ReportWidgets {
  net: boolean;          // Lucro líquido (hero)
  perHour: boolean;      // Média por hora (hero)
  gross: boolean;        // Bruto
  expenses: boolean;     // Gastos
  activeDays: boolean;   // Dias ativos
  perDay: boolean;       // Média por dia
  totalKm: boolean;      // KM total
  perKm: boolean;        // R$ / km
  trips: boolean;        // Corridas
  perTrip: boolean;      // R$ / corrida
  chart: boolean;        // Painel principal de gráfico
}

const STORAGE_KEY = "volant.reportWidgets.v2";
const LEGACY_KEY = "volant.reportWidgets";

const DEFAULTS: ReportWidgets = {
  net: true,
  perHour: true,
  gross: true,
  expenses: true,
  activeDays: true,
  perDay: true,
  totalKm: true,
  perKm: true,
  trips: true,
  perTrip: true,
  chart: true,
};

function read(): ReportWidgets {
  if (typeof window === "undefined") return DEFAULTS;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) return { ...DEFAULTS, ...(JSON.parse(raw) as Partial<ReportWidgets>) };
    // Drop legacy v1 (different schema) — start with defaults.
    if (window.localStorage.getItem(LEGACY_KEY)) {
      window.localStorage.removeItem(LEGACY_KEY);
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
