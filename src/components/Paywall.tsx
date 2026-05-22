import { useEffect, useState } from "react";
import { Check, Crown, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import { StripeEmbeddedCheckout } from "@/components/StripeEmbeddedCheckout";
import { getStripeEnvironment } from "@/lib/stripe";
import { supabase } from "@/integrations/supabase/client";
import premiumCrown from "@/assets/volant-premium-crown.png";

type PlanKey = "monthly" | "yearly";

const PRICE_IDS: Record<PlanKey, string> = {
  monthly: "volant_premium_monthly",
  yearly: "volant_premium_yearly",
};

const BENEFITS: { title: string; desc: string }[] = [
  { title: "Jornada completa de trabalho", desc: "Meta do dia, rotina e ganho registrado com facilidade." },
  { title: "Metas que evoluem com você", desc: "Sugestões reais com base no seu desempenho." },
  { title: "Seu app, do seu jeito", desc: "Personalize telas e organize os blocos como preferir." },
  { title: "Controle financeiro real", desc: "Lucro, gastos, km e desempenho em um só lugar." },
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
    ? "Cancele quando quiser pelo portal de assinatura."
    : "Cancele quando quiser pelo portal de assinatura.";

  // Subtle staggered entrance for each section.
  const stagger = (i: number): React.CSSProperties => ({ animationDelay: `${i * 70}ms` });

  return (
    <div className="relative min-h-[100dvh] overflow-y-auto bg-background">
      {/* Soft top green glow — elegant, premium, not neon */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-32 left-1/2 h-[22rem] w-[22rem] -translate-x-1/2 rounded-full bg-primary/25 blur-[90px]" />
        <div className="absolute -top-16 left-1/2 h-48 w-72 -translate-x-1/2 rounded-full bg-primary-glow/15 blur-3xl" />
        <div className="absolute bottom-0 right-0 h-60 w-60 rounded-full bg-primary-glow/8 blur-3xl" />
      </div>

      <div
        className="relative z-10 mx-auto flex w-full max-w-md flex-col px-5"
        style={{
          paddingTop: "max(1rem, env(safe-area-inset-top))",
          paddingBottom: "max(1rem, env(safe-area-inset-bottom))",
        }}
      >
        {/* Header: small crown + "Volant Premium" left, Sair right */}
        <div className="flex items-center justify-between animate-fade-in" style={stagger(0)}>
          <div className="flex items-center gap-2">
            <div className="grid h-9 w-9 place-items-center rounded-full border border-primary/30 bg-primary/15 text-primary shadow-[0_0_18px_hsl(var(--primary)/0.35)]">
              <Crown className="h-4 w-4" />
            </div>
            <span className="text-[15px] font-semibold tracking-wide text-foreground">
              Volant <span className="text-primary">Premium</span>
            </span>
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
          <div className="mt-6 animate-fade-in-up">
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
            {/* Badge */}
            <div className="mt-5 flex justify-center animate-fade-in-up" style={stagger(1)}>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/35 bg-primary/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-primary">
                <ShieldCheck className="h-3 w-3" />
                {hasUsedTrial ? "Reative seu acesso" : "7 dias grátis"}
              </span>
            </div>

            {/* Headline */}
            <div className="mt-2.5 text-center animate-fade-in-up" style={stagger(2)}>
              <h1 className="text-[24px] font-bold leading-[1.18] text-foreground">
                Acesso completo ao{" "}
                <span className="text-primary">Volant Premium.</span>
              </h1>
              <p className="mx-auto mt-2 max-w-xs text-[12.5px] leading-relaxed text-muted-foreground">
                {hasUsedTrial
                  ? "Escolha o plano ideal para retomar todos os recursos Premium."
                  : "Teste todos os recursos por 7 dias. Cancele quando quiser, sem cobrança no período de teste."}
              </p>
            </div>

            {/* Plans */}
            <div className="mt-7 grid grid-cols-2 gap-2.5 animate-fade-in-up" style={stagger(3)}>
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
                badge="−62%"
                footnote="≈ R$ 7,49/mês"
                onSelect={() => setSelected("yearly")}
              />
            </div>

            {/* Benefits */}
            <div
              className="mt-4 rounded-2xl border border-border bg-card/70 p-3.5 backdrop-blur-sm animate-fade-in-up"
              style={stagger(4)}
            >
              <ul className="divide-y divide-border/60">
                {BENEFITS.map((b, i) => (
                  <li
                    key={b.title}
                    className="flex items-start gap-3 py-2 first:pt-0 last:pb-0 animate-fade-in-up"
                    style={{ animationDelay: `${360 + i * 60}ms` }}
                  >
                    <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full border border-primary/30 bg-primary/12 text-primary animate-scale-in" style={{ animationDelay: `${380 + i * 60}ms` }}>
                      <Check className="h-3 w-3" strokeWidth={3} />
                    </span>
                    <div className="min-w-0">
                      <div className="text-[13px] font-semibold leading-tight text-foreground">{b.title}</div>
                      <div className="mt-0.5 text-[11.5px] leading-snug text-muted-foreground">{b.desc}</div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            {/* CTA */}
            <div className="mt-4 space-y-1.5 animate-fade-in-up" style={stagger(6)}>
              <Button
                onClick={() => setShowCheckout(true)}
                className={cn(
                  "group relative h-13 py-3.5 w-full overflow-hidden text-base font-semibold",
                  "border border-primary/45 text-foreground",
                  "bg-[linear-gradient(135deg,hsl(var(--card))_0%,hsl(142_60%_14%)_50%,hsl(142_65%_22%)_100%)]",
                  "shadow-[inset_0_1px_0_hsl(var(--primary)/0.22),0_10px_30px_-12px_hsl(var(--primary)/0.55)]",
                  "transition-all duration-300 active:scale-[0.985] hover:brightness-110",
                )}
              >
                {/* Continuous shine sweep */}
                <span
                  aria-hidden
                  className="pointer-events-none absolute inset-y-0 left-0 w-1/2 bg-[linear-gradient(90deg,transparent_0%,hsl(var(--primary)/0.22)_50%,transparent_100%)] motion-safe:animate-premium-shine motion-reduce:hidden"
                />
                <span
                  aria-hidden
                  className="pointer-events-none absolute inset-0 motion-safe:animate-premium-breath motion-reduce:opacity-0"
                  style={{ boxShadow: "inset 0 0 24px hsl(var(--primary) / 0.18)" }}
                />
                <Crown className="mr-2 h-4 w-4 text-primary" />
                {ctaLabel}
              </Button>
              <p className="px-1 text-center text-[11px] leading-relaxed text-muted-foreground">
                {ctaHint}
              </p>
            </div>

            {isTestMode && (
              <div className="mt-3 animate-fade-in" style={stagger(7)}>
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
  const isAnnual = !!highlight;
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "relative rounded-2xl border bg-card text-left transition-all duration-300",
        isAnnual ? "px-4 pt-8 pb-4" : "px-4 py-4",
        selected
          ? isAnnual
            ? "border-primary/60 motion-safe:animate-premium-glow motion-reduce:shadow-[0_0_0_1px_hsl(var(--primary)/0.4),0_0_24px_-4px_hsl(var(--primary)/0.5)]"
            : "border-primary shadow-[0_0_0_2px_hsl(var(--primary)/0.22)]"
          : isAnnual
            ? "border-primary/35"
            : "border-border",
      )}
    >
      {isAnnual && (
        <div className="pointer-events-none absolute left-1/2 top-0 -translate-x-1/2 -translate-y-[55%] animate-scale-in">
          <img
            src={premiumCrown}
            alt=""
            aria-hidden
            className="h-11 w-11 drop-shadow-[0_0_14px_hsl(var(--primary)/0.55)]"
          />
        </div>
      )}
      {badge && (
        <span className="absolute -top-2 right-3 rounded-full bg-primary px-2 py-0.5 text-[10px] font-semibold text-primary-foreground shadow-[0_0_12px_hsl(var(--primary)/0.5)]">
          {badge}
        </span>
      )}
      <div className={cn("text-[11px] font-semibold uppercase tracking-wider text-muted-foreground", isAnnual && "text-center")}>{label}</div>
      <div className={cn("mt-1 flex items-baseline gap-0.5 font-bold text-foreground tabular-nums", isAnnual ? "justify-center" : "")}>
        <span className="text-[18px] leading-none">{price}</span>
        <span className="text-[11px] font-medium text-muted-foreground">{period}</span>
      </div>
      {footnote && (
        <div
          className={cn(
            "mt-1 text-[11px] font-semibold tabular-nums text-primary [text-shadow:0_0_10px_hsl(var(--primary)/0.45)]",
            isAnnual && "text-center",
          )}
        >
          {footnote}
        </div>
      )}
    </button>
  );
}
