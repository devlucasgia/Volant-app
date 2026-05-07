import { createContext, useCallback, useContext, useMemo, useState, ReactNode } from "react";
import { ExpenseCategory } from "@/types";

interface EntryDrawerPreset {
  tab?: "earning" | "expense";
  category?: ExpenseCategory;
  onAfterSave?: () => void;
}

interface UICtx {
  drawerOpen: boolean;
  drawerPreset: EntryDrawerPreset | null;
  openDrawer: (preset?: EntryDrawerPreset) => void;
  setDrawerOpen: (v: boolean) => void;
}

const Ctx = createContext<UICtx | null>(null);

export function UIProvider({ children }: { children: ReactNode }) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerPreset, setDrawerPreset] = useState<EntryDrawerPreset | null>(null);

  const openDrawer = useCallback((preset?: EntryDrawerPreset) => {
    setDrawerPreset(preset || null);
    setDrawerOpen(true);
  }, []);

  const value = useMemo(() => ({ drawerOpen, drawerPreset, openDrawer, setDrawerOpen }), [drawerOpen, drawerPreset, openDrawer]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useUI() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useUI must be used within UIProvider");
  return ctx;
}
