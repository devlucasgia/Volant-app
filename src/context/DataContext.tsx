import { createContext, useContext, useEffect, useMemo, useState, ReactNode, useCallback } from "react";
import { Entry, Settings, AppName, ExpenseCategory, MaintenanceType, Car, CustomCategory, BUILTIN_EXPENSE_META, BUILTIN_PLATFORM_META, CategoryMeta, PlatformMeta, DashboardWidgets } from "@/types";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";

interface CategoryInput {
  type: "earning" | "expense";
  key?: string;
  label: string;
  emoji: string;
  color: string;
}

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

  // categories (expenses)
  earningCategories: CustomCategory[];
  expenseCategories: { key: string; label: string; emoji: string; hex: string; isCustom: boolean; id?: string }[];
  expenseMetaFor: (key: string) => CategoryMeta;
  // earning platforms
  earningPlatforms: { key: string; label: string; emoji: string; hex: string; isCustom: boolean; id?: string }[];
  platformMetaFor: (key: string) => PlatformMeta;
  addCategory: (c: CategoryInput) => Promise<void>;
  updateCategory: (id: string, patch: Partial<CategoryInput>) => Promise<void>;
  deleteCategory: (id: string) => Promise<void>;
}

const Ctx = createContext<DataCtx | null>(null);

const DEFAULT_WIDGETS: DashboardWidgets = { goal: true, stats: true, byApp: true, byExpense: true };
const DEFAULT_SETTINGS: Settings = {
  dailyGoal: 250,
  maintenanceIntervalKm: 10000,
  lastMaintenanceKm: 0,
  theme: "dark",
  dashboardWidgets: DEFAULT_WIDGETS,
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
      category: (r.expense_category === "manutencao_preventiva" ? "manutencao" : r.expense_category) as ExpenseCategory,
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
  const [categories, setCategories] = useState<CustomCategory[]>([]);
  const [loading, setLoading] = useState(true);

  const loadCars = useCallback(async (uid: string) => {
    const { data } = await supabase.from("cars").select("*").eq("user_id", uid).order("created_at", { ascending: true });
    setCars((data || []).map((c: any) => ({
      id: c.id, brand: c.brand, model: c.model, plate: c.plate,
      initial_km: Number(c.initial_km) || 0, is_active: !!c.is_active,
    })));
  }, []);

  const loadCategories = useCallback(async (uid: string) => {
    const { data } = await supabase.from("categories").select("*").eq("user_id", uid).order("created_at", { ascending: true });
    setCategories((data || []).map((c: any) => ({
      id: c.id, type: c.type, key: c.key, label: c.label, emoji: c.emoji, color: c.color, is_custom: !!c.is_custom,
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
      setEntries([]); setSettings(DEFAULT_SETTINGS); setCars([]); setCategories([]); setLoading(false);
      return;
    }
    setLoading(true);
    (async () => {
      const [{ data: rows }, { data: sRow }] = await Promise.all([
        supabase.from("entries").select("*").order("entry_date", { ascending: false }),
        supabase.from("user_settings").select("*").eq("user_id", user.id).maybeSingle(),
      ]);
      await Promise.all([loadCars(user.id), loadCategories(user.id)]);
      if (!active) return;
      setEntries((rows || []).map(rowToEntry));
      if (sRow) {
        const dw = (sRow as any).dashboard_widgets || {};
        setSettings({
          dailyGoal: Number(sRow.daily_goal) || 0,
          maintenanceIntervalKm: Number(sRow.maintenance_interval_km) || 0,
          lastMaintenanceKm: Number(sRow.last_maintenance_km) || 0,
          theme: (sRow.theme as "light" | "dark") || "dark",
          dashboardWidgets: { ...DEFAULT_WIDGETS, ...dw },
        });
      }
      setLoading(false);
    })();
    return () => { active = false; };
  }, [user, loadCars, loadCategories]);

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
      dashboard_widgets: next.dashboardWidgets as any,
    } as any);
  }, [user, settings]);

  // ---- Categories
  const expenseOverrides = useMemo(() => {
    const map: Record<string, CustomCategory> = {};
    for (const c of categories) if (c.type === "expense") map[c.key] = c;
    return map;
  }, [categories]);

  const expenseMetaFor = useCallback((key: string): CategoryMeta => {
    const ov = expenseOverrides[key];
    if (ov) return { label: ov.label, emoji: ov.emoji, hex: ov.color };
    if (BUILTIN_EXPENSE_META[key]) return BUILTIN_EXPENSE_META[key];
    if (key === "manutencao_preventiva") return BUILTIN_EXPENSE_META.manutencao;
    return { label: key, emoji: "📌", hex: "#6B7280" };
  }, [expenseOverrides]);

  const expenseCategories = useMemo(() => {
    const builtinKeys = Object.keys(BUILTIN_EXPENSE_META);
    const builtins = builtinKeys.map((k) => {
      const m = expenseMetaFor(k);
      const ov = expenseOverrides[k];
      return { key: k, label: m.label, emoji: m.emoji, hex: m.hex, isCustom: false, id: ov?.id };
    });
    const customs = categories
      .filter((c) => c.type === "expense" && !builtinKeys.includes(c.key))
      .map((c) => ({ key: c.key, label: c.label, emoji: c.emoji, hex: c.color, isCustom: true, id: c.id }));
    return [...builtins, ...customs];
  }, [categories, expenseOverrides, expenseMetaFor]);

  const earningCategories = useMemo(() => categories.filter((c) => c.type === "earning"), [categories]);

  // ---- Earning platforms (mirrors expense category pattern)
  const platformOverrides = useMemo(() => {
    const map: Record<string, CustomCategory> = {};
    for (const c of categories) if (c.type === "earning") map[c.key] = c;
    return map;
  }, [categories]);

  const platformMetaFor = useCallback((key: string): PlatformMeta => {
    const ov = platformOverrides[key];
    if (ov) return { label: ov.label, emoji: ov.emoji, hex: ov.color };
    if (BUILTIN_PLATFORM_META[key]) return BUILTIN_PLATFORM_META[key];
    return { label: key, emoji: "🚗", hex: "#6B7280" };
  }, [platformOverrides]);

  const earningPlatforms = useMemo(() => {
    const builtinKeys = Object.keys(BUILTIN_PLATFORM_META);
    const builtins = builtinKeys.map((k) => {
      const m = platformMetaFor(k);
      const ov = platformOverrides[k];
      return { key: k, label: m.label, emoji: m.emoji, hex: m.hex, isCustom: false, id: ov?.id };
    });
    const customs = categories
      .filter((c) => c.type === "earning" && !builtinKeys.includes(c.key))
      .map((c) => ({ key: c.key, label: c.label, emoji: c.emoji, hex: c.color, isCustom: true, id: c.id }));
    return [...builtins, ...customs];
  }, [categories, platformOverrides, platformMetaFor]);

  const addCategory = useCallback(async (c: CategoryInput) => {
    if (!user) return;
    const key = c.key || `cat_${Date.now()}`;
    const { error } = await supabase.from("categories").insert({
      user_id: user.id, type: c.type, key, label: c.label, emoji: c.emoji, color: c.color,
      is_custom: !(c.type === "expense" && key in BUILTIN_EXPENSE_META),
    });
    if (error) throw error;
    await loadCategories(user.id);
  }, [user, loadCategories]);

  const updateCategory = useCallback(async (id: string, patch: Partial<CategoryInput>) => {
    if (!user) return;
    const { error } = await supabase.from("categories").update({
      ...(patch.label !== undefined ? { label: patch.label } : {}),
      ...(patch.emoji !== undefined ? { emoji: patch.emoji } : {}),
      ...(patch.color !== undefined ? { color: patch.color } : {}),
    }).eq("id", id);
    if (error) throw error;
    await loadCategories(user.id);
  }, [user, loadCategories]);

  const deleteCategory = useCallback(async (id: string) => {
    if (!user) return;
    await supabase.from("categories").delete().eq("id", id);
    await loadCategories(user.id);
  }, [user, loadCategories]);

  const activeCar = useMemo(() => cars.find((c) => c.is_active) || cars[0] || null, [cars]);
  const carInitialKm = activeCar?.initial_km || 0;

  const value = useMemo<DataCtx>(
    () => ({ entries, settings, cars, activeCar, carInitialKm, loading,
      addEntry, removeEntry, updateSettings, refreshProfile, refreshCars, setActiveCar,
      earningCategories, expenseCategories, expenseMetaFor, addCategory, updateCategory, deleteCategory }),
    [entries, settings, cars, activeCar, carInitialKm, loading, addEntry, removeEntry, updateSettings, refreshProfile, refreshCars, setActiveCar,
      earningCategories, expenseCategories, expenseMetaFor, addCategory, updateCategory, deleteCategory]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useData() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useData must be used within DataProvider");
  return ctx;
}
