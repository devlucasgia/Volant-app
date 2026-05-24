import { useEffect, useLayoutEffect, useRef, useState } from "react";
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

const BENEFITS: { title: string; desc: string }[] = [
  { title: "Jornada completa de trabalho", desc: "Meta do dia, rotina e ganho registrado com facilidade." },
  { title: "Metas que evoluem com você", desc: "Sugestões reais com base no seu desempenho." },
  { title: "Seu app, do seu jeito", desc: "Personalize telas e organize os blocos como preferir." },
  { title: "Controle financeiro real", desc: "Lucro, gastos, km e desempenho em um só lugar." },
];

interface PaywallProps {
  onSignOut?: () => void;
  asModal?: boolean;
}

export function Paywall({ onSignOut, asModal = false }: PaywallProps) {
  const { user } = useAuth();
  const [selected, setSelected] = useState<PlanKey>("yearly");
  const [showCheckout, setShowCheckout] = useState(false);
  const [hasUsedTrial, setHasUsedTrial] = useState(false);
  const [modalScale, setModalScale] = useState(1);
  const [scaledHeight, setScaledHeight] = useState<number | null>(null);
  const modalBodyRef = useRef<HTMLDivElement | null>(null);
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

  useLayoutEffect(() => {
    if (!asModal || showCheckout) {
      setModalScale(1);
      setScaledHeight(null);
      return;
    }

    const updateScale = () => {
      const content = modalBodyRef.current;
      if (!content) return;

      const viewportHeight = window.visualViewport?.height ?? window.innerHeight;
      const availableHeight = Math.max(viewportHeight - 20, 320);
      const naturalHeight = content.scrollHeight;
      const nextScale = Math.min(1, availableHeight / naturalHeight);

      setModalScale(nextScale);
      setScaledHeight(naturalHeight * nextScale);
    };

    updateScale();
    window.addEventListener("resize", updateScale);
    window.visualViewport?.addEventListener("resize", updateScale);

    return () => {
      window.removeEventListener("resize", updateScale);
      window.visualViewport?.removeEventListener("resize", updateScale);
    };
  }, [asModal, hasUsedTrial, selected, showCheckout]);

  return (
    <div className={cn("relative bg-background", asModal ? "w-full" : "min-h-[100dvh] overflow-y-auto")}>
      {/* Soft top green glow — elegant, premium, not neon */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-32 left-1/2 h-[22rem] w-[22rem] -translate-x-1/2 rounded-full bg-primary/25 blur-[90px]" />
        <div className="absolute -top-16 left-1/2 h-48 w-72 -translate-x-1/2 rounded-full bg-primary-glow/15 blur-3xl" />
        <div className="absolute bottom-0 right-0 h-60 w-60 rounded-full bg-primary-glow/8 blur-3xl" />
      </div>

      <div
        className={cn("relative z-10 mx-auto flex w-full max-w-md flex-col", asModal ? "px-4 py-4 sm:px-5 sm:py-5" : "px-5")}
        style={
          asModal
            ? scaledHeight
              ? { height: scaledHeight }
              : undefined
            : {
                paddingTop: "max(1rem, env(safe-area-inset-top))",
                paddingBottom: "max(1rem, env(safe-area-inset-bottom))",
              }
        }
      >
        <div
          ref={modalBodyRef}
          className="flex flex-col"
          style={
            asModal && !showCheckout
              ? {
                  transform: `scale(${modalScale})`,
                  transformOrigin: "top center",
                }
              : undefined
          }
        >
        {/* Header: small crown + "Volant Premium" left, Sair right */}
        <div className="flex items-center justify-between animate-fade-in" style={stagger(0)}>
          <div className="flex items-center gap-2">
            <div className={cn("grid place-items-center rounded-full border border-primary/30 bg-primary/15 text-primary shadow-[0_0_18px_hsl(var(--primary)/0.35)]", asModal ? "h-8 w-8" : "h-9 w-9")}>
              <Crown className="h-4 w-4" />
            </div>
            <span className={cn("font-semibold tracking-wide text-foreground", asModal ? "text-sm" : "text-[15px]")}>
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
            <div className={cn("flex justify-center animate-fade-in-up", asModal ? "mt-3.5" : "mt-5")} style={stagger(1)}>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/35 bg-primary/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-primary">
                <ShieldCheck className="h-3 w-3" />
                {hasUsedTrial ? "Reative seu acesso" : "7 dias grátis"}
              </span>
            </div>

            {/* Headline */}
            <div className={cn("text-center animate-fade-in-up", asModal ? "mt-2" : "mt-2.5")} style={stagger(2)}>
              <h1 className={cn("font-bold leading-[1.18] text-foreground", asModal ? "text-[22px]" : "text-[24px]")}>
                Acesso completo ao{" "}
                <span className="text-primary">Volant Premium.</span>
              </h1>
              <p className={cn("mx-auto max-w-xs leading-relaxed text-muted-foreground", asModal ? "mt-1.5 text-[12px]" : "mt-2 text-[12.5px]")}>
                {hasUsedTrial
                  ? "Escolha o plano ideal para retomar todos os recursos Premium."
                  : "Teste todos os recursos por 7 dias. Cancele quando quiser, sem cobrança no período de teste."}
              </p>
            </div>

            {/* Plans */}
            <div className={cn("grid grid-cols-2 animate-fade-in-up", asModal ? "mt-5 gap-2" : "mt-7 gap-2.5")} style={stagger(3)}>
              <PlanCard
                label="Mensal"
                price="R$ 19,90"
                period="/mês"
                compact={asModal}
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
                compact={asModal}
                onSelect={() => setSelected("yearly")}
              />
            </div>

            {/* Benefits */}
            <div
              className={cn("rounded-2xl border border-border bg-card/70 backdrop-blur-sm animate-fade-in-up", asModal ? "mt-3 p-3" : "mt-4 p-3.5")}
              style={stagger(4)}
            >
              <ul className="divide-y divide-border/60">
                {BENEFITS.map((b, i) => (
                  <li
                    key={b.title}
                    className={cn("flex items-start gap-3 first:pt-0 last:pb-0 animate-fade-in-up", asModal ? "py-1.5" : "py-2")}
                    style={{ animationDelay: `${360 + i * 60}ms` }}
                  >
                    <span className={cn("mt-0.5 grid shrink-0 place-items-center rounded-full border border-primary/30 bg-primary/12 text-primary animate-scale-in", asModal ? "h-5 w-5" : "h-6 w-6")} style={{ animationDelay: `${380 + i * 60}ms` }}>
                      <Check className="h-3 w-3" strokeWidth={3} />
                    </span>
                    <div className="min-w-0">
                      <div className={cn("font-semibold leading-tight text-foreground", asModal ? "text-[12.5px]" : "text-[13px]")}>{b.title}</div>
                      <div className={cn("mt-0.5 leading-snug text-muted-foreground", asModal ? "text-[11px]" : "text-[11.5px]")}>{b.desc}</div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            {/* CTA */}
            <div className={cn("space-y-1.5 animate-fade-in-up", asModal ? "mt-3" : "mt-4")} style={stagger(6)}>
              <Button
                onClick={() => setShowCheckout(true)}
                className={cn(
                  "group relative w-full overflow-hidden font-semibold",
                  asModal ? "h-12 py-3 text-[15px]" : "h-13 py-3.5 text-base",
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
  label, price, period, selected, highlight, badge, footnote, onSelect, compact,
}: {
  label: string; price: string; period: string; selected: boolean;
  highlight?: boolean; badge?: string; footnote?: string; onSelect: () => void; compact?: boolean;
}) {
  const isAnnual = !!highlight;
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "relative flex flex-col items-center justify-center rounded-2xl border px-4 text-center transition-all duration-300",
        compact ? "min-h-[118px] py-4" : "min-h-[140px] py-5",
        isAnnual
          ? "bg-[linear-gradient(160deg,hsl(var(--card))_0%,hsl(142_40%_10%/0.55)_100%)]"
          : "bg-card",
        selected
          ? isAnnual
            ? "border-primary/70 motion-safe:animate-premium-glow motion-reduce:shadow-[0_0_0_1px_hsl(var(--primary)/0.4),0_0_24px_-4px_hsl(var(--primary)/0.5)]"
            : "border-primary shadow-[0_0_0_2px_hsl(var(--primary)/0.22)]"
          : isAnnual
            ? "border-primary/40"
            : "border-border",
      )}
    >
      {isAnnual && (
        <span
          aria-hidden
          className="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/2 inline-flex items-center gap-1 rounded-full border border-primary/60 bg-[linear-gradient(135deg,hsl(142_55%_18%)_0%,hsl(142_70%_28%)_100%)] px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.12em] text-primary-foreground shadow-[0_0_14px_hsl(var(--primary)/0.55),inset_0_1px_0_hsl(var(--primary)/0.4)]"
        >
          <Crown className="h-3 w-3 text-primary-foreground" strokeWidth={2.5} />
          Premium
        </span>
      )}
      {badge && (
        <span className={cn("absolute right-3 rounded-full bg-primary px-2 py-0.5 font-semibold text-primary-foreground shadow-[0_0_12px_hsl(var(--primary)/0.5)]", compact ? "-top-1.5 text-[9px]" : "-top-2 text-[10px]")}>
          {badge}
        </span>
      )}
      <div className={cn("font-semibold uppercase tracking-wider text-muted-foreground", compact ? "text-[10px]" : "text-[11px]")}>{label}</div>
      <div className="mt-1.5 flex items-baseline justify-center gap-0.5 font-bold text-foreground tabular-nums">
        <span className={cn("leading-none", compact ? "text-[17px]" : "text-[19px]")}>{price}</span>
        <span className={cn("font-medium text-muted-foreground", compact ? "text-[10px]" : "text-[11px]")}>{period}</span>
      </div>
      {footnote && (
        <div className={cn("mt-1.5 font-semibold tabular-nums text-primary [text-shadow:0_0_10px_hsl(var(--primary)/0.45)]", compact ? "text-[10px]" : "text-[11px]")}>
          {footnote}
        </div>
      )}
    </button>
  );
}
