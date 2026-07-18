import type { TourStep } from "@/context/TourContext";

/**
 * Tour de Gastos — 6 passos.
 * Ensina a abrir o menu radial → escolher Novo gasto → categoria → valor →
 * salvar → e a ver a distribuição em "Ganhos e gastos" na Home.
 */
export const expensesTourSteps: TourStep[] = [
  {
    target: '[data-tour="fab-new-entry"]',
    title: "Agora um gasto",
    body: "Toca no + de novo.",
    icon: "🧾",
    hint: "Toca no +",
    advance: "action",
    actionId: "open-fab-menu",
    placement: "top",
  },
  {
    target: '[data-tour="fab-expense"]',
    title: "Escolhe Novo gasto",
    body: "Combustível, comida, o que sair do bolso — toca em Novo gasto.",
    icon: "💸",
    hint: "Escolhe Novo gasto",
    advance: "action",
    actionId: "open-entry-drawer",
    placement: "top",
  },
  {
    target: '[data-tour="entry-expense-category"]',
    title: "Categoria do gasto",
    body: "Todo gasto entra numa categoria. Toca aqui pra ver as opções.",
    icon: "🏷️",
    hint: "Abre as categorias",
    advance: "action",
    actionId: "opened-expense-category",
    placement: "bottom",
  },
  {
    target: '[data-tour="entry-expense-category-list"]',
    title: "Escolhe onde encaixa",
    body: "Combustível, alimentação, manutenção... escolhe a que combina com esse gasto.",
    icon: "🏷️",
    hint: "Toca numa categoria",
    advance: "action",
    actionId: "selected-expense-category",
    placement: "bottom",
  },
  {
    target: '[data-tour="entry-expense-value"]',
    title: "Valor do gasto",
    body: "Digita quanto saiu do bolso.",
    icon: "💸",
    hint: "Digita o valor",
    advance: "action",
    actionId: "filled-expense-value",
    placement: "top",
  },
  {
    target: '[data-tour="entry-save"]',
    title: "Salva o gasto",
    body: "Isso mantém seu lucro real certinho.",
    icon: "✅",
    hint: "Toca em Salvar",
    advance: "action",
    actionId: "saved-expense",
    placement: "top",
  },
  {
    target: '[data-tour="home-earnings-expenses"]',
    title: "Ganhos e gastos na Home",
    body: "Seus ganhos por app e seus gastos por categoria aparecem aqui, atualizados a cada registro.",
    icon: "🔄",
    advance: "next",
    placement: "top",
  },
];
