import { Brain, Sparkles, Target, Gauge, Car as CarIcon } from "lucide-react";

interface Props {
  onStart: () => void;
}

export function EmptyState({ onStart }: Props) {
  return (
    <div className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-6 px-5 py-10 text-center animate-fade-in">
      <div className="relative">
        <span className="absolute inset-0 -z-10 animate-pulse rounded-full bg-primary/20 blur-3xl" />
        <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-primary/25 via-primary/10 to-transparent ring-1 ring-inset ring-primary/30 shadow-[0_0_40px_-12px_hsl(var(--primary)/0.6)]">
          <Brain className="h-9 w-9 text-primary" />
        </div>
      </div>

      <div className="space-y-2">
        <h2 className="text-[22px] font-bold leading-tight tracking-tight text-foreground">
          Vamos planejar seu mês
        </h2>
        <p className="text-[13px] leading-snug text-muted-foreground">
          Em poucos passos, o Volant calcula sua meta diária, o R$/km ideal e o
          quanto você precisa rodar para fechar o mês no azul.
        </p>
      </div>

      <ul className="w-full space-y-2.5">
        {[
          { icon: Target, text: "Sua meta principal do mês" },
          { icon: Gauge, text: "R$/km de referência para suas corridas" },
          { icon: CarIcon, text: "Custos do seu veículo, se você tiver" },
        ].map(({ icon: Icon, text }, i) => (
          <li
            key={i}
            className="flex items-center gap-3 rounded-2xl border border-border/60 bg-card/60 px-3.5 py-2.5 text-left"
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Icon className="h-4 w-4" />
            </span>
            <span className="text-[13px] leading-snug text-foreground/90">{text}</span>
          </li>
        ))}
      </ul>

      <button
        type="button"
        onClick={onStart}
        className="group inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-br from-primary to-primary/85 px-6 py-3.5 text-[15px] font-semibold text-primary-foreground shadow-[0_10px_30px_-12px_hsl(var(--primary)/0.7)] transition-all active:scale-[0.98]"
      >
        <Sparkles className="h-4 w-4 transition-transform group-hover:rotate-12" />
        Começar planejamento
      </button>

      <p className="text-[11px] leading-snug text-muted-foreground/80">
        Leva menos de 1 minuto. Você pode ajustar a qualquer momento.
      </p>
    </div>
  );
}
