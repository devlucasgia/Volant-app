import type { TourStep } from "@/context/TourContext";

/**
 * Tour de Ganhos — 9 passos.
 * Ensina o usuário a preencher horas → KM → valores/corridas → adicionar plataforma
 * → salvar → e a interagir com o herói (Bruto ↔ Líquido) na Home.
 */
export const earningsTourSteps: TourStep[] = [
  {
    target: '[data-tour="fab-new-entry"]',
    title: "Bora registrar seu primeiro ganho",
    body: "Toca no + pra começar.",
    advance: "action",
    actionId: "open-fab-menu",
    placement: "top",
  },
  {
    target: '[data-tour="fab-earning"]',
    title: "Escolhe Novo ganho",
    body: "Toca aqui pra abrir o formulário.",
    advance: "action",
    actionId: "open-entry-drawer",
    placement: "top",
  },
  {
    target: '[data-tour="entry-hours"]',
    title: "Horas trabalhadas",
    body: "Gira a roda pra registrar quanto tempo você rodou. Depois toca em Próximo.",
    advance: "next",
    placement: "bottom",
  },
  {
    target: '[data-tour="entry-km"]',
    title: "Quilometragem do dia",
    body: "Registra o KM total ou informa o inicial e o final.",
    advance: "next",
    placement: "bottom",
  },
  {
    target: '[data-tour="entry-earning-value"]',
    title: "Valor e corridas por app",
    body: "Preencha valor e número de corridas em cada plataforma que você usou.",
    advance: "next",
    placement: "top",
  },
  {
    target: '[data-tour="entry-add-platform"]',
    title: "Rodou em outro app?",
    body: "Toca aqui pra somar outra plataforma — ou pra criar uma nova.",
    advance: "next",
    placement: "top",
  },
  {
    target: '[data-tour="entry-save"]',
    title: "Salva e pronto",
    body: "Confere os dados e toca em Salvar. Seus números aparecem na Home na hora.",
    advance: "action",
    actionId: "saved-earning",
    placement: "top",
  },
  {
    target: '[data-tour="hero-metric"]',
    title: "Seu ganho já está aqui",
    body: "Toca no chip Bruto/Líquido pra alternar entre faturamento e lucro real.",
    advance: "action",
    actionId: "toggle-hero",
    placement: "bottom",
  },
  {
    target: '[data-tour="hero-metric"]',
    title: "Prontinho!",
    body: "Você registrou seu primeiro ganho e viu o impacto na Home. Bora ver os gastos agora.",
    advance: "next",
    placement: "bottom",
  },
];
