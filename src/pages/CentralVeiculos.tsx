import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Car, Wallet, Wrench, ChevronRight, Warehouse } from "lucide-react";
import { cn } from "@/lib/utils";

function ScreenHeader({ onBack }: { onBack: () => void }) {
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
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Car className="h-4 w-4" />
        </span>
        <div className="min-w-0">
          <h1 className="truncate text-[17px] font-bold leading-tight tracking-tight text-foreground">
            Central de Veículos
          </h1>
          <p className="text-[11px] leading-tight text-muted-foreground/80">
            Organize seus carros, custos e manutenções.
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
  delayMs?: number;
}

function HubCard({ to, icon, title, description, delayMs = 0 }: HubCardProps) {
  const navigate = useNavigate();
  return (
    <button
      type="button"
      onClick={() => navigate(to)}
      style={{ animationDelay: `${delayMs}ms` }}
      className={cn(
        "group flex w-full items-center gap-3.5 rounded-2xl border border-border bg-card p-4 text-left",
        "shadow-[0_1px_0_0_hsl(var(--border)),0_8px_24px_-18px_rgba(0,0,0,0.45)]",
        "transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]",
        "animate-fade-in active:scale-[0.985] hover:bg-card/95 hover:border-primary/35",
      )}
    >
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <div className="text-[15px] font-semibold leading-tight text-foreground">{title}</div>
        <p className="mt-1 text-[12px] leading-snug text-muted-foreground">{description}</p>
      </div>
      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
    </button>
  );
}

export default function CentralVeiculos() {
  const navigate = useNavigate();
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, []);

  return (
    <div className="min-h-screen">
      <ScreenHeader onBack={() => navigate("/ajustes")} />
      <div className="space-y-2.5 px-4 py-6">
        <HubCard
          to="/ajustes/veiculos/carros"
          icon={<Car className="h-5 w-5" />}
          title="Meus carros"
          description="Cadastre e gerencie seus veículos."
          delayMs={0}
        />
        <HubCard
          to="/ajustes/veiculos/custos"
          icon={<Wallet className="h-5 w-5" />}
          title="Custos do veículo"
          description="Cadastre os custos usados nos cálculos do Volant."
          delayMs={60}
        />
        <HubCard
          to="/ajustes/veiculos/manutencao"
          icon={<Wrench className="h-5 w-5" />}
          title="Manutenção preventiva"
          description="Acompanhe revisões, trocas e cuidados importantes."
          delayMs={120}
        />
      </div>
    </div>
  );
}
