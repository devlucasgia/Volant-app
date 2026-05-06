import { createContext, useContext, useEffect, useMemo, useState, ReactNode } from "react";
import { Entry, Settings } from "@/types";
import { loadEntries, loadSettings, saveEntries, saveSettings } from "@/lib/storage";

interface DataCtx {
  entries: Entry[];
  settings: Settings;
  addEntry: (e: Entry) => void;
  removeEntry: (id: string) => void;
  updateSettings: (patch: Partial<Settings>) => void;
}

const Ctx = createContext<DataCtx | null>(null);

export function DataProvider({ children }: { children: ReactNode }) {
  const [entries, setEntries] = useState<Entry[]>(() => loadEntries());
  const [settings, setSettings] = useState<Settings>(() => loadSettings());

  useEffect(() => saveEntries(entries), [entries]);
  useEffect(() => saveSettings(settings), [settings]);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", settings.theme === "dark");
  }, [settings.theme]);

  const value = useMemo<DataCtx>(
    () => ({
      entries,
      settings,
      addEntry: (e) => setEntries((prev) => [e, ...prev]),
      removeEntry: (id) => setEntries((prev) => prev.filter((x) => x.id !== id)),
      updateSettings: (patch) => setSettings((s) => ({ ...s, ...patch })),
    }),
    [entries, settings]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useData() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useData must be used within DataProvider");
  return ctx;
}
