import { useEffect, useState } from "react";
import { Info, X } from "lucide-react";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "volant_aviso_meta_variavel_v1";

interface Props {
  /** Só exibe se o motorista tem planejamento configurado. */
  enabled: boolean;
  className?: string;
}

/**
 * Banner único e dismissível avisando que custos variáveis (combustível e
 * alimentação) saíram do cálculo da meta. Persiste o dismiss em localStorage.
 */
export function PlanningChangeNoticeBanner({ enabled, className }: Props) {
  const [dismissed, setDismissed] = useState<boolean>(true);

  useEffect(() => {
    try {
      setDismissed(localStorage.getItem(STORAGE_KEY) === "1");
    } catch {
      setDismissed(false);
    }
  }, []);

  if (!enabled || dismissed) return null;

  const handleDismiss = () => {
    try {
      localStorage.setItem(STORAGE_KEY, "1");
    } catch {
      /* noop */
    }
    setDismissed(true);
  };

  return (
    <div
      role="status"
      className={cn(
        "relative rounded-2xl border border-border/70 bg-card/80 p-4 pr-10 shadow-sm",
        className,
      )}
    >
      <button
        type="button"
        onClick={handleDismiss}
        aria-label="Fechar aviso"
        className="absolute right-2 top-2 inline-flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted/40 hover:text-foreground"
      >
        <X className="h-4 w-4" />
      </button>
      <div className="flex gap-3">
        <div className="mt-0.5 shrink-0">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Info className="h-4 w-4" />
          </span>
        </div>
        <div className="min-w-0 space-y-2 text-[13px] leading-relaxed text-foreground/90">
          <p className="text-sm font-semibold text-foreground">
            Deixamos seu Planejamento mais simples.
          </p>
          <p>
            Agora a sua meta é calculada assim: meta líquida (o que você quer
            que sobre) + custos fixos (financiamento, seguro, e afins).
          </p>
          <p>
            Os custos variáveis — gasolina e alimentação — saíram da meta e
            agora aparecem só como referência. Fizemos isso porque eles estavam
            sendo contados duas vezes: uma na meta e outra quando você registra
            esses gastos no dia a dia. Agora a conta fica certa, sem repetição.
          </p>
        </div>
      </div>
    </div>
  );
}
