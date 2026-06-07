import { Car as CarIcon, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Car } from "@/types";

interface Props {
  car: Car | null | undefined;
  /** Linha extra opcional abaixo do nome (ex.: KM atual). */
  subtitle?: string;
  className?: string;
}

function carLabel(c: Car | null | undefined): string {
  if (!c) return "Nenhum carro ativo";
  const parts = [c.brand, c.model].filter(Boolean).join(" ");
  return parts || "Carro sem nome";
}

export function ActiveCarHeader({ car, subtitle, className }: Props) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl border border-primary/35 bg-gradient-to-br from-primary/[0.10] via-card to-card p-3.5 shadow-[0_0_20px_-12px_hsl(var(--primary)/0.55)]",
        className,
      )}
    >
      <div
        className="absolute -top-12 -right-12 h-28 w-28 rounded-full bg-primary/15 blur-3xl"
        aria-hidden
      />
      <div className="relative flex items-center gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary ring-1 ring-inset ring-primary/30">
          <CarIcon className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
              Carro ativo
            </span>
            <span className="inline-flex items-center gap-0.5 rounded-full bg-success/15 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-success ring-1 ring-inset ring-success/30">
              <CheckCircle2 className="h-2.5 w-2.5" />
              Ativo
            </span>
          </div>
          <div className="truncate text-[15px] font-bold leading-tight text-foreground">
            {carLabel(car)}
          </div>
          {subtitle && (
            <div className="mt-0.5 truncate text-[11px] leading-snug text-muted-foreground">
              {subtitle}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
