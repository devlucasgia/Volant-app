import { useCallback, useEffect, useState } from "react";
import {
  AppNotification,
  MaintenanceAlertSnapshot,
  NOTIFICATIONS_EVENT,
  PlanningSnapshot,
  VehicleCostsSnapshot,
  clearAllNotifications,
  ensureMaintenanceNotifications,
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
  maintenanceAlerts?: MaintenanceAlertSnapshot[] | null;
  /**
   * Só dispara notificações condicionais quando os dados do usuário
   * (settings/cars) terminaram de carregar. Evita criar notificações
   * indevidas com base no estado inicial vazio.
   */
  ready?: boolean;
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

  const isPaidPremium = context?.isPaidPremium === true;
  const planning = context?.planning ?? null;
  const cars = context?.cars ?? null;
  const ready = context?.ready !== false; // default true para chamadas sem contexto

  useEffect(() => {
    if (!userId) return;
    ensureWelcomeNotification(userId, accountCreatedAt);
    ensurePremiumWelcomeNotification(userId, isPaidPremium);
    // Condicionais dependem dos dados carregados.
    if (ready) {
      ensurePlanningIncompleteNotification(userId, accountCreatedAt, planning);
      ensureVehicleCostsMissingNotification(userId, accountCreatedAt, cars);
    }
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
        if (ready) {
          ensurePlanningIncompleteNotification(userId, accountCreatedAt, planning);
          ensureVehicleCostsMissingNotification(userId, accountCreatedAt, cars);
        }
        refresh();
      }, remaining + 500);
      return () => window.clearTimeout(t);
    }
  }, [userId, accountCreatedAt, isPaidPremium, planning, cars, ready, refresh]);

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

  const clearAll = useCallback(() => {
    if (!userId) return;
    clearAllNotifications(userId);
  }, [userId]);

  return { items, unread, markAsRead, clearAll };
}
