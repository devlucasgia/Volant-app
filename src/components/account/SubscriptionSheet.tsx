import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Sparkles, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

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

export function SubscriptionSheet({ open, onOpenChange }: SubscriptionSheetProps) {
  const [selected, setSelected] = useState<PlanKey>("yearly");

  const handleStartTrial = () => {
    toast("Em breve! Pagamentos serão ativados em uma próxima atualização.");
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[92vh] overflow-y-auto rounded-t-2xl border-t border-border p-0">
        <div className="mx-auto w-full max-w-md px-5 py-6">
          <SheetHeader className="space-y-1 text-left">
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/15 text-primary">
                <Sparkles className="h-4 w-4" />
              </div>
              <Badge variant="outline" className="border-primary/40 text-primary">
                Beta gratuito
              </Badge>
            </div>
            <SheetTitle className="text-xl">Volant Premium</SheetTitle>
            <SheetDescription className="text-sm">
              Aproveite 7 dias grátis. Depois escolha entre acesso mensal ou anual.
            </SheetDescription>
          </SheetHeader>

          <div className="mt-5 grid grid-cols-2 gap-2.5">
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

          <ul className="mt-5 space-y-2">
            {FEATURES.map((f) => (
              <li key={f} className="flex items-center gap-2 text-sm text-foreground/90">
                <Check className="h-4 w-4 text-primary" />
                {f}
              </li>
            ))}
          </ul>

          <div className="mt-6 space-y-2">
            <Button onClick={handleStartTrial} className="w-full gradient-success text-primary-foreground">
              Começar teste grátis
            </Button>
            <p className="flex items-start gap-1.5 px-1 text-[11px] leading-relaxed text-muted-foreground">
              <Info className="mt-0.5 h-3 w-3 shrink-0" />
              Pagamentos serão ativados em uma próxima atualização. Você ainda não será cobrado.
            </p>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function PlanCard({
  label,
  price,
  period,
  selected,
  highlight,
  badge,
  footnote,
  onSelect,
}: {
  label: string;
  price: string;
  period: string;
  selected: boolean;
  highlight?: boolean;
  badge?: string;
  footnote?: string;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "relative rounded-2xl border bg-card p-4 text-left transition-all",
        selected ? "border-primary shadow-[0_0_0_2px_hsl(var(--primary)/0.25)]" : "border-border",
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
