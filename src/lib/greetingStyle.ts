import { useEffect, useState } from "react";

export type GreetingStyle = "normal" | "bold" | "italic";

const STORAGE_KEY = "volant.greetingStyle.v1";

function read(): GreetingStyle {
  if (typeof window === "undefined") return "normal";
  const v = window.localStorage.getItem(STORAGE_KEY);
  if (v === "bold" || v === "italic" || v === "normal") return v;
  return "normal";
}

export function useGreetingStyle() {
  const [style, setStyle] = useState<GreetingStyle>(read);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, style);
      // Notify same-tab listeners (storage event only fires across tabs).
      window.dispatchEvent(new CustomEvent("volant:greetingStyle", { detail: style }));
    } catch { /* ignore */ }
  }, [style]);

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail as GreetingStyle | undefined;
      if (detail) setStyle(detail);
    };
    window.addEventListener("volant:greetingStyle", handler);
    return () => window.removeEventListener("volant:greetingStyle", handler);
  }, []);

  return [style, setStyle] as const;
}

export function greetingStyleClass(style: GreetingStyle): string {
  if (style === "bold") return "font-semibold";
  if (style === "italic") return "italic";
  return "";
}
