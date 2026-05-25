import { useNavigate } from "react-router-dom";
import { ArrowLeft, Target, Gauge, ChevronRight, Route } from "lucide-react";
import { cn } from "@/lib/utils";

/** Sticky page header with a back button — premium Volant identity. */
function PlanHeader({ onBack }: { onBack: () => void }) {
  return (
    <header className="sticky top-0 z-20 border-b border-border bg-background/85 backdrop-blur-lg">
      <div className="flex items-center gap-3 px-3 py-3">
        <button
          type="button"
          onClick={onBack}
          aria-label="Voltar"
          className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-card transition-colors hover:bg-muted/50 active:scale-[0.96]"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div className="min-w-0">
          <h1 className="truncate text-[17px] font-bold leading-tight tracking-tight text-foreground">
            Planejamento Inteligente
          </h1>
          <p className="text-[11px] leading-tight text-muted-foreground/80">
            Defina sua meta e descubra o R$/km ideal para fechar o mês.
          </p>
        </div>
      </div>
    </header>
  );
}

interface HubCardProps {
  to: string;
  icon: React.ReactNode;
  title: string;
  description: string;
  tone: "primary" | "teal";
  delayMs?: number;
}

function HubCard({ to, icon, title, description, tone, delayMs = 0 }: HubCardProps) {
  const navigate = useNavigate();
  const toneClasses =
    tone === "primary"
      ? "border-primary/30 bg-gradient-to-br from-primary/[0.09] via-primary/[0.04] to-transparent shadow-[0_0_0_1px_hsl(var(--primary)/0.10),0_14px_36px_-22px_hsl(var(--primary)/0.55)] hover:border-primary/45"
      : "border-teal-500/25 bg-gradient-to-br from-teal-500/[0.09] via-teal-500/[0.04] to-transparent shadow-[0_0_0_1px_hsl(180_70%_45%/0.10),0_14px_36px_-22px_hsl(180_70%_45%/0.45)] hover:border-teal-500/40";
  const iconWrap =
    tone === "primary"
      ? "bg-primary/12 text-primary"
      : "bg-teal-500/15 text-teal-300";

  return (
    <button
      type="button"
      onClick={() => navigate(to)}
      style={{ animationDelay: `${delayMs}ms` }}
      className={cn(
        "group flex w-full items-center gap-3.5 rounded-2xl border p-4 text-left",
        "transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]",
        "animate-fade-in active:scale-[0.985]",
        toneClasses,
      )}
    >
      <span
        className={cn(
          "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl",
          iconWrap,
        )}
      >
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <div className="text-[15px] font-semibold leading-tight text-foreground">
          {title}
        </div>
        <p className="mt-1 text-[12px] leading-snug text-muted-foreground">
          {description}
        </p>
      </div>
      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
    </button>
  );
}

export default function PlanejamentoInteligente() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen">
      <PlanHeader onBack={() => navigate("/ajustes")} />

      <div className="space-y-4 px-4 py-6">
        <div className="space-y-2.5">
          <HubCard
            to="/ajustes/planejamento/metas"
            icon={<Target className="h-5 w-5" />}
            title="Metas Inteligentes"
            description="Defina sua meta mensal e seus dias de trabalho."
            tone="primary"
            delayMs={0}
          />
          <HubCard
            to="/ajustes/planejamento/km"
            icon={<Gauge className="h-5 w-5" />}
            title="KM Inteligente"
            description="Descubra o R$/km mínimo aceitável para suas corridas."
            tone="teal"
            delayMs={80}
          />
        </div>

        {/* Connection line */}
        <div className="flex items-center gap-2 px-3 pt-2">
          <span className="h-px flex-1 bg-border/60" />
          <span className="inline-flex items-center gap-1.5 text-[11px] leading-snug text-muted-foreground/90">
            <Route className="h-3.5 w-3.5 text-muted-foreground/80" />
            Sua meta define o caminho. O KM Inteligente ajusta a rota.
          </span>
          <span className="h-px flex-1 bg-border/60" />
        </div>
      </div>
    </div>
  );
}
