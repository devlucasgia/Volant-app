import { useEffect } from "react";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from "@/components/ui/drawer";
import { BellOff, Sparkles, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import { useNotifications } from "@/hooks/useNotifications";
import { cn } from "@/lib/utils";
import type { AppNotification } from "@/lib/notifications";

/**
 * Central de Notificações.
 * Renderiza as notificações persistidas em localStorage por usuário.
 * Ao abrir, marca todas como lidas.
 */
export function NotificationsSheet({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const { user } = useAuth();
  const { items, markAllAsRead } = useNotifications(user?.id, user?.created_at);

  useEffect(() => {
    if (open) {
      // Pequeno delay para o usuário ver a "bolinha" antes de marcar como lida.
      const t = window.setTimeout(() => markAllAsRead(), 400);
      return () => window.clearTimeout(t);
    }
  }, [open, markAllAsRead]);

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent>
        <div className="mx-auto w-full max-w-md">
          <DrawerHeader className="text-left">
            <DrawerTitle className="text-base font-semibold">Notificações</DrawerTitle>
            <DrawerDescription className="text-[12px]">
              Acompanhe avisos importantes do Volant.
            </DrawerDescription>
          </DrawerHeader>

          <div className="space-y-3 px-4 pb-[calc(env(safe-area-inset-bottom)+16px)]">
            {items.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-border bg-card/60 px-6 py-10 text-center">
                <span className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-muted text-muted-foreground/80 ring-1 ring-inset ring-border/60">
                  <BellOff className="h-5 w-5" />
                </span>
                <div className="text-[14px] font-semibold text-foreground">
                  Nenhuma notificação por enquanto.
                </div>
                <div className="max-w-[260px] text-[12px] leading-snug text-muted-foreground">
                  Quando houver algo importante sobre suas metas, veículo ou assinatura, você verá aqui.
                </div>
              </div>
            ) : (
              items.map((n) => <NotificationCard key={n.id} n={n} />)
            )}
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}

function NotificationCard({ n }: { n: AppNotification }) {
  const isWelcome = n.kind === "welcome";
  return (
    <article
      className={cn(
        "relative overflow-hidden rounded-2xl border bg-card p-4 shadow-sm",
        isWelcome
          ? "border-success/30 shadow-[0_0_24px_-12px_hsl(var(--success)/0.45)]"
          : "border-border",
      )}
    >
      {isWelcome && (
        <div
          aria-hidden
          className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-success/15 blur-3xl"
        />
      )}
      <div className="relative">
        <div className="flex items-start gap-2.5">
          <span
            className={cn(
              "mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
              isWelcome ? "bg-success/15 text-success" : "bg-muted text-muted-foreground",
            )}
          >
            <Sparkles className="h-4 w-4" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h3 className="text-[14px] font-semibold leading-tight text-foreground">
                {n.title}
              </h3>
              {!n.readAt && (
                <span
                  aria-label="Não lida"
                  className="inline-block h-2 w-2 rounded-full bg-success shadow-[0_0_8px_hsl(var(--success)/0.7)]"
                />
              )}
            </div>
            <p className="mt-1 text-[12.5px] leading-snug text-muted-foreground">{n.body}</p>
          </div>
        </div>

        {n.topics && n.topics.length > 0 && (
          <ul className="mt-3 space-y-2 rounded-xl border border-border/60 bg-muted/20 p-3">
            {n.topics.map((t) => (
              <li key={t.title} className="text-[12px] leading-snug">
                <div className="font-semibold text-foreground">{t.title}</div>
                <div className="text-muted-foreground">{t.desc}</div>
              </li>
            ))}
          </ul>
        )}

        {n.cta && (
          <Button
            asChild
            className="mt-3 w-full bg-gradient-to-b from-success to-success/85 text-success-foreground shadow-[0_2px_10px_-2px_hsl(var(--success)/0.55),inset_0_1px_0_hsl(0_0%_100%/0.12)] ring-1 ring-success/40 hover:from-success hover:to-success/80"
          >
            <a href={n.cta.url} target="_blank" rel="noopener noreferrer">
              {n.cta.label}
              <ExternalLink className="h-4 w-4" />
            </a>
          </Button>
        )}
      </div>
    </article>
  );
}
