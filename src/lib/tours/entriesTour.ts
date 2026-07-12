import type { TourStep } from "@/context/TourContext";

/**
 * Tour de registros — 8 passos.
 * O FAB `+` abre um menu radial (não o drawer direto), então precisamos de um passo
 * intermediário pra apontar pro botão "Novo ganho"/"Novo gasto".
 */
export const entriesTourSteps: TourStep[] = [
  // 1. Home: aponta pro +, espera o menu radial abrir
  {
    target: '[data-tour="fab-new-entry"]',
    title: "Bora lançar seu primeiro ganho",
    body: "Toca no + pra começar.",
    advance: "action",
    actionId: "open-fab-menu",
    placement: "top",
  },
  // 2. Menu aberto: aponta pro "Novo ganho", espera abrir o drawer
  {
    target: '[data-tour="fab-earning"]',
    title: "Escolhe Novo ganho",
    body: "Toca em Novo ganho pra registrar quanto você fez.",
    advance: "action",
    actionId: "open-entry-drawer",
    placement: "top",
  },
  // 3. Drawer ganho: explica o valor (informativo)
  {
    target: '[data-tour="entry-earning-value"]',
    title: "Quanto você recebeu",
    body: "Aqui você digita o valor de cada app. Dá pra somar mais de uma plataforma.",
    advance: "next",
    placement: "top",
  },
  // 4. Drawer ganho: aponta pro Salvar, espera salvar
  {
    target: '[data-tour="entry-save"]',
    title: "Salva e pronto",
    body: "Preenche o valor e toca em Salvar. Seus números aparecem na Home na hora.",
    advance: "action",
    actionId: "saved-earning",
    placement: "top",
  },
  // 5. Home de novo: aponta pro +, espera abrir o menu
  {
    target: '[data-tour="fab-new-entry"]',
    title: "Agora um gasto",
    body: "Mesma coisa pros gastos. Toca no + de novo.",
    advance: "action",
    actionId: "open-fab-menu",
    placement: "top",
  },
  // 6. Menu aberto: aponta pro "Novo gasto"
  {
    target: '[data-tour="fab-expense"]',
    title: "Escolhe Novo gasto",
    body: "Combustível, comida, o que sair do bolso. Toca em Novo gasto.",
    advance: "action",
    actionId: "open-entry-drawer",
    placement: "top",
  },
  // 7. Drawer gasto: aponta pro Salvar, espera salvar
  {
    target: '[data-tour="entry-save"]',
    title: "Salva o gasto",
    body: "Registra o valor e toca em Salvar. Isso deixa seu lucro real certinho.",
    advance: "action",
    actionId: "saved-expense",
    placement: "top",
  },
  // 8. Conclusão
  {
    target: '[data-tour="fab-new-entry"]',
    title: "Prontinho!",
    body: "Você já sabe lançar ganhos e gastos. É isso que mantém seus números no ponto.",
    advance: "next",
    placement: "top",
  },
];
