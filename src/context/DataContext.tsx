import { createContext, useContext, useEffect, useMemo, useRef, useState, ReactNode, useCallback } from "react";
import { Entry, Settings, AppName, ExpenseCategory, MaintenanceType, Car, CustomCategory, BUILTIN_EXPENSE_META, BUILTIN_PLATFORM_META, CategoryMeta, PlatformMeta, PlatformType, DashboardWidgets } from "@/types";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";

interface CategoryInput {
  type: "earning" | "expense";
  key?: string;
  label: string;
  emoji: string;
  color: string;
  platformType?: PlatformType;
  imageUrl?: string | null;
}

interface DataCtx {
  entries: Entry[];
  settings: Settings;
  cars: Car[];
  activeCar: Car | null;
  carInitialKm: number;
  loading: boolean;
  addEntry: (e: Entry) => Promise<void>;
  addEntries: (es: Entry[]) => Promise<void>;
  updateEntry: (e: Entry) => Promise<void>;
  removeEntry: (id: string) => Promise<void>;
  removeGroup: (groupId: string) => Promise<void>;
  updateSettings: (patch: Partial<Settings>) => Promise<void>;
  refreshSettings: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  refreshCars: () => Promise<void>;
  setActiveCar: (id: string) => Promise<void>;
  updateCarKmAdjustment: (carId: string, adjustment: number) => Promise<void>;

  // categories (expenses)
  earningCategories: CustomCategory[];
  expenseCategories: { key: string; label: string; emoji: string; hex: string; isCustom: boolean; id?: string }[];
  expenseMetaFor: (key: string) => CategoryMeta;
  // earning platforms
  earningPlatforms: { key: string; label: string; emoji: string; hex: string; isCustom: boolean; id?: string; type: PlatformType; imageUrl?: string | null }[];
  platformMetaFor: (key: string) => PlatformMeta;
  isSimplePlatform: (key: string) => boolean;
  addCategory: (c: CategoryInput) => Promise<void>;
  updateCategory: (id: string, patch: Partial<CategoryInput>) => Promise<void>;
  deleteCategory: (id: string) => Promise<void>;
}

const Ctx = createContext<DataCtx | null>(null);

const DEFAULT_WIDGETS: DashboardWidgets = { goal: true, stats: true, byApp: true, byExpense: true, greeting: true, journey: true, smartKm: true };
const DEFAULT_SETTINGS: Settings = {
  dailyGoal: 0,
  monthlyGoal: 0,
  maintenanceIntervalKm: 0,
  lastMaintenanceKm: 0,
  theme: "dark",
  dashboardWidgets: DEFAULT_WIDGETS,
  goalType: "bruto",
  workingDaysPerMonth: null,
  remainingWorkingDays: null,
  kmPlannedMonth: null,
  kmRemainingOverride: null,
  planningStatus: "not_configured",
  planningSelectedDates: null,
  rpkBase: null,
  planningAvgKmPerDay: null,
  planningOriginalGoal: null,
  planningOriginalGoalType: null,
  planningOriginalAvgKm: null,
  planningOriginalDates: null,
  planningOriginalCreatedAt: null,
  nextPlanGoal: null,
  nextPlanGoalType: null,
  nextPlanAvgKm: null,
  nextPlanDates: null,
  nextPlanCreatedAt: null,
  nextPlanActivatedAt: null,
  weekStartsOn: 1,
};

function mapSettingsRow(sRow: any): Settings {
  const dw = (sRow as any).dashboard_widgets || {};
  const gt = ((sRow as any).goal_type as "liquido" | "bruto" | undefined) || "bruto";
  const wd = (sRow as any).working_days_per_month;
  const rwd = (sRow as any).remaining_working_days;
  const km = (sRow as any).km_planned_month;
  const kmOv = (sRow as any).km_remaining_override;
  const ps = ((sRow as any).planning_status as "not_configured" | "configured" | undefined) || "not_configured";
  const psd = (sRow as any).planning_selected_dates;
  const rpk = (sRow as any).rpk_base;
  const avgKm = (sRow as any).planning_avg_km_per_day;
  const poGoal = (sRow as any).planning_original_goal;
  const poGoalType = (sRow as any).planning_original_goal_type;
  const poAvgKm = (sRow as any).planning_original_avg_km;
  const poDates = (sRow as any).planning_original_dates;
  const poCreatedAt = (sRow as any).planning_original_created_at;
  const npGoal = (sRow as any).next_plan_goal;
  const npGoalType = (sRow as any).next_plan_goal_type;
  const npAvgKm = (sRow as any).next_plan_avg_km;
  const npDates = (sRow as any).next_plan_dates;
  const npCreatedAt = (sRow as any).next_plan_created_at;
  const npActivatedAt = (sRow as any).next_plan_activated_at;
  const wso = (sRow as any).week_starts_on;
  return {
    dailyGoal: Number(sRow.daily_goal) || 0,
    monthlyGoal: Number((sRow as any).monthly_goal) || 0,
    maintenanceIntervalKm: Number(sRow.maintenance_interval_km) || 0,
    lastMaintenanceKm: Number(sRow.last_maintenance_km) || 0,
    theme: (sRow.theme as "light" | "dark") || "dark",
    dashboardWidgets: { ...DEFAULT_WIDGETS, ...dw },
    goalType: gt,
    workingDaysPerMonth: wd == null ? null : Number(wd),
    remainingWorkingDays: rwd == null ? null : Number(rwd),
    kmPlannedMonth: km == null ? null : Number(km),
    kmRemainingOverride: kmOv == null ? null : Number(kmOv),
    planningStatus: ps,
    planningSelectedDates: Array.isArray(psd) ? (psd as string[]) : null,
    rpkBase: rpk == null ? null : Number(rpk),
    planningAvgKmPerDay: avgKm == null ? null : Number(avgKm),
    planningOriginalGoal: poGoal == null ? null : Number(poGoal),
    planningOriginalGoalType: (poGoalType as any) ?? null,
    planningOriginalAvgKm: poAvgKm == null ? null : Number(poAvgKm),
    planningOriginalDates: Array.isArray(poDates) ? (poDates as string[]) : null,
    planningOriginalCreatedAt: poCreatedAt ?? null,
    nextPlanGoal: npGoal == null ? null : Number(npGoal),
    nextPlanGoalType: (npGoalType as any) ?? null,
    nextPlanAvgKm: npAvgKm == null ? null : Number(npAvgKm),
    nextPlanDates: Array.isArray(npDates) ? (npDates as string[]) : null,
    nextPlanCreatedAt: npCreatedAt ?? null,
    nextPlanActivatedAt: npActivatedAt ?? null,
    weekStartsOn: (wso === 0 ? 0 : 1) as 0 | 1,
  };
}

function rowToEntry(r: any): Entry {
  if (r.type === "earning") {
    return {
      id: r.id, type: "earning", date: r.entry_date, app: r.app as AppName,
      km: Number(r.km) || 0, hours: Number(r.hours) || 0, gross: Number(r.gross) || 0,
      rides: r.rides == null ? undefined : Number(r.rides),
      notes: r.notes ?? undefined,
      groupId: r.group_id ?? undefined,
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
      app: e.app, km: e.km, hours: e.hours, gross: e.gross,
      rides: e.rides ?? null,
      notes: e.notes ?? null,
      group_id: e.groupId ?? null };
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
  const settingsRef = useRef(settings);
  useEffect(() => { settingsRef.current = settings; }, [settings]);
  const [cars, setCars] = useState<Car[]>([]);
  const [categories, setCategories] = useState<CustomCategory[]>([]);
  const [loading, setLoading] = useState(true);

  const loadCars = useCallback(async (uid: string) => {
    const { data } = await supabase.from("cars").select("*").eq("user_id", uid).order("created_at", { ascending: true });
    setCars((data || []).map((c: any) => ({
      id: c.id, brand: c.brand, model: c.model, plate: c.plate,
      initial_km: Number(c.initial_km) || 0,
      km_adjustment: Number(c.km_adjustment) || 0,
      is_active: !!c.is_active,
      ownership_status: c.ownership_status ?? null,
      financing_monthly: c.financing_monthly == null ? null : Number(c.financing_monthly),
      rental_weekly: c.rental_weekly == null ? null : Number(c.rental_weekly),
      rental_monthly: c.rental_monthly == null ? null : Number(c.rental_monthly),
      oil_change_cost: c.oil_change_cost == null ? null : Number(c.oil_change_cost),
      oil_change_interval_km: c.oil_change_interval_km == null ? null : Number(c.oil_change_interval_km),
      tires_cost: c.tires_cost == null ? null : Number(c.tires_cost),
      tires_interval_km: c.tires_interval_km == null ? null : Number(c.tires_interval_km),
      ipva_yearly: c.ipva_yearly == null ? null : Number(c.ipva_yearly),
      insurance_monthly: c.insurance_monthly == null ? null : Number(c.insurance_monthly),
      other_monthly_costs: c.other_monthly_costs == null ? null : Number(c.other_monthly_costs),
      fuel_consumption_kml: c.fuel_consumption_kml == null ? null : Number(c.fuel_consumption_kml),
      fuel_type: c.fuel_type ?? null,
      fuel_price: c.fuel_price == null ? null : Number(c.fuel_price),
      food_avg_per_day: c.food_avg_per_day == null ? null : Number(c.food_avg_per_day),
    })));
  }, []);

  const loadCategories = useCallback(async (uid: string) => {
    const { data } = await supabase.from("categories").select("*").eq("user_id", uid).order("created_at", { ascending: true });
    setCategories((data || []).map((c: any) => ({
      id: c.id, type: c.type, key: c.key, label: c.label, emoji: c.emoji, color: c.color, is_custom: !!c.is_custom,
      platform_type: (c.platform_type as PlatformType) || "ride",
      image_url: c.image_url ?? null,
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

  // Dispara verificação on-demand de alertas de manutenção (e-mail + dedupe server-side).
  // Throttle simples: 1 chamada a cada 15s por usuário, fire-and-forget.
  const triggerMaintenanceCheck = useCallback((userId: string | undefined) => {
    if (!userId) return;
    const now = Date.now();
    const w = window as any;
    w.__volantMaintCheck ??= new Map<string, number>();
    const last = w.__volantMaintCheck.get(userId) || 0;
    if (now - last < 15_000) return;
    w.__volantMaintCheck.set(userId, now);
    supabase.functions.invoke("check-maintenance-alerts", { body: { user_id: userId } })
      .catch((err) => { console.warn("[maint] trigger failed", err); });
  }, []);

  const updateCarKmAdjustment = useCallback(async (carId: string, adjustment: number) => {
    if (!user) return;
    const { error } = await supabase
      .from("cars")
      .update({ km_adjustment: adjustment } as any)
      .eq("id", carId);
    if (error) throw error;
    await loadCars(user.id);
    triggerMaintenanceCheck(user.id);
  }, [user, loadCars, triggerMaintenanceCheck]);


  useEffect(() => {
    document.documentElement.classList.toggle("dark", settings.theme === "dark");
    // Persist for the inline pre-paint script in index.html so the next
    // session boots in the correct theme without a light-mode flash.
    try { window.localStorage.setItem("volant.theme", settings.theme); } catch { /* ignore */ }
  }, [settings.theme]);

  useEffect(() => {
    let active = true;
    if (!user) {
      setEntries([]); setSettings(DEFAULT_SETTINGS); setCars([]); setCategories([]); setLoading(false);
      return;
    }
    setLoading(true);
    (async () => {
      // Explicit user_id filter (defense-in-depth alongside RLS) and raised
      // range to avoid silent truncation at the default 1000-row PostgREST limit.
      const [{ data: rows }, { data: sRow }] = await Promise.all([
        supabase
          .from("entries")
          .select("*")
          .eq("user_id", user.id)
          .order("entry_date", { ascending: false })
          .range(0, 9999),
        supabase.from("user_settings").select("*").eq("user_id", user.id).maybeSingle(),
      ]);
      await Promise.all([loadCars(user.id), loadCategories(user.id)]);
      if (!active) return;
      setEntries((rows || []).map(rowToEntry));
      if (sRow) setSettings(mapSettingsRow(sRow));
      setLoading(false);
    })();
    return () => { active = false; };
  }, [user, loadCars, loadCategories]);

  const refreshSettings = useCallback(async () => {
    if (!user) return;
    const { data: sRow } = await supabase
      .from("user_settings").select("*").eq("user_id", user.id).maybeSingle();
    if (sRow) setSettings(mapSettingsRow(sRow));
  }, [user]);

  const shouldTriggerMaintFor = (e: Entry) => {
    if (e.type === "earning") return Number((e as any).km || 0) > 0;
    if (e.type === "expense" && (e as any).expense?.category === "manutencao") return true;
    return false;
  };

  const addEntry = useCallback(async (e: Entry) => {
    if (!user) return;
    setEntries((prev) => [e, ...prev]);
    const { error } = await supabase.from("entries").insert(entryToRow(e, user.id) as any);
    if (error) { setEntries((prev) => prev.filter((x) => x.id !== e.id)); throw error; }
    if (shouldTriggerMaintFor(e)) triggerMaintenanceCheck(user.id);
  }, [user, triggerMaintenanceCheck]);

  const addEntries = useCallback(async (es: Entry[]) => {
    if (!user || es.length === 0) return;
    setEntries((prev) => [...es, ...prev]);
    const rows = es.map((e) => entryToRow(e, user.id));
    const { error } = await supabase.from("entries").insert(rows as any);
    if (error) {
      const ids = new Set(es.map((e) => e.id));
      setEntries((prev) => prev.filter((x) => !ids.has(x.id)));
      throw error;
    }
    // Linha-âncora é a primeira; se ela tiver km > 0 (ou for entrada solta com km>0), dispara alerta.
    if (es.some((e) => shouldTriggerMaintFor(e))) triggerMaintenanceCheck(user.id);
  }, [user, triggerMaintenanceCheck]);

  const removeEntry = useCallback(async (id: string) => {
    const snapshot = entries;
    const removed = entries.find((x) => x.id === id);
    setEntries((prev) => prev.filter((x) => x.id !== id));
    const { error } = await supabase.from("entries").delete().eq("id", id);
    if (error) {
      // Roll back optimistic removal so the UI stays consistent with the DB.
      setEntries(snapshot);
      throw error;
    }
    if (removed && shouldTriggerMaintFor(removed)) triggerMaintenanceCheck(user?.id);
  }, [entries, user, triggerMaintenanceCheck]);

  const removeGroup = useCallback(async (groupId: string) => {
    if (!user) return;
    const snapshot = entries;
    const removed = entries.filter((x) => x.type === "earning" && (x as any).groupId === groupId);
    if (removed.length === 0) return;
    setEntries((prev) => prev.filter((x) => !(x.type === "earning" && (x as any).groupId === groupId)));
    const { error } = await supabase.from("entries").delete().eq("group_id", groupId);
    if (error) { setEntries(snapshot); throw error; }
    if (removed.some((e) => shouldTriggerMaintFor(e))) triggerMaintenanceCheck(user.id);
  }, [entries, user, triggerMaintenanceCheck]);

  const updateEntry = useCallback(async (e: Entry) => {
    if (!user) return;
    setEntries((prev) => prev.map((x) => (x.id === e.id ? e : x)));
    const row = entryToRow(e, user.id) as any;
    delete row.id;
    delete row.user_id;
    const { error } = await supabase.from("entries").update(row).eq("id", e.id);
    if (error) throw error;
    if (shouldTriggerMaintFor(e)) triggerMaintenanceCheck(user.id);
  }, [user, triggerMaintenanceCheck]);


  const updateSettings = useCallback(async (patch: Partial<Settings>) => {
    if (!user) return;
    const prev = settings;
    const next = { ...settings, ...patch };
    setSettings(next);
    const { error } = await supabase.from("user_settings").upsert({
      user_id: user.id, daily_goal: next.dailyGoal,
      monthly_goal: next.monthlyGoal,
      maintenance_interval_km: next.maintenanceIntervalKm,
      last_maintenance_km: next.lastMaintenanceKm, theme: next.theme,
      dashboard_widgets: next.dashboardWidgets as any,
      goal_type: next.goalType,
      working_days_per_month: next.workingDaysPerMonth,
      remaining_working_days: next.remainingWorkingDays,
      km_planned_month: next.kmPlannedMonth,
      km_remaining_override: next.kmRemainingOverride,
      planning_status: next.planningStatus,
      planning_selected_dates: next.planningSelectedDates as any,
      rpk_base: next.rpkBase,
      planning_avg_km_per_day: next.planningAvgKmPerDay,
      planning_original_goal: next.planningOriginalGoal ?? null,
      planning_original_goal_type: next.planningOriginalGoalType ?? null,
      planning_original_avg_km: next.planningOriginalAvgKm ?? null,
      planning_original_dates: (next.planningOriginalDates ?? null) as any,
      planning_original_created_at: next.planningOriginalCreatedAt ?? null,
      next_plan_goal: next.nextPlanGoal ?? null,
      next_plan_goal_type: next.nextPlanGoalType ?? null,
      next_plan_avg_km: next.nextPlanAvgKm ?? null,
      next_plan_dates: (next.nextPlanDates ?? null) as any,
      next_plan_created_at: next.nextPlanCreatedAt ?? null,
      next_plan_activated_at: next.nextPlanActivatedAt ?? null,
      week_starts_on: next.weekStartsOn ?? 1,
    } as any);
    if (error) {
      // Revert optimistic state on failure so the UI does not lie.
      setSettings(prev);
      throw error;
    }
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
    if (ov) return {
      label: ov.label,
      emoji: ov.emoji,
      hex: ov.color,
      type: (ov.platform_type as PlatformType) || "ride",
      imageUrl: ov.image_url ?? null,
    };
    if (BUILTIN_PLATFORM_META[key]) return BUILTIN_PLATFORM_META[key];
    return { label: key, emoji: "🚗", hex: "#6B7280", type: "ride" };
  }, [platformOverrides]);

  const isSimplePlatform = useCallback((key: string) => platformMetaFor(key).type === "simple", [platformMetaFor]);

  const earningPlatforms = useMemo(() => {
    const builtinKeys = Object.keys(BUILTIN_PLATFORM_META);
    const builtins = builtinKeys.map((k) => {
      const m = platformMetaFor(k);
      const ov = platformOverrides[k];
      return { key: k, label: m.label, emoji: m.emoji, hex: m.hex, isCustom: false, id: ov?.id, type: m.type, imageUrl: m.imageUrl ?? null };
    });
    const customs = categories
      .filter((c) => c.type === "earning" && !builtinKeys.includes(c.key))
      .map((c) => ({
        key: c.key, label: c.label, emoji: c.emoji, hex: c.color, isCustom: true, id: c.id,
        type: (c.platform_type as PlatformType) || "ride",
        imageUrl: c.image_url ?? null,
      }));
    return [...builtins, ...customs];
  }, [categories, platformOverrides, platformMetaFor]);

  const addCategory = useCallback(async (c: CategoryInput) => {
    if (!user) return;
    const key = c.key || `cat_${Date.now()}`;
    const { error } = await supabase.from("categories").insert({
      user_id: user.id, type: c.type, key, label: c.label, emoji: c.emoji, color: c.color,
      is_custom: !((c.type === "expense" && key in BUILTIN_EXPENSE_META) || (c.type === "earning" && key in BUILTIN_PLATFORM_META)),
      platform_type: c.type === "earning" ? (c.platformType || "ride") : "ride",
      image_url: c.imageUrl ?? null,
    } as any);
    if (error) throw error;
    await loadCategories(user.id);
  }, [user, loadCategories]);

  const updateCategory = useCallback(async (id: string, patch: Partial<CategoryInput>) => {
    if (!user) return;
    const { error } = await supabase.from("categories").update({
      ...(patch.label !== undefined ? { label: patch.label } : {}),
      ...(patch.emoji !== undefined ? { emoji: patch.emoji } : {}),
      ...(patch.color !== undefined ? { color: patch.color } : {}),
      ...(patch.platformType !== undefined ? { platform_type: patch.platformType } : {}),
      ...(patch.imageUrl !== undefined ? { image_url: patch.imageUrl } : {}),
    } as any).eq("id", id);
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
      addEntry, addEntries, updateEntry, removeEntry, removeGroup, updateSettings, refreshSettings, refreshProfile, refreshCars, setActiveCar, updateCarKmAdjustment,
      earningCategories, expenseCategories, expenseMetaFor,
      earningPlatforms, platformMetaFor, isSimplePlatform,
      addCategory, updateCategory, deleteCategory }),
    [entries, settings, cars, activeCar, carInitialKm, loading, addEntry, addEntries, updateEntry, removeEntry, removeGroup, updateSettings, refreshSettings, refreshProfile, refreshCars, setActiveCar, updateCarKmAdjustment,
      earningCategories, expenseCategories, expenseMetaFor, earningPlatforms, platformMetaFor, isSimplePlatform,
      addCategory, updateCategory, deleteCategory]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useData() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useData must be used within DataProvider");
  return ctx;
}
