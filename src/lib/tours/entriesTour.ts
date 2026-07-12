import type { TourStep } from "@/context/TourContext";

/**
 * Tour de registros — 6 passos.
 * Passos informativos usam `advance: "next"` (botão Próximo).
 * Só passos com ação real e detectável usam `advance: "action"`.
 */
export const entriesTourSteps: TourStep[] = [
  // 1. Home: aponta pro +, espera abrir o drawer
  {
    target: '[data-tour="fab-new-entry"]',
    title: "Bora lançar seu primeiro ganho",
    body: "Toca no + e escolhe Ganho pra registrar quanto você fez hoje.",
    advance: "action",
    actionId: "open-entry-drawer",
    placement: "top",
  },
  // 2. Drawer ganho: explica o campo (informativo)
  {
    target: '[data-tour="entry-earning-value"]',
    title: "Quanto você recebeu",
    body: "Aqui você digita o valor de cada app. Dá pra somar mais de uma plataforma.",
    advance: "next",
    placement: "top",
  },
  // 3. Drawer ganho: aponta pro Salvar, espera salvar
  {
    target: '[data-tour="entry-save"]',
    title: "Salva e pronto",
    body: "Preenche o valor e toca em Salvar. Seus números aparecem na Home na hora.",
    advance: "action",
    actionId: "saved-earning",
    placement: "top",
  },
  // 4. Home de novo: aponta pro +, espera abrir de novo (agora pro gasto)
  {
    target: '[data-tour="fab-new-entry"]',
    title: "Agora um gasto",
    body: "Mesma coisa pros gastos: combustível, comida, o que sair do bolso. Toca no + e escolhe Gasto.",
    advance: "action",
    actionId: "open-entry-drawer",
    placement: "top",
  },
  // 5. Drawer gasto: aponta pro Salvar, espera salvar o gasto
  {
    target: '[data-tour="entry-save"]',
    title: "Salva o gasto",
    body: "Registra o valor do gasto e toca em Salvar. Isso deixa seu lucro real certinho.",
    advance: "action",
    actionId: "saved-expense",
    placement: "top",
  },
  // 6. Conclusão (informativo)
  {
    target: '[data-tour="fab-new-entry"]',
    title: "Prontinho!",
    body: "Você já sabe lançar ganhos e gastos. É isso que mantém seus números no ponto.",
    advance: "next",
    placement: "top",
  },
];
