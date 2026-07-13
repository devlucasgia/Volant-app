import type { Entry } from "@/types";
import type { PlanningStatus } from "@/types";

export type FirstStepKey =
  | "earnings"
  | "expenses"
  | "history"
  | "planning"
  | "export"
  | "personalize";

export type FirstStepAction =
  | "openEntryDrawer"
  | "startEarningsTour"
  | "startExpensesTour";

export interface FirstStepTask {
  key: FirstStepKey;
  label: string;
  done: boolean;
  route?: string;
  action?: FirstStepAction;
}

export interface FirstStepsInput {
  planningStatus: PlanningStatus | null | undefined;
  entries: Entry[];
  fsPersonalized: boolean;
  fsExported: boolean;
  fsHistoryVisited: boolean;
}

export function computeFirstSteps(input: FirstStepsInput): FirstStepTask[] {
  const hasEarning = input.entries.some((e) => e.type === "earning");
  const hasExpense = input.entries.some((e) => e.type === "expense");

  return [
    {
      key: "earnings",
      label: "Aprender a registrar ganhos",
      done: hasEarning,
      action: "startEarningsTour",
    },
    {
      key: "expenses",
      label: "Aprender a registrar gastos",
      done: hasExpense,
      action: "startExpensesTour",
    },
    {
      key: "history",
      label: "Aprender sobre o histórico",
      done: input.fsHistoryVisited,
      route: "/historico",
    },
    {
      key: "planning",
      label: "Montar seu Planejamento Inteligente",
      done: input.planningStatus === "configured",
      route: "/ajustes/planejamento",
    },
    {
      key: "export",
      label: "Exportar um relatório",
      done: input.fsExported,
      route: "/relatorios",
    },
    {
      key: "personalize",
      label: "Personalizar a Home",
      done: input.fsPersonalized,
      route: "/ajustes/personalizacao/cards",
    },
  ];
}

export function firstStepsProgress(tasks: FirstStepTask[]) {
  const done = tasks.filter((t) => t.done).length;
  const total = tasks.length;
  return { done, total, allDone: done === total };
}
