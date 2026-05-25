import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

/**
 * Greeting style: bold and italic can be combined independently.
 * Backwards-compatible with v1 ("normal" | "bold" | "italic" string).
 */
export type GreetingStyle = { bold: boolean; italic: boolean };

const STORAGE_KEY = "volant.greetingStyle.v2";
const LEGACY_KEY = "volant.greetingStyle.v1";

function readStyle(): GreetingStyle {
  if (typeof window === "undefined") return { bold: false, italic: false };
  try {
    const v = window.localStorage.getItem(STORAGE_KEY);
    if (v) {
      const parsed = JSON.parse(v);
      return { bold: !!parsed?.bold, italic: !!parsed?.italic };
    }
    const legacy = window.localStorage.getItem(LEGACY_KEY);
    if (legacy === "bold") return { bold: true, italic: false };
    if (legacy === "italic") return { bold: false, italic: true };
  } catch { /* ignore */ }
  return { bold: false, italic: false };
}

export function useGreetingStyle() {
  const [style, setStyle] = useState<GreetingStyle>(readStyle);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(style));
      window.dispatchEvent(new CustomEvent("volant:greetingStyle", { detail: style }));
    } catch { /* ignore */ }
  }, [style]);

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail as GreetingStyle | undefined;
      if (detail && typeof detail === "object") setStyle({ bold: !!detail.bold, italic: !!detail.italic });
    };
    window.addEventListener("volant:greetingStyle", handler);
    return () => window.removeEventListener("volant:greetingStyle", handler);
  }, []);

  return [style, setStyle] as const;
}

export function greetingStyleClass(style: GreetingStyle): string {
  if (!style) return "";
  return cn(style.bold && "font-semibold", style.italic && "italic");
}

/* ------------------------------ Greeting emoji ------------------------------ */

const EMOJI_KEY = "volant.greetingEmoji.v1";
export const DEFAULT_GREETING_EMOJI = "👋";

function readEmoji(): string {
  if (typeof window === "undefined") return DEFAULT_GREETING_EMOJI;
  const v = window.localStorage.getItem(EMOJI_KEY);
  return v === null ? DEFAULT_GREETING_EMOJI : v;
}

export function useGreetingEmoji() {
  const [emoji, setEmoji] = useState<string>(readEmoji);

  useEffect(() => {
    try {
      window.localStorage.setItem(EMOJI_KEY, emoji);
      window.dispatchEvent(new CustomEvent("volant:greetingEmoji", { detail: emoji }));
    } catch { /* ignore */ }
  }, [emoji]);

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (typeof detail === "string") setEmoji(detail);
    };
    window.addEventListener("volant:greetingEmoji", handler);
    return () => window.removeEventListener("volant:greetingEmoji", handler);
  }, []);

  return [emoji, setEmoji] as const;
}
