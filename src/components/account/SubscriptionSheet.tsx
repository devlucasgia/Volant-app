import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Sparkles, Loader2, ShieldCheck } from "lucide-react";
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
}

type PlanKey = "monthly" | "yearly";

const FEATURES = [
  "Ganhos, gastos e lucro líquido",
  "Relatórios e desempenho",
  "Histórico ilimitado",
  "Metas e manutenção preventiva",
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

export function SubscriptionSheet({ open, onOpenChange }: SubscriptionSheetProps) {
  const [selected, setSelected] = useState<PlanKey>("yearly");
  const [showCheckout, setShowCheckout] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);
  const { user } = useAuth();
  const { isActive, isGrandfathered, subscription } = useSubscription(user?.id);
  const isTestMode = getStripeEnvironment() === "sandbox";

  const handleStartTeste = () => {
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
    if (!next) setShowCheckout(false);
    onOpenChange(next);
  };

  // Decide which view to render. Grandfathered always wins.
  const view: "lifetime" | "active" | "checkout" | "plans" =
    isGrandfathered ? "lifetime"
      : showCheckout ? "checkout"
      : isActive ? "active"
      : "plans";

  const trialEnd = subscription?.status === "trialing" ? formatDate(subscription.current_period_end) : null;
  const nextBilling = subscription && subscription.status !== "trialing"
    ? formatDate(subscription.current_period_end)
    : null;

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent side="bottom" className="max-h-[92vh] overflow-y-auto rounded-t-2xl border-t border-border p-0">
        <div className="mx-auto w-full max-w-md px-5 py-6">
          <SheetHeader className="space-y-1 text-left">
            <div className="flex items-center gap-2">
              <div className="grid h-9 w-9 place-items-center rounded-full bg-primary/15 text-primary shadow-[0_0_18px_hsl(var(--primary)/0.3)]">
                <Sparkles className="h-4 w-4" />
              </div>
              {view === "lifetime" ? (
                <Badge variant="outline" className="border-primary/40 text-primary">Premium Vitalício</Badge>
              ) : view === "active" ? (
                <Badge variant="outline" className="border-primary/40 text-primary">
                  {STATUS_LABEL[subscription?.status ?? ""] ?? "Assinatura ativa"}
                </Badge>
              ) : (
                <Badge variant="outline" className="border-primary/40 text-primary">7 dias grátis</Badge>
              )}
            </div>
            <SheetTitle className="text-xl">Volant Premium</SheetTitle>
            <SheetDescription className="text-sm">
              {view === "lifetime"
                ? "Você possui acesso completo ao Volant sem necessidade de assinatura."
                : view === "active"
                  ? "Sua assinatura está ativa. Gerencie pagamento e plano pelo portal."
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
                  {subscription?.price_id === "volant_premium_yearly" ? "Plano Anual" : "Plano Mensal"}
                </div>
                <div className="text-xs text-muted-foreground">
                  Status: {STATUS_LABEL[subscription?.status ?? ""] ?? subscription?.status}
                  {subscription?.cancel_at_period_end ? " · cancelamento agendado" : ""}
                </div>
                {trialEnd && (
                  <div className="text-xs text-muted-foreground">Fim do teste: {trialEnd}</div>
                )}
                {nextBilling && (
                  <div className="text-xs text-muted-foreground">Próxima cobrança: {nextBilling}</div>
                )}
              </div>
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
            <>
              <div className="mt-5 grid grid-cols-2 gap-2.5">
                <PlanCard
                  label="Mensal" price="R$ 19,90" period="/mês"
                  selected={selected === "monthly"}
                  onSelect={() => setSelected("monthly")}
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
                <Button
                  onClick={handleStartTeste}
                  className="w-full gradient-success text-primary-foreground shadow-[0_0_24px_hsl(var(--primary)/0.3)]"
                >
                  Começar teste de 7 dias
                </Button>
                <p className="px-1 text-[11px] leading-relaxed text-muted-foreground">
                  Sem cobrança nos 7 primeiros dias. Cancele quando quiser pelo portal.
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

function TestModeNote() {
  return (
    <div className="rounded-xl border border-orange-300/40 bg-orange-500/10 px-3 py-2 text-center text-[11px] text-orange-300">
      Modo de teste ativo. Use o cartão 4242 4242 4242 4242 para simular.
    </div>
  );
}

function PlanCard({
  label, price, period, selected, highlight, badge, footnote, onSelect,
}: {
  label: string; price: string; period: string; selected: boolean;
  highlight?: boolean; badge?: string; footnote?: string; onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "relative rounded-2xl border bg-card p-4 text-left transition-all",
        selected
          ? "border-primary shadow-[0_0_0_2px_hsl(var(--primary)/0.25),0_0_18px_hsl(var(--primary)/0.2)]"
          : "border-border",
        highlight && !selected && "border-primary/40",
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
    </button>
  );
}
