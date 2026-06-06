import { createContext, useCallback, useContext, useEffect, useMemo, useState, ReactNode } from "react";
import { Entry, ExpenseCategory } from "@/types";

interface EntryDrawerPreset {
  tab?: "earning" | "expense";
  category?: ExpenseCategory;
  /** When provided, the drawer opens in edit mode for this entry. */
  editing?: Entry | null;
  onAfterSave?: () => void;
  /** Prefill worked hours (used after ending a journey). */
  prefillHours?: number;
}

interface UICtx {
  drawerOpen: boolean;
  drawerPreset: EntryDrawerPreset | null;
  openDrawer: (preset?: EntryDrawerPreset) => void;
  setDrawerOpen: (v: boolean) => void;
  /** When true, the app chrome (BottomNav + FAB) is hidden — used during full-screen flows. */
  chromeHidden: boolean;
  /** Components mount a hider while active; auto-unhides on unmount. */
  useHideChrome: () => void;
}

const Ctx = createContext<UICtx | null>(null);

export function UIProvider({ children }: { children: ReactNode }) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerPreset, setDrawerPreset] = useState<EntryDrawerPreset | null>(null);
  const [hideCount, setHideCount] = useState(0);

  const openDrawer = useCallback((preset?: EntryDrawerPreset) => {
    setDrawerPreset(preset || null);
    setDrawerOpen(true);
  }, []);

  const useHideChrome = useCallback(() => {
    useEffect(() => {
      setHideCount((c) => c + 1);
      return () => setHideCount((c) => Math.max(0, c - 1));
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
  }, []);

  const value = useMemo(
    () => ({ drawerOpen, drawerPreset, openDrawer, setDrawerOpen, chromeHidden: hideCount > 0, useHideChrome }),
    [drawerOpen, drawerPreset, openDrawer, hideCount, useHideChrome],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useUI() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useUI must be used within UIProvider");
  return ctx;
}
