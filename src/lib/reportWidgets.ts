import { useEffect, useState } from "react";

export interface ReportWidgets {
  weekly: boolean;
  monthly: boolean;
  expenses: boolean;
  mileage: boolean;
  hours: boolean;
  appPerformance: boolean;
}

const STORAGE_KEY = "volant.reportWidgets";

const DEFAULTS: ReportWidgets = {
  weekly: true,
  monthly: true,
  expenses: true,
  mileage: true,
  hours: true,
  appPerformance: true,
};

function read(): ReportWidgets {
  if (typeof window === "undefined") return DEFAULTS;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULTS;
    return { ...DEFAULTS, ...(JSON.parse(raw) as Partial<ReportWidgets>) };
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
