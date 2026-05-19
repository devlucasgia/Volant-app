import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Check, Crown, Loader2, ArrowUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { getStripeEnvironment } from "@/lib/stripe";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const BENEFITS = [
  "Todos os recursos Premium incluídos",
  "Relatórios e indicadores completos",
  "Histórico ilimitado e metas personalizadas",
  "Suporte prioritário",
];

export function UpgradeToYearlyDialog({ open, onOpenChange }: Props) {
  const [loading, setLoading] = useState(false);

  const handleActivateYearly = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-portal-session", {
        body: {
          environment: getStripeEnvironment(),
          returnUrl: `${window.location.origin}/ajustes`,
        },
      });
      if (error || !data?.url) throw new Error(error?.message || "Falha ao abrir portal");
      window.open(data.url, "_blank");
      onOpenChange(false);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          "border-primary/20 bg-card p-0 overflow-hidden",
          "data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 data-[state=open]:slide-in-from-bottom-2",
          "data-[state=open]:duration-300",
        )}
      >
        {/* Subtle premium gradient backdrop */}
        <div className="relative">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 opacity-80"
            style={{
              background:
                "radial-gradient(120% 60% at 50% -10%, hsl(var(--primary) / 0.18), transparent 60%)",
            }}
          />

          <div className="relative px-6 pt-6 pb-2">
            <DialogHeader className="space-y-2 text-left">
              <div className="flex items-center gap-2">
                <span className="grid h-9 w-9 place-items-center rounded-full bg-primary/15 text-primary shadow-[0_0_18px_hsl(var(--primary)/0.25)]">
                  <Crown className="h-4 w-4" />
                </span>
                <span className="rounded-full border border-primary/40 bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
                  Melhor escolha
                </span>
              </div>
              <DialogTitle className="text-xl">Faça upgrade para o plano anual</DialogTitle>
              <DialogDescription className="text-sm">
                Mesmos benefícios, com economia de 62% comparado ao mensal.
              </DialogDescription>
            </DialogHeader>
          </div>

          <div className="relative px-6 pb-6 pt-4 space-y-4">
            {/* Plan comparison */}
            <div className="grid grid-cols-2 gap-2.5">
              <div className="rounded-2xl border border-border bg-muted/30 p-3.5">
                <div className="text-[11px] font-medium text-muted-foreground">Mensal</div>
                <div className="mt-1 text-base font-semibold text-foreground">
                  R$ 19,90
                  <span className="text-[11px] font-normal text-muted-foreground">/mês</span>
                </div>
                <div className="mt-1 text-[11px] text-muted-foreground">Plano atual</div>
              </div>
              <div className="relative rounded-2xl border border-primary/45 bg-primary/[0.06] p-3.5 shadow-[0_0_0_1px_hsl(var(--primary)/0.12),0_8px_28px_-18px_hsl(var(--primary)/0.6)]">
                <span className="absolute -top-2 right-3 rounded-full bg-primary px-2 py-0.5 text-[10px] font-semibold text-primary-foreground">
                  −62%
                </span>
                <div className="text-[11px] font-medium text-muted-foreground">Anual</div>
                <div className="mt-1 text-base font-semibold text-foreground">
                  R$ 89,90
                  <span className="text-[11px] font-normal text-muted-foreground">/ano</span>
                </div>
                <div className="mt-1 text-[11px] text-primary">≈ R$ 7,49/mês</div>
              </div>
            </div>

            <ul className="space-y-2">
              {BENEFITS.map((b) => (
                <li key={b} className="flex items-center gap-2 text-sm text-foreground/90">
                  <Check className="h-4 w-4 text-primary" />
                  {b}
                </li>
              ))}
            </ul>

            <Button
              onClick={handleActivateYearly}
              disabled={loading}
              className={cn(
                "group relative w-full overflow-hidden h-11",
                "border border-primary/40 text-foreground",
                "bg-[linear-gradient(135deg,hsl(var(--card))_0%,hsl(142_60%_14%)_55%,hsl(142_65%_20%)_100%)]",
                "shadow-[inset_0_1px_0_hsl(var(--primary)/0.18),0_8px_28px_-14px_hsl(var(--primary)/0.55)]",
                "hover:brightness-110 transition-all",
              )}
            >
              <span
                aria-hidden
                className="pointer-events-none absolute inset-0 -translate-x-full bg-[linear-gradient(110deg,transparent_30%,hsl(var(--primary)/0.25)_50%,transparent_70%)] group-hover:translate-x-full transition-transform duration-700"
              />
              <ArrowUp className="h-4 w-4 text-primary" />
              <span className="font-semibold">{loading ? "Abrindo portal..." : "Ativar plano anual"}</span>
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            </Button>

            <p className="text-center text-[11px] leading-relaxed text-muted-foreground">
              A troca é feita com segurança no portal de assinatura.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
