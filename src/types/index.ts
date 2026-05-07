export type AppName = "uber" | "99" | "indriver" | "particular";

export const APP_META: Record<AppName, { label: string; colorClass: string; badgeClass: string }> = {
  uber: { label: "Uber", colorClass: "bg-brand-uber text-brand-uber-foreground", badgeClass: "bg-brand-uber text-brand-uber-foreground" },
  "99": { label: "99", colorClass: "bg-brand-99 text-brand-99-foreground", badgeClass: "bg-brand-99 text-brand-99-foreground" },
  indriver: { label: "inDriver", colorClass: "bg-brand-indriver text-brand-indriver-foreground", badgeClass: "bg-brand-indriver text-brand-indriver-foreground" },
  particular: { label: "Particular", colorClass: "bg-brand-particular text-brand-particular-foreground", badgeClass: "bg-brand-particular text-brand-particular-foreground" },
};

export type ExpenseCategory = string;

export interface CategoryMeta { label: string; emoji: string; hex: string }

export const BUILTIN_EXPENSE_META: Record<string, CategoryMeta> = {
  combustivel: { label: "Combustível", emoji: "⛽", hex: "#F59E0B" },
  alimentacao: { label: "Alimentação", emoji: "🍔", hex: "#EF4444" },
  manutencao: { label: "Manutenção", emoji: "🔧", hex: "#10B981" },
  outros: { label: "Outros", emoji: "📦", hex: "#8B5CF6" },
};

// Back-compat: components still import EXPENSE_META. It is now a Proxy that
// falls back to a generic record for unknown / custom keys (resolved at runtime
// by useCategories where possible).
export const EXPENSE_META: Record<string, CategoryMeta> = new Proxy(BUILTIN_EXPENSE_META, {
  get(target, prop: string) {
    if (prop in target) return (target as any)[prop];
    // legacy mapping
    if (prop === "manutencao_preventiva") return target.manutencao;
    return { label: String(prop), emoji: "📌", hex: "#6B7280" };
  },
}) as any;

export interface Car {
  id: string;
  brand: string | null;
  model: string | null;
  plate: string | null;
  initial_km: number;
  is_active: boolean;
}

export type MaintenanceType = "oleo" | "bateria" | "pneus" | "outro";

export interface Expense {
  category: ExpenseCategory;
  amount: number;
  description?: string;
  maintenanceType?: MaintenanceType;
}

export interface EarningEntry {
  id: string;
  type: "earning";
  date: string; // ISO
  app: AppName;
  km: number;
  hours: number;
  gross: number;
  notes?: string;
}

export interface ExpenseEntry {
  id: string;
  type: "expense";
  date: string;
  expense: Expense;
}

export type Entry = EarningEntry | ExpenseEntry;

export interface DashboardWidgets {
  goal: boolean;
  stats: boolean;
  byApp: boolean;
  byExpense: boolean;
}

export interface Settings {
  dailyGoal: number;
  maintenanceIntervalKm: number;
  lastMaintenanceKm: number;
  theme: "light" | "dark";
  dashboardWidgets: DashboardWidgets;
}

export interface CustomCategory {
  id: string;
  type: "earning" | "expense";
  key: string;
  label: string;
  emoji: string;
  color: string;
  is_custom: boolean;
}
