import { Smartphone, Brain, type LucideIcon } from "lucide-react";
import type { FirstStepKey } from "@/lib/firstSteps";

// Fonte da verdade dos vídeos tutoriais da Central de Tutoriais.
// Adicionar um novo vídeo = adicionar um objeto em TUTORIAL_VIDEOS.

export type TutorialSectionKey = "comece" | "funcoes";


export type TutorialOrientation = "landscape" | "portrait";

export interface TutorialVideo {
  id: string;
  section: TutorialSectionKey;
  title: string;
  description?: string;
  youtubeId: string;
  /** afeta SÓ o player (portrait abre estreito). A thumb é sempre banner 16/7.5. */
  orientation: TutorialOrientation;
  durationLabel: string; // ex: "0:49", "5:26"
  /** ícone usado como marca d'água na thumbnail. */
  Icon: LucideIcon;
  firstStep?: FirstStepKey; // futuro (Sprint 2)
}

export interface TutorialSection {
  key: TutorialSectionKey;
  title: string;
}

export const TUTORIAL_SECTIONS: TutorialSection[] = [
  { key: "comece", title: "Comece por aqui" },
  { key: "funcoes", title: "Aprenda cada função" },
];

export const TUTORIAL_VIDEOS: TutorialVideo[] = [
  {
    id: "install-android",
    section: "comece",
    title: "Como instalar o Volant no Android",
    description: "Adicione o app à tela inicial em poucos toques.",
    youtubeId: "8iBQwbRZZyw", // Short real — NÃO trocar
    orientation: "portrait",
    durationLabel: "0:49",
    Icon: Smartphone,
  },
  {
    id: "planejamento-inteligente",
    section: "funcoes",
    title: "Planejamento Inteligente",
    description: "Como definir sua meta, custos e ver quanto rodar por dia.",
    youtubeId: "Pq8LPSFkG9o", // vídeo real — NÃO trocar
    orientation: "landscape",
    durationLabel: "5:26",
    Icon: Brain,
    firstStep: "planning",
  },
];

export function videosBySection(key: TutorialSectionKey): TutorialVideo[] {
  return TUTORIAL_VIDEOS.filter((v) => v.section === key);
}

/** Vídeo mapeado pra uma tarefa do Primeiros Passos, se existir. */
export function videoForFirstStep(key: FirstStepKey): TutorialVideo | undefined {
  return TUTORIAL_VIDEOS.find((v) => v.firstStep === key);
}

