// Helpers para a experiência de instalação do PWA (somente dentro do app autenticado).

export const PWA_KEYS = {
  installed: "volant.pwa.installed",
  snoozeUntil: "volant.pwa.snoozeUntil",
  iosSeenAt: "volant.pwa.iosSeenAt",
} as const;

export type PwaPlatform =
  | "android-chrome"
  | "desktop-chromium"
  | "ios-safari"
  | "ios-other"
  | "unsupported";

export function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  try {
    if (window.matchMedia?.("(display-mode: standalone)").matches) return true;
  } catch { /* ignore */ }
  const nav = window.navigator as Navigator & { standalone?: boolean };
  return nav.standalone === true;
}

export function detectPlatform(): PwaPlatform {
  if (typeof window === "undefined") return "unsupported";
  const ua = window.navigator.userAgent || "";
  const isIOS = /iPad|iPhone|iPod/.test(ua) ||
    (window.navigator.platform === "MacIntel" && (window.navigator as Navigator & { maxTouchPoints?: number }).maxTouchPoints! > 1);
  const isAndroid = /Android/i.test(ua);
  const isSafari = /Safari/i.test(ua) && !/CriOS|FxiOS|EdgiOS|OPiOS/i.test(ua);
  const isChromium = /Chrome|Chromium|Edg|OPR/i.test(ua);

  if (isIOS) return isSafari ? "ios-safari" : "ios-other";
  if (isAndroid && isChromium) return "android-chrome";
  if (!isIOS && !isAndroid && isChromium) return "desktop-chromium";
  return "unsupported";
}

export function readBool(key: string): boolean {
  if (typeof window === "undefined") return false;
  try { return window.localStorage.getItem(key) === "1"; } catch { return false; }
}

export function readNumber(key: string): number {
  if (typeof window === "undefined") return 0;
  try { return Number(window.localStorage.getItem(key) || 0) || 0; } catch { return 0; }
}

export function writeString(key: string, value: string) {
  if (typeof window === "undefined") return;
  try { window.localStorage.setItem(key, value); } catch { /* ignore */ }
}

export function markInstalled() {
  writeString(PWA_KEYS.installed, "1");
}

export function snooze(days: number) {
  writeString(PWA_KEYS.snoozeUntil, String(Date.now() + days * 24 * 3600 * 1000));
}

export function isSnoozed(): boolean {
  return readNumber(PWA_KEYS.snoozeUntil) > Date.now();
}
