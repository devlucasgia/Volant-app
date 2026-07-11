import type { TourStep } from "@/context/TourContext";

/**
 * Tour de registros — 6 passos.
 * Espera as ações reais nos passos 1-5 (open-entry-drawer, saved-earning, saved-expense).
 * Último passo é informativo com botão "Concluir".
 */
export const entriesTourSteps: TourStep[] = [
  {
    target: '[data-tour="fab-new-entry"]',
    title: "Bora lançar seu primeiro ganho",
    body: "Toca no + pra registrar quanto você fez hoje.",
    advance: "action",
    actionId: "open-entry-drawer",
    placement: "top",
  },
  {
    target: '[data-tour="entry-earning-value"]',
    title: "Quanto você recebeu",
    body: "Digita o valor que ganhou na plataforma. Dá pra somar mais de um app.",
    advance: "action",
    actionId: "saved-earning",
    placement: "top",
  },
  {
    target: '[data-tour="entry-save"]',
    title: "Salva e pronto",
    body: "Toca em Salvar pra registrar. Seus números aparecem na Home na hora.",
    advance: "action",
    actionId: "saved-earning",
    placement: "top",
  },
  {
    target: '[data-tour="fab-new-entry"]',
    title: "Agora um gasto",
    body: "Mesma coisa pros gastos: combustível, comida, o que sair do bolso. Toca no + e escolhe Gasto.",
    advance: "action",
    actionId: "open-entry-drawer",
    placement: "top",
  },
  {
    target: '[data-tour="entry-expense-value"]',
    title: "Quanto gastou",
    body: "Registra o valor do gasto. Isso deixa seu lucro real certinho.",
    advance: "action",
    actionId: "saved-expense",
    placement: "top",
  },
  {
    target: '[data-tour="fab-new-entry"]',
    title: "Prontinho!",
    body: "Você já sabe lançar ganhos e gastos. É isso que mantém seus números no ponto.",
    advance: "next",
    placement: "top",
  },
];
