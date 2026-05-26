import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ArrowLeft, Wallet } from "lucide-react";
import { VehicleCostsCard } from "@/components/vehicle/VehicleCostsCard";

export default function CustosVeiculo() {
  const navigate = useNavigate();
  const location = useLocation();
  const returnTo = (location.state as { returnTo?: string } | null)?.returnTo;
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, []);

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-20 border-b border-border bg-background/85 backdrop-blur-lg">
        <div className="flex items-center gap-3 px-3 py-3">
          <button
            type="button"
            onClick={() => navigate(returnTo ?? "/ajustes/veiculos")}
            aria-label="Voltar"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-card transition-colors hover:bg-muted/50 active:scale-[0.96]"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-cyan-500/10 text-cyan-300 ring-1 ring-inset ring-current/15 shadow-[0_0_12px_-6px_currentColor]">
            <Wallet className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <h1 className="truncate text-[17px] font-bold leading-tight tracking-tight text-foreground">
              Custos do veículo
            </h1>
            <p className="text-[11px] leading-tight text-muted-foreground/80">
              Cadastre os custos usados nos cálculos do Volant.
            </p>
          </div>
        </div>
      </header>

      <div className="px-4 py-5 animate-fade-in">
        <VehicleCostsCard />
      </div>
    </div>
  );
}
