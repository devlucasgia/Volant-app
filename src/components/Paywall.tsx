import { useEffect, useState } from "react";
import { Check, Crown, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import { StripeEmbeddedCheckout } from "@/components/StripeEmbeddedCheckout";
import { getStripeEnvironment } from "@/lib/stripe";
import { supabase } from "@/integrations/supabase/client";

type PlanKey = "monthly" | "yearly";

const PRICE_IDS: Record<PlanKey, string> = {
  monthly: "volant_premium_monthly",
  yearly: "volant_premium_yearly",
};

const FEATURES = [
  "Ganhos, gastos e lucro líquido em tempo real",
  "Relatórios completos e indicadores de performance",
  "Histórico ilimitado e metas personalizadas",
  "Suporte prioritário e atualizações Premium",
];

interface PaywallProps {
  onSignOut?: () => void;
}

export function Paywall({ onSignOut }: PaywallProps) {
  const { user } = useAuth();
  const [selected, setSelected] = useState<PlanKey>("yearly");
  const [showCheckout, setShowCheckout] = useState(false);
  const [hasUsedTrial, setHasUsedTrial] = useState(false);
  const isTestMode = getStripeEnvironment() === "sandbox";

  // Detect if user already had any subscription row in this environment.
  // If yes, suppress the "Começar teste de 7 dias" acquisition copy.
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("subscriptions")
        .select("id")
        .eq("user_id", user.id)
        .eq("environment", getStripeEnvironment())
        .limit(1)
        .maybeSingle();
      if (!cancelled) setHasUsedTrial(!!data);
    })();
    return () => { cancelled = true; };
  }, [user]);

  const ctaLabel = hasUsedTrial
    ? `Assinar ${selected === "yearly" ? "plano anual" : "plano mensal"}`
    : "Começar teste de 7 dias";
  const ctaHint = hasUsedTrial
    ? "Você pode cancelar quando quiser pelo portal de assinatura."
    : "Sem cobrança nos 7 primeiros dias. Cancele quando quiser pelo portal de assinatura.";

  return (
    <div className="relative min-h-[100dvh] overflow-y-auto bg-background">
      {/* Ambient premium glow */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-32 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-primary/20 blur-3xl" />
        <div className="absolute bottom-0 right-0 h-72 w-72 rounded-full bg-primary-glow/15 blur-3xl" />
      </div>

      <div
        className="relative z-10 mx-auto flex w-full max-w-md flex-col px-5"
        style={{
          paddingTop: "max(1.25rem, env(safe-area-inset-top))",
          paddingBottom: "max(1.5rem, env(safe-area-inset-bottom))",
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="grid h-9 w-9 place-items-center rounded-full border border-primary/30 bg-primary/15 text-primary shadow-[0_0_18px_hsl(var(--primary)/0.35)]">
              <Crown className="h-4 w-4" />
            </div>
            <span className="text-sm font-semibold tracking-wide text-foreground">Volant Premium</span>
          </div>
          {onSignOut && (
            <button
              onClick={onSignOut}
              className="rounded-full px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted"
            >
              Sair
            </button>
          )}
        </div>

        {showCheckout ? (
          <div className="mt-6">
            <button
              onClick={() => setShowCheckout(false)}
              className="mb-3 text-xs text-muted-foreground underline-offset-2 hover:underline"
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
        ) : (
          <>
            {/* Headline */}
            <div className="mt-7 text-center">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-primary">
                <ShieldCheck className="h-3 w-3" />
                {hasUsedTrial ? "Reative seu acesso" : "7 dias grátis"}
              </span>
              <h1 className="mt-3 text-2xl font-bold leading-tight text-foreground">
                {hasUsedTrial ? (
                  <>Continue com o <span className="text-primary">Volant Premium</span></>
                ) : (
                  <>Acesso completo ao <span className="text-primary">Volant Premium</span></>
                )}
              </h1>
              <p className="mx-auto mt-2 max-w-xs text-sm text-muted-foreground">
                {hasUsedTrial
                  ? "Escolha o plano ideal para retomar todos os recursos Premium."
                  : "Teste todos os recursos por 7 dias. Cancele quando quiser, sem cobrança no período de teste."}
              </p>
            </div>

            {/* Plans */}
            <div className="mt-6 grid grid-cols-2 gap-2.5">
              <PlanCard
                label="Mensal"
                price="R$ 19,90"
                period="/mês"
                selected={selected === "monthly"}
                onSelect={() => setSelected("monthly")}
              />
              <PlanCard
                label="Anual"
                price="R$ 89,90"
                period="/ano"
                selected={selected === "yearly"}
                highlight
                badge="Economize 62%"
                footnote="≈ R$ 7,49/mês"
                onSelect={() => setSelected("yearly")}
              />
            </div>

            {/* Features */}
            <ul className="mt-6 space-y-2.5">
              {FEATURES.map((f) => (
                <li key={f} className="flex items-start gap-2.5 text-sm text-foreground/90">
                  <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-primary/15 text-primary">
                    <Check className="h-3 w-3" strokeWidth={3} />
                  </span>
                  {f}
                </li>
              ))}
            </ul>

            {/* CTA */}
            <div className="mt-7 space-y-2">
              <Button
                onClick={() => setShowCheckout(true)}
                className="h-14 w-full gradient-success text-base font-semibold text-primary-foreground shadow-[0_0_28px_hsl(var(--primary)/0.35)]"
              >
                {ctaLabel}
              </Button>
              <p className="px-1 text-center text-[11px] leading-relaxed text-muted-foreground">
                {ctaHint}
              </p>
            </div>

            {isTestMode && (
              <div className="mt-4">
                <TestModeNote />
              </div>
            )}
          </>
        )}
      </div>
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
          ? "border-primary shadow-[0_0_0_2px_hsl(var(--primary)/0.25),0_0_24px_hsl(var(--primary)/0.25)]"
          : "border-border",
        highlight && !selected && "border-primary/40",
      )}
    >
      {badge && (
        <span className="absolute -top-2 right-3 rounded-full bg-primary px-2 py-0.5 text-[10px] font-semibold text-primary-foreground shadow-[0_0_12px_hsl(var(--primary)/0.5)]">
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
