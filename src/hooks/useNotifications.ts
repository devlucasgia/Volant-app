import { useCallback, useEffect, useState } from "react";
import {
  AppNotification,
  NOTIFICATIONS_EVENT,
  ensureWelcomeNotification,
  listNotifications,
  markAllRead,
  unreadCount,
} from "@/lib/notifications";

export function useNotifications(
  userId: string | null | undefined,
  accountCreatedAt: string | number | Date | null | undefined,
) {
  const [items, setItems] = useState<AppNotification[]>([]);
  const [unread, setUnread] = useState(0);

  const refresh = useCallback(() => {
    if (!userId) {
      setItems([]);
      setUnread(0);
      return;
    }
    setItems(listNotifications(userId));
    setUnread(unreadCount(userId));
  }, [userId]);

  // Garante a notificação de boas-vindas + agenda re-check caso ainda
  // faltem minutos para completar 30 min desde a criação da conta.
  useEffect(() => {
    if (!userId || !accountCreatedAt) return;
    ensureWelcomeNotification(userId, accountCreatedAt);
    refresh();

    const createdMs =
      typeof accountCreatedAt === "number"
        ? accountCreatedAt
        : new Date(accountCreatedAt).getTime();
    const elapsed = Date.now() - createdMs;
    const remaining = 30 * 60 * 1000 - elapsed;
    if (remaining > 0 && remaining < 60 * 60 * 1000) {
      const t = window.setTimeout(() => {
        ensureWelcomeNotification(userId, accountCreatedAt);
        refresh();
      }, remaining + 500);
      return () => window.clearTimeout(t);
    }
  }, [userId, accountCreatedAt, refresh]);

  useEffect(() => {
    const onChange = () => refresh();
    window.addEventListener(NOTIFICATIONS_EVENT, onChange);
    window.addEventListener("storage", onChange);
    return () => {
      window.removeEventListener(NOTIFICATIONS_EVENT, onChange);
      window.removeEventListener("storage", onChange);
    };
  }, [refresh]);

  const markAllAsRead = useCallback(() => {
    if (!userId) return;
    markAllRead(userId);
  }, [userId]);

  return { items, unread, markAllAsRead };
}
