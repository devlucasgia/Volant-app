/**
 * Central de Notificações — persistência leve em localStorage por usuário.
 * Sem novas tabelas no banco. Cada usuário tem sua própria lista isolada.
 *
 * v2.1: storage agora guarda `{ items, dismissedIds }`. `dismissedIds`
 * funciona como dedupe permanente — uma vez limpa, a notificação não é
 * recriada automaticamente.
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

export type NotificationTone = "default" | "warning" | "alert";

export interface AppNotification {
  id: string;
  category: NotificationCategory;
  iconType: NotificationIcon;
  /** Tom visual (default herda categoria; "alert" pinta tudo em vermelho). */
  tone?: NotificationTone;
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

interface StoredState {
  items: AppNotification[];
  dismissedIds: string[];
}

export const CATEGORY_LABEL: Record<NotificationCategory, string> = {
  sistema: "Sistema",
  premium: "Premium",
  planejamento: "Planejamento",
  veiculo: "Veículo",
};

// ---------- IDs (dedupe keys) ----------
export const WELCOME_NOTIFICATION_ID = "general_welcome_group_notification_v2";
/** IDs descontinuados — removidos automaticamente da lista no próximo read. */
const DEPRECATED_NOTIFICATION_IDS = new Set<string>([
  "general_welcome_group_notification",
]);
export const PREMIUM_WELCOME_NOTIFICATION_ID = "premium_welcome_notification";
export const PLANNING_INCOMPLETE_NOTIFICATION_ID = "planning_incomplete_notification";
export const VEHICLE_COSTS_MISSING_NOTIFICATION_ID = "vehicle_costs_missing_notification";

const ACCOUNT_AGE_DELAY_MS = 30 * 60 * 1000; // 30 minutos

// ---------- Storage primitives ----------
function storageKey(userId: string) {
  return `${STORAGE_PREFIX}${userId}`;
}

function read(userId: string): StoredState {
  const empty: StoredState = { items: [], dismissedIds: [] };
  if (!userId || typeof window === "undefined") return empty;
  try {
    const raw = window.localStorage.getItem(storageKey(userId));
    if (!raw) return empty;
    const parsed = JSON.parse(raw);
    // Back-compat: storage anterior era um array puro.
    let items: AppNotification[] = Array.isArray(parsed)
      ? (parsed as AppNotification[])
      : Array.isArray(parsed?.items)
        ? parsed.items
        : [];
    const dismissedIds: string[] = Array.isArray(parsed?.dismissedIds)
      ? parsed.dismissedIds
      : [];
    // Remove notificações com IDs descontinuados (ex.: bump de template).
    items = items.filter((n) => !DEPRECATED_NOTIFICATION_IDS.has(n.id));
    return { items, dismissedIds };
  } catch {
    return empty;
  }
}

function write(userId: string, state: StoredState) {
  try {
    window.localStorage.setItem(storageKey(userId), JSON.stringify(state));
    window.dispatchEvent(new Event(EVENT));
  } catch {
    /* ignore */
  }
}

// ---------- Public API ----------
export function listNotifications(userId: string): AppNotification[] {
  return read(userId).items.slice().sort((a, b) => b.createdAt - a.createdAt);
}

export function unreadCount(userId: string): number {
  return read(userId).items.filter((n) => !n.readAt).length;
}

export function markAsRead(userId: string, id: string) {
  if (!userId || !id) return;
  const state = read(userId);
  const target = state.items.find((n) => n.id === id);
  if (!target || target.readAt) return;
  target.readAt = Date.now();
  write(userId, state);
}

export function clearAllNotifications(userId: string) {
  if (!userId) return;
  const state = read(userId);
  if (state.items.length === 0) return;
  const dismissed = new Set([...state.dismissedIds, ...state.items.map((n) => n.id)]);
  write(userId, { items: [], dismissedIds: Array.from(dismissed) });
}

/**
 * Helper genérico: cria uma notificação se ainda não existir, se não foi
 * descartada anteriormente e se a condição for satisfeita.
 */
function ensureNotification(
  userId: string,
  template: Omit<AppNotification, "createdAt" | "readAt">,
  condition: () => boolean,
) {
  if (!userId) return;
  const state = read(userId);
  if (state.dismissedIds.includes(template.id)) return;
  if (state.items.some((n) => n.id === template.id)) return;
  if (!condition()) return;
  const notif: AppNotification = { ...template, createdAt: Date.now(), readAt: null };
  write(userId, { ...state, items: [...state.items, notif] });
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
  summary: "Entre no grupo oficial e acompanhe as novidades da versão 1.0.",
  content:
    "O Volant está entrando em uma nova fase. A versão 1.0 foi criada para ajudar motoristas de aplicativo a acompanhar ganhos, gastos, metas, R$/km e custos do veículo com mais clareza.\n\nEntre no grupo oficial para receber novidades, acompanhar melhorias e trocar ideias sobre o uso do app.",
  topics: [
    { title: "Ganhos e gastos", desc: "Acompanhe sua rotina financeira." },
    { title: "Metas e R$/km", desc: "Veja referências para decidir melhor." },
    { title: "Veículo", desc: "Considere custos e manutenção na sua rotina." },
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

/**
 * Só notifica quando TODOS os campos principais de planejamento estão
 * ausentes/zerados. Qualquer um já configurado evita a notificação.
 */
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
    const daysEmpty = planning.workingDaysPerMonth == null || planning.workingDaysPerMonth <= 0;
    return goalEmpty && kmEmpty && daysEmpty;
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

// ---------- Maintenance (oleo / pneus) ----------
export const MAINTENANCE_NOTIFICATION_ID_PREFIX = "maintenance_";

export interface MaintenanceAlertSnapshot {
  type: "oleo" | "pneus";
  milestoneKm: number;
  kmRemaining: number;
  carLabel?: string;
}

const TYPE_LABEL: Record<"oleo" | "pneus", string> = {
  oleo: "Troca de óleo",
  pneus: "Troca de pneus",
};

export function ensureMaintenanceNotifications(
  userId: string | null | undefined,
  alerts: MaintenanceAlertSnapshot[] | null | undefined,
) {
  if (!userId || !alerts || alerts.length === 0) return;
  for (const a of alerts) {
    const milestoneRounded = Math.round(a.milestoneKm);
    const overdue = a.kmRemaining < 0;
    const status = overdue ? "overdue" : "approaching";
    // ID inclui status para que a transição "próximo" → "atrasado" gere uma
    // notificação nova (vermelha) mesmo no mesmo milestone.
    const id = `${MAINTENANCE_NOTIFICATION_ID_PREFIX}${a.type}_${milestoneRounded}_${status}`;
    const label = TYPE_LABEL[a.type];
    const kmAbs = Math.abs(Math.round(a.kmRemaining)).toLocaleString("pt-BR");
    const summary = overdue
      ? `${label} atrasada em ${kmAbs} km.`
      : `Faltam ${kmAbs} km para a próxima ${label.toLowerCase()}.`;
    const content = overdue
      ? `Sua próxima ${label.toLowerCase()} estava prevista para ${milestoneRounded.toLocaleString("pt-BR")} km e o carro já passou desse ponto. Registre a manutenção quando fizer para o Volant continuar acompanhando.`
      : `Sua próxima ${label.toLowerCase()} está prevista para ${milestoneRounded.toLocaleString("pt-BR")} km. Programe-se para fazer em breve e mantenha o carro em dia.`;
    ensureNotification(
      userId,
      {
        id,
        category: "veiculo",
        iconType: "vehicle-costs",
        tone: overdue ? "alert" : "default",
        title: overdue ? `${label} atrasada` : `${label} se aproximando`,
        summary,
        content,
        cta: { label: "Ver manutenção", route: "/ajustes/veiculos/manutencao" },
      },
      () => true,
    );
  }

}

export const NOTIFICATIONS_EVENT = EVENT;
