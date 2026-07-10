import type { Entry } from "@/types";
import type { PlanningStatus } from "@/types";

export type FirstStepKey = "planning" | "entries" | "personalize" | "export";

export interface FirstStepTask {
  key: FirstStepKey;
  label: string;
  done: boolean;
  route?: string;
  action?: "openEntryDrawer";
}

export interface FirstStepsInput {
  planningStatus: PlanningStatus | null | undefined;
  entries: Entry[];
  fsPersonalized: boolean;
  fsExported: boolean;
}

export function computeFirstSteps(input: FirstStepsInput): FirstStepTask[] {
  const hasEarning = input.entries.some((e) => e.type === "earning");
  const hasExpense = input.entries.some((e) => e.type === "expense");

  return [
    {
      key: "planning",
      label: "Montar seu Planejamento Inteligente",
      done: input.planningStatus === "configured",
      route: "/ajustes/planejamento",
    },
    {
      key: "entries",
      label: "Lançar seus primeiros registros",
      done: hasEarning && hasExpense,
      action: "openEntryDrawer",
    },
    {
      key: "personalize",
      label: "Personalizar a Home",
      done: input.fsPersonalized,
      route: "/ajustes/personalizacao/cards",
    },
    {
      key: "export",
      label: "Exportar um relatório",
      done: input.fsExported,
      route: "/relatorios",
    },
  ];
}

export function firstStepsProgress(tasks: FirstStepTask[]) {
  const done = tasks.filter((t) => t.done).length;
  const total = tasks.length;
  return { done, total, allDone: done === total };
}
