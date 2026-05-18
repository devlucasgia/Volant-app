import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Crown, Loader2, ShieldCheck, ArrowUpRight, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { useSubscription } from "@/hooks/useSubscription";
import { StripeEmbeddedCheckout } from "@/components/StripeEmbeddedCheckout";
import { supabase } from "@/integrations/supabase/client";
import { getStripeEnvironment } from "@/lib/stripe";

interface SubscriptionSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Optionally start the sheet on the "plans" view (e.g. from a "Ver planos" CTA). */
  initialView?: "auto" | "plans";
}

type PlanKey = "monthly" | "yearly";

const FEATURES = [
  "Ganhos, gastos e lucro líquido em tempo real",
  "Relatórios completos e indicadores de performance",
  "Histórico ilimitado e metas personalizadas",
  "Suporte prioritário e atualizações Premium",
];

const PRICE_IDS: Record<PlanKey, string> = {
  monthly: "volant_premium_monthly",
  yearly: "volant_premium_yearly",
};

const STATUS_LABEL: Record<string, string> = {
  trialing: "Teste de 7 dias ativo",
  active: "Assinatura ativa",
  past_due: "Pagamento pendente",
  canceled: "Cancelada",
};

function formatDate(iso?: string | null) {
  if (!iso) return null;
  try {
    return new Date(iso).toLocaleDateString("pt-BR", {
      day: "2-digit", month: "long", year: "numeric",
    });
  } catch {
    return null;
  }
}

export function SubscriptionSheet({ open, onOpenChange, initialView = "auto" }: SubscriptionSheetProps) {
  const [selected, setSelected] = useState<PlanKey>("yearly");
  const [showCheckout, setShowCheckout] = useState(false);
  const [showPlans, setShowPlans] = useState(initialView === "plans");
  const [portalLoading, setPortalLoading] = useState(false);
  const { user } = useAuth();
  const { isActive, isGrandfathered, subscription } = useSubscription(user?.id);
  const isTestMode = getStripeEnvironment() === "sandbox";

  // Has the user ever had a subscription row in this environment?
  // Used to suppress "Começar teste de 7 dias" copy for users that already used it.
  const hasUsedTrial = !!subscription;
  const isYearly = subscription?.price_id === "volant_premium_yearly";
  const isMonthly = subscription?.price_id === "volant_premium_monthly";
  const isTrialing = subscription?.status === "trialing";

  const handleStart = () => {
    if (!user) {
      toast.error("Faça login para assinar.");
      return;
    }
    setShowCheckout(true);
  };

  const handleManage = async () => {
    setPortalLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-portal-session", {
        body: {
          environment: getStripeEnvironment(),
          returnUrl: `${window.location.origin}/ajustes`,
        },
      });
      if (error || !data?.url) throw new Error(error?.message || "Falha ao abrir portal");
      window.open(data.url, "_blank");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setPortalLoading(false);
    }
  };

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      setShowCheckout(false);
      setShowPlans(initialView === "plans");
    }
    onOpenChange(next);
  };

  // Decide which view to render. Grandfathered always wins.
  const view: "lifetime" | "active" | "checkout" | "plans" =
    isGrandfathered ? "lifetime"
      : showCheckout ? "checkout"
      : showPlans ? "plans"
      : isActive ? "active"
      : "plans";

  const trialEnd = isTrialing ? formatDate(subscription?.current_period_end) : null;
  const nextBilling = subscription && !isTrialing
    ? formatDate(subscription.current_period_end)
    : null;

  // Plans-view flavor:
  // - upgrade: active monthly subscriber considering annual
  // - reactivate: had a sub before (or trialing), no first-time trial CTA
  // - acquisition: brand new user, show "Começar teste de 7 dias"
  const plansFlavor: "upgrade" | "reactivate" | "acquisition" =
    isMonthly && isActive ? "upgrade"
      : (hasUsedTrial || isActive) ? "reactivate"
      : "acquisition";

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent side="bottom" className="max-h-[92vh] overflow-y-auto rounded-t-2xl border-t border-border p-0">
        <div className="mx-auto w-full max-w-md px-5 py-6">
          <SheetHeader className="space-y-1 text-left">
            <div className="flex items-center gap-2">
              <CrownBadge />
              {view === "lifetime" ? (
                <Badge variant="outline" className="border-primary/40 text-primary">Premium Vitalício</Badge>
              ) : view === "active" ? (
                <Badge variant="outline" className="border-primary/40 text-primary">
                  {STATUS_LABEL[subscription?.status ?? ""] ?? "Assinatura ativa"}
                </Badge>
              ) : view === "plans" && plansFlavor === "upgrade" ? (
                <Badge variant="outline" className="border-primary/40 text-primary">Upgrade disponível</Badge>
              ) : view === "plans" && plansFlavor === "reactivate" ? (
                <Badge variant="outline" className="border-primary/40 text-primary">Reativar Premium</Badge>
              ) : (
                <Badge variant="outline" className="border-primary/40 text-primary">7 dias grátis</Badge>
              )}
            </div>
            <SheetTitle className="text-xl">
              {view === "lifetime" ? "Volant Premium Vitalício"
                : view === "plans" && plansFlavor === "upgrade" ? "Economize com o plano anual"
                : view === "plans" && plansFlavor === "reactivate" ? "Escolha seu plano Premium"
                : "Volant Premium"}
            </SheetTitle>
            <SheetDescription className="text-sm">
              {view === "lifetime"
                ? "Você possui acesso completo ao Volant sem necessidade de assinatura."
                : view === "active"
                  ? isYearly
                    ? "Você está no melhor plano do Volant."
                    : "Sua assinatura está ativa. Gerencie pagamento e plano pelo portal."
                  : view === "plans" && plansFlavor === "upgrade"
                    ? "Faça upgrade para o plano anual e economize 62%."
                    : view === "plans" && plansFlavor === "reactivate"
                      ? "Escolha o plano ideal para continuar com o Volant Premium."
                      : "Aproveite 7 dias grátis. Depois escolha entre acesso mensal ou anual."}
            </SheetDescription>
          </SheetHeader>

          {view === "checkout" ? (
            <div className="mt-5 space-y-3">
              <button
                onClick={() => setShowCheckout(false)}
                className="text-xs text-muted-foreground underline-offset-2 hover:underline"
              >
                ← Trocar de plano
              </button>
              {isTestMode && <TestModeNote />}
              <div className="overflow-hidden rounded-2xl border border-border bg-card">
                <StripeEmbeddedCheckout
                  priceId={PRICE_IDS[selected]}
                  userId={user?.id}
                  customerEmail={user?.email ?? undefined}
                />
              </div>
            </div>
          ) : view === "active" ? (
            <div className="mt-6 space-y-3">
              <div className="rounded-2xl border border-border bg-card p-4 text-sm space-y-2">
                <div className="font-medium">
                  {isYearly ? "Plano Anual" : "Plano Mensal"}
                </div>
                <div className="text-xs text-muted-foreground">
                  Status: {STATUS_LABEL[subscription?.status ?? ""] ?? subscription?.status}
                  {subscription?.cancel_at_period_end ? " · cancelamento agendado" : ""}
                </div>
                {trialEnd && (
                  <div className="text-xs text-muted-foreground">Seu teste termina em {trialEnd}</div>
                )}
                {nextBilling && (
                  <div className="text-xs text-muted-foreground">Próxima cobrança: {nextBilling}</div>
                )}
              </div>

              {isMonthly && !subscription?.cancel_at_period_end && (
                <button
                  onClick={() => setShowPlans(true)}
                  className="flex w-full items-center justify-between rounded-2xl border border-primary/40 bg-primary/5 p-4 text-left transition-colors hover:bg-primary/10"
                >
                  <div>
                    <div className="flex items-center gap-1.5 text-sm font-semibold text-primary">
                      <Sparkles className="h-3.5 w-3.5" /> Economize com o plano anual
                    </div>
                    <div className="mt-0.5 text-xs text-muted-foreground">
                      Mude para o anual e pague 62% menos por mês.
                    </div>
                  </div>
                  <ArrowUpRight className="h-4 w-4 text-primary" />
                </button>
              )}

              <Button onClick={handleManage} disabled={portalLoading} className="w-full">
                {portalLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Gerenciar assinatura"}
              </Button>
            </div>
          ) : view === "lifetime" ? (
            <div className="mt-6 space-y-4">
              <div className="rounded-2xl border border-primary/30 bg-primary/5 p-4 text-sm">
                <div className="flex items-center gap-2 font-medium text-primary">
                  <ShieldCheck className="h-4 w-4" /> Premium Vitalício
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  Acesso completo a todos os recursos do Volant, sem cobrança.
                </p>
              </div>
              <ul className="space-y-2">
                {FEATURES.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm text-foreground/90">
                    <Check className="h-4 w-4 text-primary" />
                    {f}
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            // plans view
            <>
              {plansFlavor === "upgrade" && isActive && (
                <button
                  onClick={() => setShowPlans(false)}
                  className="mt-4 text-xs text-muted-foreground underline-offset-2 hover:underline"
                >
                  ← Voltar para minha assinatura
                </button>
              )}

              <div className="mt-5 grid grid-cols-2 gap-2.5">
                <PlanCard
                  label="Mensal" price="R$ 19,90" period="/mês"
                  selected={selected === "monthly"}
                  disabled={plansFlavor === "upgrade"}
                  hint={plansFlavor === "upgrade" ? "Plano atual" : undefined}
                  onSelect={() => plansFlavor !== "upgrade" && setSelected("monthly")}
                />
                <PlanCard
                  label="Anual" price="R$ 89,90" period="/ano"
                  selected={selected === "yearly"}
                  highlight badge="Economize 62%" footnote="≈ R$ 7,49/mês"
                  onSelect={() => setSelected("yearly")}
                />
              </div>

              <ul className="mt-5 space-y-2">
                {FEATURES.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm text-foreground/90">
                    <Check className="h-4 w-4 text-primary" />
                    {f}
                  </li>
                ))}
              </ul>

              <div className="mt-6 space-y-2">
                {plansFlavor === "upgrade" ? (
                  <Button
                    onClick={handleManage}
                    disabled={portalLoading}
                    className="w-full gradient-success text-primary-foreground shadow-[0_0_24px_hsl(var(--primary)/0.3)]"
                  >
                    {portalLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Mudar para o anual"}
                  </Button>
                ) : plansFlavor === "reactivate" ? (
                  <Button
                    onClick={handleStart}
                    className="w-full gradient-success text-primary-foreground shadow-[0_0_24px_hsl(var(--primary)/0.3)]"
                  >
                    Assinar {selected === "yearly" ? "plano anual" : "plano mensal"}
                  </Button>
                ) : (
                  <Button
                    onClick={handleStart}
                    className="w-full gradient-success text-primary-foreground shadow-[0_0_24px_hsl(var(--primary)/0.3)]"
                  >
                    Começar teste de 7 dias
                  </Button>
                )}
                <p className="px-1 text-[11px] leading-relaxed text-muted-foreground">
                  {plansFlavor === "upgrade"
                    ? "A troca de plano é feita com segurança pelo portal de assinatura."
                    : plansFlavor === "reactivate"
                      ? "Você pode cancelar quando quiser pelo portal de assinatura."
                      : "Sem cobrança nos 7 primeiros dias. Cancele quando quiser pelo portal."}
                </p>
                {isTestMode && <TestModeNote />}
              </div>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function CrownBadge() {
  return (
    <div className="grid h-9 w-9 place-items-center rounded-full bg-primary/15 text-primary shadow-[0_0_18px_hsl(var(--primary)/0.3)]">
      <Crown className="h-4 w-4" />
    </div>
  );
}

function TestModeNote() {
  return (
    <div className="rounded-xl border border-orange-300/40 bg-orange-500/10 px-3 py-2 text-center text-[11px] text-orange-300">
      Modo de teste ativo. Use o cartão 4242 4242 4242 4242 para simular.
    </div>
  );
}

function PlanCard({
  label, price, period, selected, highlight, badge, footnote, onSelect, disabled, hint,
}: {
  label: string; price: string; period: string; selected: boolean;
  highlight?: boolean; badge?: string; footnote?: string; onSelect: () => void;
  disabled?: boolean; hint?: string;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={disabled}
      className={cn(
        "relative rounded-2xl border bg-card p-4 text-left transition-all",
        selected
          ? "border-primary shadow-[0_0_0_2px_hsl(var(--primary)/0.25),0_0_18px_hsl(var(--primary)/0.2)]"
          : "border-border",
        highlight && !selected && "border-primary/40",
        disabled && "opacity-60",
      )}
    >
      {badge && (
        <span className="absolute -top-2 right-3 rounded-full bg-primary px-2 py-0.5 text-[10px] font-semibold text-primary-foreground">
          {badge}
        </span>
      )}
      <div className="text-xs font-medium text-muted-foreground">{label}</div>
      <div className="mt-1 text-lg font-bold text-foreground">
        {price}
        <span className="text-xs font-normal text-muted-foreground">{period}</span>
      </div>
      {footnote && <div className="mt-1 text-[11px] text-muted-foreground">{footnote}</div>}
      {hint && <div className="mt-1 text-[10px] font-semibold uppercase tracking-wide text-primary">{hint}</div>}
    </button>
  );
}
