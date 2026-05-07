import { createContext, useContext, useEffect, useMemo, useState, ReactNode, useCallback } from "react";
import { Entry, Settings, AppName, ExpenseCategory, MaintenanceType, Car } from "@/types";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";

interface DataCtx {
  entries: Entry[];
  settings: Settings;
  cars: Car[];
  activeCar: Car | null;
  carInitialKm: number;
  loading: boolean;
  addEntry: (e: Entry) => Promise<void>;
  removeEntry: (id: string) => Promise<void>;
  updateSettings: (patch: Partial<Settings>) => Promise<void>;
  refreshProfile: () => Promise<void>;
  refreshCars: () => Promise<void>;
  setActiveCar: (id: string) => Promise<void>;
}

const Ctx = createContext<DataCtx | null>(null);

const DEFAULT_SETTINGS: Settings = {
  dailyGoal: 250,
  maintenanceIntervalKm: 10000,
  lastMaintenanceKm: 0,
  theme: "dark",
};

function rowToEntry(r: any): Entry {
  if (r.type === "earning") {
    return {
      id: r.id, type: "earning", date: r.entry_date, app: r.app as AppName,
      km: Number(r.km) || 0, hours: Number(r.hours) || 0, gross: Number(r.gross) || 0,
      notes: r.notes ?? undefined,
    };
  }
  return {
    id: r.id, type: "expense", date: r.entry_date,
    expense: {
      category: r.expense_category as ExpenseCategory,
      amount: Number(r.expense_amount) || 0,
      description: r.expense_description ?? undefined,
      maintenanceType: (r.maintenance_type as MaintenanceType | null) ?? undefined,
    },
  };
}

function entryToRow(e: Entry, userId: string) {
  if (e.type === "earning") {
    return { id: e.id, user_id: userId, type: "earning", entry_date: e.date,
      app: e.app, km: e.km, hours: e.hours, gross: e.gross, notes: e.notes ?? null };
  }
  return { id: e.id, user_id: userId, type: "expense", entry_date: e.date,
    expense_category: e.expense.category, expense_amount: e.expense.amount,
    expense_description: e.expense.description ?? null,
    maintenance_type: e.expense.maintenanceType ?? null };
}

export function DataProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [entries, setEntries] = useState<Entry[]>([]);
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [cars, setCars] = useState<Car[]>([]);
  const [loading, setLoading] = useState(true);

  const loadCars = useCallback(async (uid: string) => {
    const { data } = await supabase.from("cars").select("*").eq("user_id", uid).order("created_at", { ascending: true });
    setCars((data || []).map((c: any) => ({
      id: c.id, brand: c.brand, model: c.model, plate: c.plate,
      initial_km: Number(c.initial_km) || 0, is_active: !!c.is_active,
    })));
  }, []);

  const refreshCars = useCallback(async () => { if (user) await loadCars(user.id); }, [user, loadCars]);
  const refreshProfile = refreshCars;

  const setActiveCar = useCallback(async (id: string) => {
    if (!user) return;
    await supabase.from("cars").update({ is_active: false }).eq("user_id", user.id);
    await supabase.from("cars").update({ is_active: true }).eq("id", id);
    await loadCars(user.id);
  }, [user, loadCars]);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", settings.theme === "dark");
  }, [settings.theme]);

  useEffect(() => {
    let active = true;
    if (!user) {
      setEntries([]); setSettings(DEFAULT_SETTINGS); setCars([]); setLoading(false);
      return;
    }
    setLoading(true);
    (async () => {
      const [{ data: rows }, { data: sRow }] = await Promise.all([
        supabase.from("entries").select("*").order("entry_date", { ascending: false }),
        supabase.from("user_settings").select("*").eq("user_id", user.id).maybeSingle(),
      ]);
      await loadCars(user.id);
      if (!active) return;
      setEntries((rows || []).map(rowToEntry));
      if (sRow) {
        setSettings({
          dailyGoal: Number(sRow.daily_goal) || 0,
          maintenanceIntervalKm: Number(sRow.maintenance_interval_km) || 0,
          lastMaintenanceKm: Number(sRow.last_maintenance_km) || 0,
          theme: (sRow.theme as "light" | "dark") || "dark",
        });
      }
      setLoading(false);
    })();
    return () => { active = false; };
  }, [user, loadCars]);

  const addEntry = useCallback(async (e: Entry) => {
    if (!user) return;
    setEntries((prev) => [e, ...prev]);
    const { error } = await supabase.from("entries").insert(entryToRow(e, user.id) as any);
    if (error) { setEntries((prev) => prev.filter((x) => x.id !== e.id)); throw error; }
  }, [user]);

  const removeEntry = useCallback(async (id: string) => {
    setEntries((prev) => prev.filter((x) => x.id !== id));
    await supabase.from("entries").delete().eq("id", id);
  }, []);

  const updateSettings = useCallback(async (patch: Partial<Settings>) => {
    if (!user) return;
    const next = { ...settings, ...patch };
    setSettings(next);
    await supabase.from("user_settings").upsert({
      user_id: user.id, daily_goal: next.dailyGoal,
      maintenance_interval_km: next.maintenanceIntervalKm,
      last_maintenance_km: next.lastMaintenanceKm, theme: next.theme,
    });
  }, [user, settings]);

  const activeCar = useMemo(() => cars.find((c) => c.is_active) || cars[0] || null, [cars]);
  const carInitialKm = activeCar?.initial_km || 0;

  const value = useMemo<DataCtx>(
    () => ({ entries, settings, cars, activeCar, carInitialKm, loading,
      addEntry, removeEntry, updateSettings, refreshProfile, refreshCars, setActiveCar }),
    [entries, settings, cars, activeCar, carInitialKm, loading, addEntry, removeEntry, updateSettings, refreshProfile, refreshCars, setActiveCar]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useData() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useData must be used within DataProvider");
  return ctx;
}
