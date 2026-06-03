import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ArrowLeft, Brain } from "lucide-react";
import { cn } from "@/lib/utils";
import { useData } from "@/context/DataContext";
import { EmptyState } from "@/components/planejamento/EmptyState";
import { GuidedFlow } from "@/components/planejamento/GuidedFlow";
import { PainelResumo } from "@/components/planejamento/PainelResumo";
import { AjustarSheet, type AjustarOpcao } from "@/components/planejamento/AjustarSheet";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type Mode = "panel" | "flow";
type FlowVariant = "fresh" | "prefill" | "edit";

interface FlowConfig {
  variant: FlowVariant;
  initialStep?: number;
  initialDraft?: Partial<{
    goalType: "bruto" | "liquido";
    monthlyGoal: number;
    selectedDates: string[];
    avgKmPerDay: number;
  }>;
  editSteps?: number[];
}

interface PlanningResumeState {
  variant: "fresh" | "prefill";
  step: number;
  draft: {
    goalType: "bruto" | "liquido";
    monthlyGoal: number;
    selectedDates: string[];
    avgKmPerDay: number;
  };
}

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
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary ring-1 ring-inset ring-current/15 shadow-[0_0_12px_-6px_currentColor]">
          <Brain className="h-4 w-4" />
        </span>
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


export default function PlanejamentoInteligente() {
  const navigate = useNavigate();
  const location = useLocation();
  const returnTo = (location.state as { returnTo?: string } | null)?.returnTo;
  const planningResume = (location.state as { planningResume?: PlanningResumeState } | null)
    ?.planningResume;

  const { settings, loading } = useData();
  const [mode, setMode] = useState<Mode>("panel");
  const [flowConfig, setFlowConfig] = useState<FlowConfig>({ variant: "fresh" });
  const [confirmRedo, setConfirmRedo] = useState(false);
  const [adjustOpen, setAdjustOpen] = useState(false);

  // Restaurar contexto vindo da Central de Veículos
  const resumeKey = useMemo(
    () => (planningResume ? JSON.stringify(planningResume) : null),
    [planningResume],
  );
  useEffect(() => {
    if (!planningResume) return;
    setFlowConfig({
      variant: planningResume.variant,
      initialStep: planningResume.step,
      initialDraft: planningResume.draft,
    });
    setMode("flow");
    // Limpa o state para não restaurar de novo em refresh
    navigate(location.pathname, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resumeKey]);

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [mode]);

  const isConfigured = settings.planningStatus === "configured";

  const handleAdjustSelect = (opcao: AjustarOpcao) => {
    setAdjustOpen(false);
    if (opcao === "custos") {
      navigate("/ajustes/veiculos/custos", {
        state: { returnTo: "/ajustes/planejamento" },
      });
      return;
    }
    const editSteps: Record<Exclude<AjustarOpcao, "custos">, number[]> = {
      meta: [1, 2],
      dias: [3],
      kmDia: [4],
    };
    setFlowConfig({
      variant: "edit",
      editSteps: editSteps[opcao],
    });
    setMode("flow");
  };

  if (mode === "flow") {
    return (
      <GuidedFlow
        prefill={flowConfig.variant === "prefill"}
        initialStep={flowConfig.initialStep}
        initialDraft={flowConfig.initialDraft}
        editMode={
          flowConfig.variant === "edit" && flowConfig.editSteps
            ? { steps: flowConfig.editSteps }
            : undefined
        }
        onCancel={() => setMode("panel")}
        onDone={() => setMode("panel")}
      />
    );
  }

  return (
    <div className="flex min-h-[100dvh] flex-col">
      <PlanHeader onBack={() => navigate(returnTo ?? "/ajustes")} />

      {loading ? (
        <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
          Carregando...
        </div>
      ) : !isConfigured ? (
        <EmptyState
          onStart={() => {
            setFlowConfig({ variant: "fresh" });
            setMode("flow");
          }}
        />
      ) : (
        <>
          <PainelResumo
            onAdjust={() => setAdjustOpen(true)}
            onRedo={() => setConfirmRedo(true)}
          />

          <div className="pb-28" />

        </>
      )}

      <AjustarSheet
        open={adjustOpen}
        onOpenChange={setAdjustOpen}
        onSelect={handleAdjustSelect}
      />

      <AlertDialog open={confirmRedo} onOpenChange={setConfirmRedo}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Refazer planejamento?</AlertDialogTitle>
            <AlertDialogDescription>
              Isso não apaga seus registros, veículo ou custos. Apenas refaz seu planejamento.
              Seu planejamento atual continua valendo até você concluir o novo fluxo.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setConfirmRedo(false);
                setFlowConfig({ variant: "fresh" });
                setMode("flow");
              }}
            >
              Refazer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
