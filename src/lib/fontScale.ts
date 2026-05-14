import { useEffect, useState } from "react";

export type FontScale = "compact" | "default" | "large" | "xlarge";

const STORAGE_KEY = "volant.fontScale";
const SCALE_MAP: Record<FontScale, number> = {
  compact: 14,
  default: 16,
  large: 18,
  xlarge: 20,
};

export const FONT_SCALE_OPTIONS: { value: FontScale; label: string }[] = [
  { value: "compact", label: "Compacto" },
  { value: "default", label: "Padrão" },
  { value: "large", label: "Grande" },
  { value: "xlarge", label: "Extra grande" },
];

function read(): FontScale {
  if (typeof window === "undefined") return "default";
  const v = window.localStorage.getItem(STORAGE_KEY) as FontScale | null;
  return v && v in SCALE_MAP ? v : "default";
}

export function applyFontScale(scale: FontScale) {
  if (typeof document === "undefined") return;
  document.documentElement.style.fontSize = `${SCALE_MAP[scale]}px`;
}

// Apply immediately on import so first paint has the right size.
if (typeof document !== "undefined") {
  applyFontScale(read());
}

export function useFontScale() {
  const [scale, setScaleState] = useState<FontScale>(read);
  useEffect(() => {
    applyFontScale(scale);
    try { window.localStorage.setItem(STORAGE_KEY, scale); } catch { /* ignore */ }
  }, [scale]);
  return [scale, setScaleState] as const;
}

export function fontScalePx(scale: FontScale) {
  return SCALE_MAP[scale];
}
