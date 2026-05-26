/**
 * Central de Notificações — persistência leve em localStorage por usuário.
 * Sem novas tabelas no banco. Cada usuário tem sua própria lista isolada.
 *
 * v2: novo shape com `category`, `iconType`, `summary`, `content` e
 * marcação de leitura individual (não mais ao abrir o sheet).
 */

const EVENT = "volant:notificationsChanged";
const STORAGE_PREFIX = "volant.notifications.v2.";

export type NotificationCategory = "sistema" | "premium" | "planejamento" | "veiculo";
export type NotificationIcon = "volant" | "premium" | "planning" | "vehicle-costs";

export interface NotificationCta {
  label: string;
  /** External URL (opens in new tab). */
  url?: string;
  /** Internal route — handled by the sheet via navigate(). */
  route?: string;
}

export interface AppNotification {
  id: string;
  category: NotificationCategory;
  iconType: NotificationIcon;
  title: string;
  /** Short text shown in the list. */
  summary: string;
  /** Long body shown in the detail view. */
  content: string;
  topics?: { title: string; desc: string }[];
  cta?: NotificationCta;
  createdAt: number;
  readAt: number | null;
}

export const CATEGORY_LABEL: Record<NotificationCategory, string> = {
  sistema: "Sistema",
  premium: "Premium",
  planejamento: "Planejamento",
  veiculo: "Veículo",
};

// ---------- IDs (dedupe keys) ----------
export const WELCOME_NOTIFICATION_ID = "general_welcome_group_notification";
export const PREMIUM_WELCOME_NOTIFICATION_ID = "premium_welcome_notification";
export const PLANNING_INCOMPLETE_NOTIFICATION_ID = "planning_incomplete_notification";
export const VEHICLE_COSTS_MISSING_NOTIFICATION_ID = "vehicle_costs_missing_notification";

const ACCOUNT_AGE_DELAY_MS = 30 * 60 * 1000; // 30 minutos

// ---------- Storage primitives ----------
function storageKey(userId: string) {
  return `${STORAGE_PREFIX}${userId}`;
}

function read(userId: string): AppNotification[] {
  if (!userId || typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(storageKey(userId));
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? (arr as AppNotification[]) : [];
  } catch {
    return [];
  }
}

function write(userId: string, items: AppNotification[]) {
  try {
    window.localStorage.setItem(storageKey(userId), JSON.stringify(items));
    window.dispatchEvent(new Event(EVENT));
  } catch {
    /* ignore */
  }
}

// ---------- Public API ----------
export function listNotifications(userId: string): AppNotification[] {
  // Mais recente primeiro.
  return read(userId).slice().sort((a, b) => b.createdAt - a.createdAt);
}

export function unreadCount(userId: string): number {
  return read(userId).filter((n) => !n.readAt).length;
}

export function markAsRead(userId: string, id: string) {
  if (!userId || !id) return;
  const items = read(userId);
  const target = items.find((n) => n.id === id);
  if (!target || target.readAt) return;
  target.readAt = Date.now();
  write(userId, items);
}

/**
 * Helper genérico: cria uma notificação se ainda não existir e a condição
 * for satisfeita. Idempotente — chamadas repetidas não duplicam, e uma
 * notificação já lida não é recriada se a condição voltar a ser verdadeira.
 */
function ensureNotification(
  userId: string,
  template: Omit<AppNotification, "createdAt" | "readAt">,
  condition: () => boolean,
) {
  if (!userId) return;
  const items = read(userId);
  if (items.some((n) => n.id === template.id)) return;
  if (!condition()) return;
  const notif: AppNotification = { ...template, createdAt: Date.now(), readAt: null };
  write(userId, [...items, notif]);
}

function accountIsOldEnough(accountCreatedAt: string | number | Date | null | undefined) {
  if (!accountCreatedAt) return false;
  const ms =
    typeof accountCreatedAt === "number" ? accountCreatedAt : new Date(accountCreatedAt).getTime();
  if (!Number.isFinite(ms)) return false;
  return Date.now() - ms >= ACCOUNT_AGE_DELAY_MS;
}

// ---------- Templates ----------
const WELCOME_TEMPLATE: Omit<AppNotification, "createdAt" | "readAt"> = {
  id: WELCOME_NOTIFICATION_ID,
  category: "sistema",
  iconType: "volant",
  title: "Bem-vindo ao Volant",
  summary: "Conheça as principais ferramentas e entre no grupo oficial.",
  content:
    "O Volant foi criado para ajudar motoristas de aplicativo a entender melhor seus ganhos, gastos, metas, desempenho e R$/km. Use as ferramentas do app para acompanhar sua rotina com mais clareza e tomar decisões melhores no dia a dia.",
  topics: [
    { title: "Metas Inteligentes", desc: "Acompanhe sua evolução pelo lucro líquido ou ganho bruto." },
    { title: "KM Inteligente", desc: "Veja uma referência de R$/km para rodar com mais estratégia." },
    { title: "Relatórios e Histórico", desc: "Entenda seus ganhos, gastos, KM, horas e desempenho por período." },
    { title: "Central de Veículos", desc: "Considere custos, manutenção e informações do veículo na sua rotina." },
  ],
  cta: {
    label: "Entrar no grupo oficial",
    url: "https://chat.whatsapp.com/LkXphgSVRg53rOVQmBEcP7?s=cl&p=a&mlu=3",
  },
};

const PREMIUM_WELCOME_TEMPLATE: Omit<AppNotification, "createdAt" | "readAt"> = {
  id: PREMIUM_WELCOME_NOTIFICATION_ID,
  category: "premium",
  iconType: "premium",
  title: "Seu Premium está ativo",
  summary: "Conheça os recursos liberados para acompanhar sua rotina com mais inteligência.",
  content:
    "Agora você tem acesso aos recursos completos do Volant para acompanhar sua rotina com mais clareza, estratégia e controle.",
  topics: [
    {
      title: "Metas Inteligentes",
      desc: "Defina sua meta mensal, escolha acompanhar por lucro líquido ou ganho bruto e veja quanto falta para chegar lá.",
    },
    {
      title: "KM Inteligente",
      desc: "Use uma referência de R$/km para entender melhor quais corridas fazem sentido para sua rotina.",
    },
    {
      title: "Relatórios completos",
      desc: "Acompanhe ganhos, gastos, dias ativos, KM, horas, corridas e desempenho por período.",
    },
    {
      title: "Central de Veículos",
      desc: "Cadastre veículo, custos e manutenções para deixar seus cálculos mais próximos da realidade.",
    },
    {
      title: "Personalização",
      desc: "Ajuste aparência, saudação e organização dos cards para deixar o app do seu jeito.",
    },
  ],
  cta: { label: "Explorar recursos", route: "/app" },
};

const PLANNING_INCOMPLETE_TEMPLATE: Omit<AppNotification, "createdAt" | "readAt"> = {
  id: PLANNING_INCOMPLETE_NOTIFICATION_ID,
  category: "planejamento",
  iconType: "planning",
  title: "Complete seu planejamento",
  summary: "Configure sua meta e KM planejado para receber cálculos mais úteis.",
  content:
    "O Volant fica mais inteligente quando entende sua meta, seus dias de trabalho e a quantidade de KM que você pretende rodar no mês. Com esses dados, o app consegue mostrar melhor sua evolução, calcular referências de R$/km e indicar quanto falta para bater sua meta.",
  cta: { label: "Configurar planejamento", route: "/ajustes/planejamento" },
};

const VEHICLE_COSTS_MISSING_TEMPLATE: Omit<AppNotification, "createdAt" | "readAt"> = {
  id: VEHICLE_COSTS_MISSING_NOTIFICATION_ID,
  category: "veiculo",
  iconType: "vehicle-costs",
  title: "Cadastre os custos do veículo",
  summary: "Custos como IPVA, óleo, pneus e manutenção deixam seus cálculos mais reais.",
  content:
    "Para entender melhor quanto realmente sobra, o Volant pode considerar custos do seu veículo nos cálculos. Você pode cadastrar gastos como IPVA, seguro, óleo, pneus, manutenção e outros custos que fazem parte da sua rotina.",
  cta: { label: "Cadastrar custos", route: "/ajustes/veiculos/custos" },
};

// ---------- Ensure helpers ----------
export function ensureWelcomeNotification(
  userId: string | null | undefined,
  accountCreatedAt: string | number | Date | null | undefined,
) {
  if (!userId) return;
  ensureNotification(userId, WELCOME_TEMPLATE, () => accountIsOldEnough(accountCreatedAt));
}

export function ensurePremiumWelcomeNotification(
  userId: string | null | undefined,
  isPaidPremium: boolean,
) {
  if (!userId) return;
  ensureNotification(userId, PREMIUM_WELCOME_TEMPLATE, () => isPaidPremium === true);
}

export interface PlanningSnapshot {
  monthlyGoal: number | null | undefined;
  kmPlannedMonth: number | null | undefined;
  workingDaysPerMonth: number | null | undefined;
}

export function ensurePlanningIncompleteNotification(
  userId: string | null | undefined,
  accountCreatedAt: string | number | Date | null | undefined,
  planning: PlanningSnapshot | null | undefined,
) {
  if (!userId) return;
  ensureNotification(userId, PLANNING_INCOMPLETE_TEMPLATE, () => {
    if (!accountIsOldEnough(accountCreatedAt)) return false;
    if (!planning) return true;
    const goalEmpty = !planning.monthlyGoal || planning.monthlyGoal <= 0;
    const kmEmpty = planning.kmPlannedMonth == null || planning.kmPlannedMonth <= 0;
    const daysEmpty = planning.workingDaysPerMonth == null;
    return goalEmpty || kmEmpty || daysEmpty;
  });
}

export interface VehicleCostsSnapshot {
  rental_weekly?: number | null;
  financing_monthly?: number | null;
  insurance_monthly?: number | null;
  ipva_yearly?: number | null;
  oil_change_cost?: number | null;
  tires_cost?: number | null;
  other_monthly_costs?: number | null;
}

export function ensureVehicleCostsMissingNotification(
  userId: string | null | undefined,
  accountCreatedAt: string | number | Date | null | undefined,
  cars: VehicleCostsSnapshot[] | null | undefined,
) {
  if (!userId) return;
  ensureNotification(userId, VEHICLE_COSTS_MISSING_TEMPLATE, () => {
    if (!accountIsOldEnough(accountCreatedAt)) return false;
    if (!cars || cars.length === 0) return true;
    const hasAnyCost = cars.some((c) =>
      [
        c.rental_weekly,
        c.financing_monthly,
        c.insurance_monthly,
        c.ipva_yearly,
        c.oil_change_cost,
        c.tires_cost,
        c.other_monthly_costs,
      ].some((v) => typeof v === "number" && v > 0),
    );
    return !hasAnyCost;
  });
}

export const NOTIFICATIONS_EVENT = EVENT;
