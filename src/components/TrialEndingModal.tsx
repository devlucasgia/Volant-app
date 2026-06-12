import { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Sparkles, Clock, AlertTriangle, Tag } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useSubscription } from "@/hooks/useSubscription";
import { useAccess } from "@/context/AccessContext";
import { TRIAL_PROMO, isPromoActive } from "@/config/promo";

const STORAGE_PREFIX = "volant_trial_modal_last_shown_";
const HIDDEN_ROUTES = ["/checkout", "/auth", "/login", "/onboarding"];

function todayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function daysUntil(iso: string | null): number | null {
  if (!iso) return null;
  const end = new Date(iso).getTime();
  if (Number.isNaN(end)) return null;
  const diffMs = end - Date.now();
  // Arredonda para cima: 0..24h restantes ⇒ "termina hoje"; 24..48h ⇒ amanhã; etc.
  return Math.ceil(diffMs / (24 * 60 * 60 * 1000));
}

export function TrialEndingModal() {
  const { user } = useAuth();
  const sub = useSubscription(user?.id);
  const { openPaywall } = useAccess();
  const location = useLocation();
  const [open, setOpen] = useState(false);

  const promoOn = isPromoActive();

  const stage = useMemo<"d2" | "d1" | "d0" | "expired" | null>(() => {
    if (sub.loading || sub.isPaidPremium) return null;
    if (sub.internalTrialExpired) return "expired";
    if (!sub.internalTrialActive) return null;
    const days = daysUntil(sub.internalTrialEndsAt);
    if (days === null) return null;
    if (days <= 0) return "d0";
    if (days === 1) return "d1";
    if (days === 2) return "d2";
    return null;
  }, [sub.loading, sub.isPaidPremium, sub.internalTrialActive, sub.internalTrialExpired, sub.internalTrialEndsAt]);

  useEffect(() => {
    if (!user?.id || !stage) return;
    if (HIDDEN_ROUTES.some((r) => location.pathname.startsWith(r))) return;

    const key = `${STORAGE_PREFIX}${user.id}`;
    let lastShown: string | null = null;
    try { lastShown = localStorage.getItem(key); } catch { /* noop */ }
    if (lastShown === todayKey()) return;

    const t = window.setTimeout(() => {
      setOpen(true);
      try { localStorage.setItem(key, todayKey()); } catch { /* noop */ }
    }, 1500);
    return () => window.clearTimeout(t);
  }, [user?.id, stage, location.pathname]);

  if (!stage) return null;

  const title =
    stage === "d2" ? "Faltam 2 dias do seu acesso gratuito" :
    stage === "d1" ? "Seu acesso termina amanhã" :
    stage === "d0" ? "Seu acesso termina hoje" :
    "Seu acesso gratuito acabou";

  const Icon = stage === "expired" ? AlertTriangle : stage === "d0" ? Clock : Sparkles;
  const accent = stage === "expired" || stage === "d0" ? "text-destructive" : "text-primary";

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-md w-[calc(100%-1rem)] p-0 overflow-hidden border-border/60">
        <div className="p-6 space-y-5">
          <div className="flex items-start gap-3">
            <div className={`shrink-0 rounded-full bg-muted p-2.5 ${accent}`}>
              <Icon className="h-5 w-5" />
            </div>
            <div className="space-y-1">
              <h2 className="text-lg font-bold leading-tight">{title}</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Continue acompanhando seus ganhos, gastos e lucro com o Volant Premium.
              </p>
            </div>
          </div>

          {promoOn && (
            <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 space-y-1.5">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-primary">
                <Tag className="h-3.5 w-3.5" />
                Oferta especial
              </div>
              <p className="text-sm font-semibold">
                {TRIAL_PROMO.discountLabel} no primeiro pagamento
              </p>
              <p className="text-xs text-muted-foreground">
                Use o cupom <span className="font-mono font-bold text-foreground">{TRIAL_PROMO.couponCode}</span> no checkout.
              </p>
            </div>
          )}

          <div className="flex flex-col gap-2 pt-1">
            <Button
              className="w-full h-11 font-semibold"
              onClick={() => { setOpen(false); openPaywall(); }}
            >
              {promoOn ? "Assinar com desconto" : "Assinar agora"}
            </Button>
            <Button
              variant="ghost"
              className="w-full h-10 text-muted-foreground"
              onClick={() => setOpen(false)}
            >
              Agora não
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
