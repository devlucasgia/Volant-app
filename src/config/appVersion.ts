// Versão exibida no modal de atualização. Editar a cada release relevante.
// Independente de src/config/version.ts (que alimenta o rodapé semver).

export const APP_VERSION = "1.5";

export const RELEASE_NOTES: { title: string; bullets: string[] } = {
  title: "O Volant ficou melhor",
  bullets: [
    "Planejamento Inteligente redesenhado",
    "Nova tela de Relatórios",
    "Insights Inteligentes",
    "Lance ganhos de várias plataformas de uma vez",
  ],
};

export const APP_VERSION_STORAGE_KEY = "volant_app_version";
