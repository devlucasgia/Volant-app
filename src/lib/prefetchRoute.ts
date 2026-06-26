/**
 * Lazy-route prefetcher.
 *
 * Each entry is the same dynamic `import()` used by `React.lazy` in App.tsx,
 * so calling `prefetchRoute("history")` warms up Vite's chunk cache before the
 * user actually navigates. Browsers dedupe identical dynamic imports, so it's
 * safe to call repeatedly (e.g. on hover and again on click).
 */
export const routeLoaders = {
  history: () => import("@/pages/History"),
  reports: () => import("@/pages/Reports"),
  settings: () => import("@/pages/Settings"),
} as const;

export type PrefetchableRoute = keyof typeof routeLoaders;

const fired = new Set<PrefetchableRoute>();

export function prefetchRoute(route: PrefetchableRoute): void {
  if (fired.has(route)) return;
  fired.add(route);
  // Swallow errors silently — prefetch is best-effort.
  void routeLoaders[route]().catch(() => {
    fired.delete(route);
  });
}

/** Maps app paths to a prefetchable route key (when applicable). */
export function routeForPath(path: string): PrefetchableRoute | null {
  if (path === "/historico") return "history";
  if (path === "/relatorios") return "reports";
  if (path === "/ajustes") return "settings";
  return null;
}
