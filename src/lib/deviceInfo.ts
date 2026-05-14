// Lightweight, privacy-friendly device/app metadata for feedback submissions.

import { APP_VERSION_LABEL } from "@/config/version";

export interface DeviceInfo {
  appVersion: string;
  userAgent: string;
  platform: string;
  language: string;
  screen: string;
  viewport: string;
  pwa: boolean;
  timezone: string;
  submittedAt: string;
}

export function collectDeviceInfo(): DeviceInfo {
  const nav = typeof navigator !== "undefined" ? navigator : ({} as Navigator);
  const win = typeof window !== "undefined" ? window : ({} as Window);
  const scr = typeof screen !== "undefined" ? screen : ({} as Screen);

  const isStandalone =
    (typeof window !== "undefined" &&
      (window.matchMedia?.("(display-mode: standalone)").matches ||
        // iOS
        (window.navigator as unknown as { standalone?: boolean })?.standalone === true)) ||
    false;

  return {
    appVersion: APP_VERSION_LABEL,
    userAgent: (nav.userAgent || "").slice(0, 400),
    platform: (nav.platform || "").slice(0, 80),
    language: nav.language || "",
    screen: scr.width && scr.height ? `${scr.width}x${scr.height}` : "",
    viewport:
      win.innerWidth && win.innerHeight ? `${win.innerWidth}x${win.innerHeight}` : "",
    pwa: isStandalone,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "",
    submittedAt: new Date().toISOString(),
  };
}

/** Plain-text block ready to drop into the email body. */
export function formatDeviceInfo(d: DeviceInfo): string {
  return [
    `Versão do app: ${d.appVersion}`,
    `Sistema/plataforma: ${d.platform || "—"}`,
    `Idioma: ${d.language || "—"}`,
    `Tamanho da tela: ${d.screen || "—"}`,
    `Viewport: ${d.viewport || "—"}`,
    `Modo PWA: ${d.pwa ? "sim" : "não"}`,
    `Fuso horário: ${d.timezone || "—"}`,
    `User Agent: ${d.userAgent || "—"}`,
  ].join("\n");
}
