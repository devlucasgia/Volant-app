export type AppName = "uber" | "99" | "indriver" | "particular";

export const APP_META: Record<AppName, { label: string; colorClass: string; badgeClass: string }> = {
  uber: { label: "Uber", colorClass: "bg-brand-uber text-brand-uber-foreground", badgeClass: "bg-brand-uber text-brand-uber-foreground" },
  "99": { label: "99", colorClass: "bg-brand-99 text-brand-99-foreground", badgeClass: "bg-brand-99 text-brand-99-foreground" },
  indriver: { label: "inDriver", colorClass: "bg-brand-indriver text-brand-indriver-foreground", badgeClass: "bg-brand-indriver text-brand-indriver-foreground" },
  particular: { label: "Particular", colorClass: "bg-brand-particular text-brand-particular-foreground", badgeClass: "bg-brand-particular text-brand-particular-foreground" },
};

export type ExpenseCategory = "combustivel" | "alimentacao" | "manutencao" | "outros";

export const EXPENSE_META: Record<ExpenseCategory, { label: string }> = {
  combustivel: { label: "Combustível" },
  alimentacao: { label: "Alimentação" },
  manutencao: { label: "Manutenção" },
  outros: { label: "Outros" },
};

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

export interface Settings {
  dailyGoal: number;
  maintenanceIntervalKm: number;
  lastMaintenanceKm: number;
  theme: "light" | "dark";
}
