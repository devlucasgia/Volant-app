import type { TourStep } from "@/context/TourContext";

/**
 * Tour de Gastos — 6 passos.
 * Ensina a abrir o menu radial → escolher Novo gasto → categoria → valor →
 * salvar → e a ver a distribuição em "Por gastos" na Home.
 */
export const expensesTourSteps: TourStep[] = [
  {
    target: '[data-tour="fab-new-entry"]',
    title: "Agora um gasto",
    body: "Toca no + de novo.",
    advance: "action",
    actionId: "open-fab-menu",
    placement: "top",
  },
  {
    target: '[data-tour="fab-expense"]',
    title: "Escolhe Novo gasto",
    body: "Combustível, comida, o que sair do bolso — toca em Novo gasto.",
    advance: "action",
    actionId: "open-entry-drawer",
    placement: "top",
  },
  {
    target: '[data-tour="entry-expense-category"]',
    title: "Categoria do gasto",
    body: "Escolhe onde encaixa: combustível, manutenção, alimentação, e por aí vai.",
    advance: "action",
    actionId: "selected-expense-category",
    placement: "bottom",
  },
  {
    target: '[data-tour="entry-expense-value"]',
    title: "Valor do gasto",
    body: "Digita quanto saiu do bolso.",
    advance: "action",
    actionId: "filled-expense-value",
    placement: "top",
  },
  {
    target: '[data-tour="entry-save"]',
    title: "Salva o gasto",
    body: "Isso mantém seu lucro real certinho.",
    advance: "action",
    actionId: "saved-expense",
    placement: "top",
  },
  {
    target: '[data-tour="home-expenses-section"]',
    title: "Por gastos",
    body: "Seu gasto entrou aqui. Você vê como fica distribuído por categoria em cada período.",
    advance: "next",
    placement: "top",
  },
];
