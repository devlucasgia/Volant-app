import { ChevronRight, ListChecks } from "lucide-react";
import { cn } from "@/lib/utils";

export interface FirstStepsStripProps {
  done: number;
  total: number;
  onClick: () => void;
}

/**
 * Faixa "Primeiros Passos" — renderiza dentro do <header> sticky do Dashboard.
 * O pai já deve ter checado `!loading && !allDone` antes de montar.
 */
export function FirstStepsStrip({ done, total, onClick }: FirstStepsStripProps) {
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`Primeiros passos: ${done} de ${total} concluídos`}
      className={cn(
        "flex w-full items-center gap-2.5 px-4 py-2.5 text-left",
        "border-t border-primary/15",
        "bg-gradient-to-r from-primary/[0.09] to-primary/[0.03]",
        "transition-colors hover:from-primary/[0.13] hover:to-primary/[0.05] active:scale-[0.995]",
      )}
    >
      <span className="flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
        <ListChecks className="h-[13px] w-[13px]" />
      </span>

      <div className="min-w-0 flex-1">
        <div className="truncate text-[12.5px] font-semibold leading-tight text-foreground">
          Primeiros passos
        </div>
        <div className="truncate text-[10px] leading-tight text-muted-foreground">
          {done} de {total} concluídos · continue configurando
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <div className="h-[5px] w-[46px] overflow-hidden rounded-full bg-primary/15">
          <div
            className="h-full rounded-full bg-primary transition-[width] duration-300"
            style={{ width: `${pct}%` }}
          />
        </div>
        <span className="text-[11px] font-bold text-primary tabular-nums">
          {done}/{total}
        </span>
        <ChevronRight className="h-4 w-4 text-muted-foreground" />
      </div>
    </button>
  );
}
