/**
 * Central de Notificações — persistência leve em localStorage por usuário.
 * Sem novas tabelas no banco. Cada usuário tem sua própria lista isolada.
 */

const EVENT = "volant:notificationsChanged";

export interface AppNotification {
  id: string;
  kind: "welcome" | "system";
  title: string;
  body: string;
  topics?: { title: string; desc: string }[];
  cta?: { label: string; url: string };
  createdAt: number;
  readAt: number | null;
}

export const WELCOME_NOTIFICATION_ID = "general_welcome_group_notification";
const WELCOME_DELAY_MS = 30 * 60 * 1000; // 30 minutos

const WELCOME_TEMPLATE: Omit<AppNotification, "createdAt" | "readAt"> = {
  id: WELCOME_NOTIFICATION_ID,
  kind: "welcome",
  title: "Bem-vindo ao Volant",
  body:
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

function storageKey(userId: string) {
  return `volant.notifications.v1.${userId}`;
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

export function listNotifications(userId: string): AppNotification[] {
  // Mais recente primeiro.
  return read(userId).slice().sort((a, b) => b.createdAt - a.createdAt);
}

export function unreadCount(userId: string): number {
  return read(userId).filter((n) => !n.readAt).length;
}

export function markAllRead(userId: string) {
  const items = read(userId);
  if (!items.length) return;
  const now = Date.now();
  let changed = false;
  for (const it of items) {
    if (!it.readAt) {
      it.readAt = now;
      changed = true;
    }
  }
  if (changed) write(userId, items);
}

/**
 * Garante a notificação de boas-vindas para um usuário.
 * - Novos usuários (conta < 30 min): não cria ainda.
 * - Conta >= 30 min e sem registro: cria como não lida.
 * Idempotente — chamadas repetidas não duplicam.
 */
export function ensureWelcomeNotification(
  userId: string | null | undefined,
  accountCreatedAt: string | number | Date | null | undefined,
) {
  if (!userId || !accountCreatedAt) return;
  const items = read(userId);
  if (items.some((n) => n.id === WELCOME_NOTIFICATION_ID)) return;
  const createdMs =
    typeof accountCreatedAt === "number"
      ? accountCreatedAt
      : new Date(accountCreatedAt).getTime();
  if (!Number.isFinite(createdMs)) return;
  if (Date.now() - createdMs < WELCOME_DELAY_MS) return;
  const notif: AppNotification = {
    ...WELCOME_TEMPLATE,
    createdAt: Date.now(),
    readAt: null,
  };
  write(userId, [...items, notif]);
}

export const NOTIFICATIONS_EVENT = EVENT;
