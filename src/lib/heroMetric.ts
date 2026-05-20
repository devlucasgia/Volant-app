import { useCallback, useEffect, useState } from "react";

/** Which metric is highlighted in the Home hero card. */
export type HeroMetric = "net" | "gross";

const STORAGE_KEY = "volant.heroMetric.v1";

function read(): HeroMetric {
  if (typeof window === "undefined") return "net";
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw === "gross" ? "gross" : "net";
  } catch {
    return "net";
  }
}

export function useHeroMetric() {
  const [metric, setMetricState] = useState<HeroMetric>(read);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, metric);
    } catch {
      /* ignore */
    }
  }, [metric]);

  // Sync across tabs and across Settings ↔ Dashboard within the same tab.
  useEffect(() => {
    const handler = () => setMetricState(read());
    window.addEventListener("storage", handler);
    window.addEventListener("volant:heroMetricChanged", handler);
    return () => {
      window.removeEventListener("storage", handler);
      window.removeEventListener("volant:heroMetricChanged", handler);
    };
  }, []);

  const setMetric = useCallback((next: HeroMetric) => {
    setMetricState(next);
    try {
      window.dispatchEvent(new Event("volant:heroMetricChanged"));
    } catch {
      /* ignore */
    }
  }, []);

  return [metric, setMetric] as const;
}
