// Platforms are now dynamic. AppName is a string key resolved via DataContext.platformMetaFor
export type AppName = string;

export type PlatformType = "ride" | "simple";

export interface PlatformMeta {
  label: string;
  emoji: string;
  hex: string;
  type: PlatformType;
  imageUrl?: string | null;
}

export const BUILTIN_PLATFORM_META: Record<string, PlatformMeta> = {
  uber:       { label: "Uber",       emoji: "🚗", hex: "#000000", type: "ride" },
  "99":       { label: "99",         emoji: "🚕", hex: "#FFCC00", type: "ride" },
  indriver:   { label: "inDrive",    emoji: "🟢", hex: "#A4E333", type: "ride" },
  particular: { label: "Particular", emoji: "👤", hex: "#3B82F6", type: "ride" },
};

// Back-compat shim. Components increasingly use `platformMetaFor` from DataContext.
export const APP_META: Record<string, { label: string; colorClass: string; badgeClass: string }> = new Proxy(
  {} as any,
  {
    get(_t, prop: string) {
      const m = BUILTIN_PLATFORM_META[prop] || { label: String(prop), emoji: "🚗", hex: "#6B7280" };
      // Tailwind cannot consume runtime hex via class; consumers prefer platformMetaFor for styling.
      const cls = "bg-muted text-foreground";
      return { label: m.label, colorClass: cls, badgeClass: cls };
    },
  },
);

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
  km_adjustment: number;
  is_active: boolean;
  ownership_status?: "quitado" | "financiado" | "alugado" | null;
  financing_monthly?: number | null;
  rental_weekly?: number | null;
  rental_monthly?: number | null;
  oil_change_cost?: number | null;
  oil_change_interval_km?: number | null;
  tires_cost?: number | null;
  tires_interval_km?: number | null;
  ipva_yearly?: number | null;
  insurance_monthly?: number | null;
  other_monthly_costs?: number | null;
  fuel_consumption_kml?: number | null;
  fuel_type?: "gasolina" | "etanol" | "diesel" | "gnv" | "flex" | "eletrico" | null;
  fuel_price?: number | null;
  food_avg_per_day?: number | null;
}

export type GoalType = "liquido" | "bruto";

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
  rides?: number;
  notes?: string;
  /** Quando preenchido, indica que esta linha faz parte de uma sessão multi-plataforma.
   * A primeira linha do grupo (âncora) carrega km/hours/notes; demais ficam com 0/null. */
  groupId?: string;
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
  greeting: boolean;
  journey: boolean;
  smartKm: boolean;
}

export type PlanningStatus = "not_configured" | "configured";

export interface Settings {
  dailyGoal: number;
  monthlyGoal: number;
  maintenanceIntervalKm: number;
  lastMaintenanceKm: number;
  theme: "light" | "dark";
  dashboardWidgets: DashboardWidgets;
  goalType: GoalType;
  workingDaysPerMonth: number | null;
  /** Dias que o motorista ainda pretende trabalhar do dia atual até o fim do mês. */
  remainingWorkingDays: number | null;
  /** KM planejado para o mês corrente — usado pelo módulo KM Inteligente. */
  kmPlannedMonth: number | null;
  /** Ajuste manual do KM restante até o fim do mês. Quando preenchido, sobrescreve o cálculo automático. */
  kmRemainingOverride: number | null;
  /** Estado do novo Planejamento Inteligente. Todos os usuários começam como "not_configured". */
  planningStatus: PlanningStatus;
  /** Datas exatas (ISO yyyy-MM-dd) selecionadas no calendário do Planejamento Inteligente. */
  planningSelectedDates: string[] | null;
  /** Base de R$/km escolhida no fluxo guiado (legado — mantido por compat). */
  rpkBase: number | null;
  /** Média de KM por dia trabalhado informada no Planejamento Inteligente. */
  planningAvgKmPerDay: number | null;
  /** Snapshot do plano original (gravado em Refazer/fresh, nunca em Ajustar). */
  planningOriginalGoal?: number | null;
  planningOriginalGoalType?: GoalType | null;
  planningOriginalAvgKm?: number | null;
  planningOriginalDates?: string[] | null;
  planningOriginalCreatedAt?: string | null;
  /** Slot do plano do PRÓXIMO mês — entra em vigor automaticamente na virada. */
  nextPlanGoal?: number | null;
  nextPlanGoalType?: GoalType | null;
  nextPlanAvgKm?: number | null;
  nextPlanDates?: string[] | null;
  nextPlanCreatedAt?: string | null;
  /** Marcado pelo edge function quando o slot futuro entra em vigor — usado para mostrar o banner "entrou em vigor". */
  nextPlanActivatedAt?: string | null;
  /** Início da semana usado no calendário do Planejamento (0 = domingo, 1 = segunda). */
  weekStartsOn?: 0 | 1;
}

export interface CustomCategory {
  id: string;
  type: "earning" | "expense";
  key: string;
  label: string;
  emoji: string;
  color: string;
  is_custom: boolean;
  platform_type?: PlatformType;
  image_url?: string | null;
}
