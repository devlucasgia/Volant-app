import { useCallback, useEffect, useState } from "react";
import {
  AppNotification,
  NOTIFICATIONS_EVENT,
  PlanningSnapshot,
  VehicleCostsSnapshot,
  ensurePlanningIncompleteNotification,
  ensurePremiumWelcomeNotification,
  ensureVehicleCostsMissingNotification,
  ensureWelcomeNotification,
  listNotifications,
  markAsRead as markAsReadLib,
  unreadCount,
} from "@/lib/notifications";

interface NotificationsContext {
  isPaidPremium?: boolean;
  planning?: PlanningSnapshot | null;
  cars?: VehicleCostsSnapshot[] | null;
}

export function useNotifications(
  userId: string | null | undefined,
  accountCreatedAt: string | number | Date | null | undefined,
  context?: NotificationsContext,
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

  // Garante notificações elegíveis + re-agenda welcome se ainda faltam
  // minutos para a conta completar 30 min.
  const isPaidPremium = context?.isPaidPremium === true;
  const planning = context?.planning ?? null;
  const cars = context?.cars ?? null;

  useEffect(() => {
    if (!userId) return;
    ensureWelcomeNotification(userId, accountCreatedAt);
    ensurePremiumWelcomeNotification(userId, isPaidPremium);
    ensurePlanningIncompleteNotification(userId, accountCreatedAt, planning);
    ensureVehicleCostsMissingNotification(userId, accountCreatedAt, cars);
    refresh();

    if (!accountCreatedAt) return;
    const createdMs =
      typeof accountCreatedAt === "number"
        ? accountCreatedAt
        : new Date(accountCreatedAt).getTime();
    const elapsed = Date.now() - createdMs;
    const remaining = 30 * 60 * 1000 - elapsed;
    if (remaining > 0 && remaining < 60 * 60 * 1000) {
      const t = window.setTimeout(() => {
        ensureWelcomeNotification(userId, accountCreatedAt);
        ensurePlanningIncompleteNotification(userId, accountCreatedAt, planning);
        ensureVehicleCostsMissingNotification(userId, accountCreatedAt, cars);
        refresh();
      }, remaining + 500);
      return () => window.clearTimeout(t);
    }
  }, [userId, accountCreatedAt, isPaidPremium, planning, cars, refresh]);

  useEffect(() => {
    const onChange = () => refresh();
    window.addEventListener(NOTIFICATIONS_EVENT, onChange);
    window.addEventListener("storage", onChange);
    return () => {
      window.removeEventListener(NOTIFICATIONS_EVENT, onChange);
      window.removeEventListener("storage", onChange);
    };
  }, [refresh]);

  const markAsRead = useCallback(
    (id: string) => {
      if (!userId) return;
      markAsReadLib(userId, id);
    },
    [userId],
  );

  return { items, unread, markAsRead };
}
