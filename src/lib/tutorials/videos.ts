// Fonte da verdade dos vídeos tutoriais da Central de Tutoriais.
// Adicionar um novo vídeo = adicionar um objeto aqui.

export type TutorialSectionKey = "instalacao" | "planejamento" | "uso_diario";

// Prep p/ Sprint 2 (chip nos Primeiros Passos). Não usado agora.
export type FirstStepKey =
  | "install"
  | "personalize"
  | "entry"
  | "history"
  | "export";

export type TutorialOrientation = "landscape" | "portrait";

export interface TutorialVideo {
  id: string;
  section: TutorialSectionKey;
  title: string;
  description?: string;
  youtubeId: string;
  orientation: TutorialOrientation;
  durationLabel: string; // ex: "0:38", "2:14"
  firstStep?: FirstStepKey; // futuro (Sprint 2)
}

export interface TutorialSection {
  key: TutorialSectionKey;
  title: string;
  description?: string;
}

export const TUTORIAL_SECTIONS: TutorialSection[] = [
  {
    key: "instalacao",
    title: "Instalação e primeiros passos",
    description: "Deixe o Volant sempre à mão no seu celular.",
  },
  {
    key: "planejamento",
    title: "Planejamento inteligente",
    description: "Descubra quanto rodar por dia para bater sua meta.",
  },
  {
    key: "uso_diario",
    title: "Uso diário",
    description: "Registre ganhos, gastos e acompanhe sua performance.",
  },
];

export const TUTORIAL_VIDEOS: TutorialVideo[] = [
  {
    id: "install-android",
    section: "instalacao",
    title: "Como instalar o Volant no Android",
    description: "Adicione o app à tela inicial em poucos toques.",
    youtubeId: "dQw4w9WgXcQ", // placeholder — trocar pelo Short real
    orientation: "portrait",
    durationLabel: "0:38",
    firstStep: "install",
  },
  {
    id: "planejamento-inteligente",
    section: "planejamento",
    title: "Planejamento Inteligente",
    description: "Como definir sua meta, custos e ver quanto rodar por dia.",
    youtubeId: "dQw4w9WgXcQ", // placeholder — trocar pelo vídeo real
    orientation: "landscape",
    durationLabel: "2:14",
  },
];

export function videosBySection(key: TutorialSectionKey): TutorialVideo[] {
  return TUTORIAL_VIDEOS.filter((v) => v.section === key);
}
