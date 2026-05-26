import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from "@/components/ui/drawer";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { BellOff, ChevronLeft, ChevronRight, ExternalLink, Crown, Brain, Wallet, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import { useData } from "@/context/DataContext";
import { useSubscription } from "@/hooks/useSubscription";
import { useNotifications } from "@/hooks/useNotifications";
import { cn } from "@/lib/utils";
import { CATEGORY_LABEL, type AppNotification, type NotificationIcon } from "@/lib/notifications";
import { VolantNotificationIcon } from "@/components/VolantNotificationIcon";

/**
 * Central de Notificações.
 *
 * Máquina de estado interna de dois níveis:
 *   - list   → lista de notificações resumidas.
 *   - detail → conteúdo completo da notificação selecionada.
 *
 * A notificação só é marcada como lida quando o usuário abre o detalhe.
 * CTAs internas preservam a rota de origem em `state.returnTo` para que
 * o "voltar" das telas-alvo retorne à origem real do usuário.
 */
export function NotificationsSheet({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const { user } = useAuth();
  const { settings, cars, loading } = useData();
  const { isPaidPremium } = useSubscription(user?.id);
  const location = useLocation();

  const planning = useMemo(
    () => ({
      monthlyGoal: settings.monthlyGoal,
      kmPlannedMonth: settings.kmPlannedMonth,
      workingDaysPerMonth: settings.workingDaysPerMonth,
    }),
    [settings.monthlyGoal, settings.kmPlannedMonth, settings.workingDaysPerMonth],
  );

  const { items, markAsRead, clearAll } = useNotifications(user?.id, user?.created_at, {
    isPaidPremium,
    planning,
    cars: cars as any,
    ready: !loading,
  });

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);
  // Snapshot da rota onde o sheet foi aberto — preservado para CTAs.
  const [originPath, setOriginPath] = useState<string>("/");

  const selected = useMemo(
    () => (selectedId ? items.find((n) => n.id === selectedId) ?? null : null),
    [selectedId, items],
  );

  useEffect(() => {
    if (open) {
      setOriginPath(location.pathname);
    } else {
      setSelectedId(null);
    }
  }, [open, location.pathname]);

  const openDetail = (n: AppNotification) => {
    setSelectedId(n.id);
    if (!n.readAt) markAsRead(n.id);
  };

  const handleClearAll = () => {
    clearAll();
    setConfirmClear(false);
    setSelectedId(null);
  };

  return (
    <>
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent>
          <div className="mx-auto w-full max-w-md">
            {selected ? (
              <NotificationDetail
                notification={selected}
                onBack={() => setSelectedId(null)}
                originPath={originPath}
                onCtaNavigate={() => onOpenChange(false)}
              />
            ) : (
              <NotificationList
                items={items}
                onOpen={openDetail}
                onRequestClearAll={() => setConfirmClear(true)}
              />
            )}
          </div>
        </DrawerContent>
      </Drawer>

      <AlertDialog open={confirmClear} onOpenChange={setConfirmClear}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover todas as notificações?</AlertDialogTitle>
            <AlertDialogDescription>
              As notificações serão removidas da sua lista e não voltam a aparecer automaticamente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleClearAll}>Limpar todas</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

// ---------- List ----------
function NotificationList({
  items,
  onOpen,
  onRequestClearAll,
}: {
  items: AppNotification[];
  onOpen: (n: AppNotification) => void;
  onRequestClearAll: () => void;
}) {
  return (
    <>
      <DrawerHeader className="text-left">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <DrawerTitle className="text-base font-semibold">Notificações</DrawerTitle>
            <DrawerDescription className="text-[12px]">
              Acompanhe avisos importantes do Volant.
            </DrawerDescription>
          </div>
          {items.length > 0 && (
            <button
              type="button"
              onClick={onRequestClearAll}
              className="inline-flex shrink-0 items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-medium text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
            >
              <Trash2 className="h-3 w-3" />
              Limpar todas
            </button>
          )}
        </div>
      </DrawerHeader>

      <div className="space-y-2 px-4 pb-[calc(env(safe-area-inset-bottom)+16px)]">
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-border bg-card/60 px-6 py-10 text-center">
            <span className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-muted text-muted-foreground/80 ring-1 ring-inset ring-border/60">
              <BellOff className="h-5 w-5" />
            </span>
            <div className="text-[14px] font-semibold text-foreground">
              Nenhuma notificação por enquanto
            </div>
            <div className="max-w-[280px] text-[12px] leading-snug text-muted-foreground">
              Quando houver avisos importantes sobre sua conta, planejamento ou recursos do Volant, eles aparecerão aqui.
            </div>
          </div>
        ) : (
          items.map((n) => (
            <button
              key={n.id}
              type="button"
              onClick={() => onOpen(n)}
              className={cn(
                "group flex w-full items-start gap-3 rounded-2xl border bg-card p-3 text-left shadow-sm transition-all",
                "hover:border-border/80 hover:bg-card/80 active:scale-[0.99]",
                !n.readAt ? "border-success/30" : "border-border",
              )}
            >
              <NotificationIconBadge iconType={n.iconType} unread={!n.readAt} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                    {CATEGORY_LABEL[n.category]}
                  </span>
                  {!n.readAt && (
                    <span
                      aria-label="Não lida"
                      className="inline-block h-1.5 w-1.5 rounded-full bg-success shadow-[0_0_6px_hsl(var(--success)/0.7)]"
                    />
                  )}
                </div>
                <div className="mt-0.5 truncate text-[14px] font-semibold leading-tight text-foreground">
                  {n.title}
                </div>
                <div className="mt-1 line-clamp-2 text-[12.5px] leading-snug text-muted-foreground">
                  {n.summary}
                </div>
              </div>
              <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-muted-foreground/60 transition-transform group-hover:translate-x-0.5" />
            </button>
          ))
        )}
      </div>
    </>
  );
}

// ---------- Detail ----------
function NotificationDetail({
  notification: n,
  onBack,
  originPath,
  onCtaNavigate,
}: {
  notification: AppNotification;
  onBack: () => void;
  originPath: string;
  onCtaNavigate: () => void;
}) {
  const navigate = useNavigate();
  const handleCta = () => {
    if (!n.cta) return;
    if (n.cta.url) {
      window.open(n.cta.url, "_blank", "noopener,noreferrer");
      return;
    }
    if (n.cta.route) {
      onCtaNavigate();
      navigate(n.cta.route, { state: { returnTo: originPath } });
    }
  };

  return (
    <>
      <DrawerHeader className="text-left">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onBack}
            aria-label="Voltar"
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            {CATEGORY_LABEL[n.category]}
          </span>
        </div>
        <DrawerTitle className="mt-1 text-base font-semibold">{n.title}</DrawerTitle>
        <DrawerDescription className="sr-only">Detalhe da notificação</DrawerDescription>
      </DrawerHeader>

      <div className="space-y-3 px-4 pb-[calc(env(safe-area-inset-bottom)+16px)]">
        <div className="flex items-start gap-3 rounded-2xl border border-border bg-card p-4 shadow-sm">
          <NotificationIconBadge iconType={n.iconType} large />
          <p className="flex-1 text-[13px] leading-relaxed text-muted-foreground">{n.content}</p>
        </div>

        {n.topics && n.topics.length > 0 && (
          <ul className="space-y-2 rounded-2xl border border-border/60 bg-muted/20 p-3">
            {n.topics.map((t) => (
              <li key={t.title} className="text-[12.5px] leading-snug">
                <div className="font-semibold text-foreground">{t.title}</div>
                <div className="text-muted-foreground">{t.desc}</div>
              </li>
            ))}
          </ul>
        )}

        {n.cta && (
          <Button
            type="button"
            onClick={handleCta}
            className="w-full bg-gradient-to-b from-success to-success/85 text-success-foreground shadow-[0_2px_10px_-2px_hsl(var(--success)/0.55),inset_0_1px_0_hsl(0_0%_100%/0.12)] ring-1 ring-success/40 hover:from-success hover:to-success/80"
          >
            {n.cta.label}
            {n.cta.url && <ExternalLink className="h-4 w-4" />}
          </Button>
        )}
      </div>
    </>
  );
}

// ---------- Icon badge ----------
function NotificationIconBadge({
  iconType,
  unread,
  large,
}: {
  iconType: NotificationIcon;
  unread?: boolean;
  large?: boolean;
}) {
  const sizeBox = large ? "h-10 w-10" : "h-9 w-9";
  const sizeIcon = large ? "h-5 w-5" : "h-4 w-4";

  // Símbolo institucional do Volant: fundo escuro + glow verde sutil,
  // para o "V" aparecer com identidade clara em vez de se diluir no verde.
  if (iconType === "volant") {
    return (
      <VolantNotificationIcon
        size={large ? 40 : 36}
        className={cn(
          unread && "shadow-[0_0_22px_-6px_hsl(var(--primary)/0.75)]",
        )}
      />
    );
  }

  const tone =
    iconType === "premium"
      ? "bg-warning/15 text-warning"
      : iconType === "vehicle-costs"
        ? "bg-primary/15 text-primary"
        : "bg-primary/15 text-primary"; // planning

  const Icon = () => {
    if (iconType === "premium") return <Crown className={sizeIcon} />;
    if (iconType === "planning") return <Brain className={sizeIcon} />;
    return <Wallet className={sizeIcon} />;
  };

  return (
    <span
      className={cn(
        "relative inline-flex shrink-0 items-center justify-center rounded-xl ring-1 ring-inset ring-border/50",
        sizeBox,
        tone,
        unread && "shadow-[0_0_18px_-6px_hsl(var(--success)/0.4)]",
      )}
    >
      <Icon />
    </span>
  );
}
