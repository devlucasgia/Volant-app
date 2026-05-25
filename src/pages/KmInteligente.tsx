import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Target, ChevronRight } from "lucide-react";
import { SmartKmSection } from "@/components/account/SmartKmSection";

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
        <div className="min-w-0">
          <h1 className="truncate text-[17px] font-bold leading-tight tracking-tight text-foreground">
            KM Inteligente
          </h1>
          <p className="text-[11px] leading-tight text-muted-foreground/80">
            Descubra o R$/km mínimo aceitável para suas corridas.
          </p>
        </div>
      </div>
    </header>
  );
}

export default function KmInteligente() {
  const navigate = useNavigate();
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, []);
  return (
    <div className="min-h-screen">
      <ScreenHeader onBack={() => navigate("/ajustes")} />

      <div className="space-y-3 px-4 py-5 animate-fade-in">
        <SmartKmSection />

        {/* Shortcut to Goals */}
        <button
          type="button"
          onClick={() => navigate("/ajustes/planejamento/metas")}
          className="group mt-3 flex w-full items-center gap-3 rounded-2xl border border-primary/25 bg-gradient-to-br from-primary/[0.07] via-primary/[0.03] to-transparent p-3.5 text-left transition-all duration-300 active:scale-[0.985] hover:border-primary/40"
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/12 text-primary">
            <Target className="h-4 w-4" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="text-[13px] font-semibold leading-tight">Ajustar Metas Inteligentes</div>
            <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">
              Altere sua meta ou seus dias para recalcular o KM.
            </p>
          </div>
          <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
        </button>
      </div>
    </div>
  );
}
