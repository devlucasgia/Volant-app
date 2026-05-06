export type AppName = "uber" | "99" | "indriver" | "particular";

export const APP_META: Record<AppName, { label: string; colorClass: string; badgeClass: string }> = {
  uber: { label: "Uber", colorClass: "bg-brand-uber text-brand-uber-foreground", badgeClass: "bg-brand-uber text-brand-uber-foreground" },
  "99": { label: "99", colorClass: "bg-brand-99 text-brand-99-foreground", badgeClass: "bg-brand-99 text-brand-99-foreground" },
  indriver: { label: "inDriver", colorClass: "bg-brand-indriver text-brand-indriver-foreground", badgeClass: "bg-brand-indriver text-brand-indriver-foreground" },
  particular: { label: "Particular", colorClass: "bg-brand-particular text-brand-particular-foreground", badgeClass: "bg-brand-particular text-brand-particular-foreground" },
};

export type ExpenseCategory = "combustivel" | "alimentacao" | "manutencao" | "outros";

import { Fuel, UtensilsCrossed, Wrench, Package, type LucideIcon } from "lucide-react";

export const EXPENSE_META: Record<ExpenseCategory, { label: string; icon: LucideIcon; hex: string }> = {
  combustivel: { label: "Combustível", icon: Fuel, hex: "#F59E0B" },
  alimentacao: { label: "Alimentação", icon: UtensilsCrossed, hex: "#EF4444" },
  manutencao: { label: "Manutenção", icon: Wrench, hex: "#3B82F6" },
  outros: { label: "Outros", icon: Package, hex: "#8B5CF6" },
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
