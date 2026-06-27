import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ArrowLeft, Brain } from "lucide-react";

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
  isRedo?: boolean;
  /** Quando definido, GuidedFlow opera no "modo next" (grava no slot next_plan_*). */
  targetMonth?: Date;
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
  returnTo?: string;
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
            Seus objetivos e acompanhamento do mês
          </p>
        </div>
      </div>
    </header>
  );
}


export default function PlanejamentoInteligente() {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as { returnTo?: string; planningResume?: PlanningResumeState } | null;
  const returnTo = state?.returnTo;
  const planningResume = state?.planningResume;

  const { settings, loading, updateSettings } = useData();
  const [mode, setMode] = useState<Mode>("panel");
  const [flowConfig, setFlowConfig] = useState<FlowConfig>({ variant: "fresh" });
  const [confirmRedo, setConfirmRedo] = useState(false);
  const [confirmCancelNext, setConfirmCancelNext] = useState(false);
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
    
    // Limpa o planningResume para não restaurar de novo em refresh,
    // mas preserva o returnTo (pode vir do planningResume ou do state original)
    const finalReturnTo = planningResume.returnTo || returnTo;
    navigate(location.pathname, { 
      replace: true, 
      state: finalReturnTo ? { returnTo: finalReturnTo } : undefined 
    });
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
    // Meta agora é sempre líquida — passo 1 (bruto/líquido) some do fluxo de ajuste.
    const editSteps: Record<Exclude<AjustarOpcao, "custos">, number[]> = {
      meta: [2],
      dias: [3],
      kmDia: [4],
    };
    setFlowConfig({
      variant: "edit",
      editSteps: editSteps[opcao],
    });
    setMode("flow");
  };

  const handlePlanNext = () => {
    const now = new Date();
    const targetMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    setFlowConfig({ variant: "fresh", targetMonth });
    setMode("flow");
  };

  const handleCancelNext = async () => {
    await updateSettings({
      nextPlanGoal: null,
      nextPlanGoalType: null,
      nextPlanAvgKm: null,
      nextPlanDates: null,
      nextPlanCreatedAt: null,
    });
  };

  const handleReplicate = () => {
    // Mantém meta/km do plano anterior, mas zera os dias (são do mês passado).
    setFlowConfig({ variant: "prefill", initialDraft: { selectedDates: [] } });
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
        returnTo={returnTo}
        isRedo={flowConfig.isRedo}
        targetMonth={flowConfig.targetMonth}
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
            onPlanNext={handlePlanNext}
            onCancelNext={() => setConfirmCancelNext(true)}
            onReplicate={handleReplicate}
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
            <AlertDialogTitle>Refazer o planejamento?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2">
                <p>
                  Isso{" "}
                  <span className="font-semibold text-destructive">
                    substitui seu plano atual de {new Date().toLocaleDateString("pt-BR", { month: "long" })}
                  </span>{" "}
                  por um novo. O De/Para que está sendo acompanhado é zerado.
                </p>
                <p>
                  Seus registros de ganhos, gastos e veículo não mudam. O plano atual continua valendo até você concluir o novo.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Manter plano atual</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                setConfirmRedo(false);
                setFlowConfig({ variant: "fresh", isRedo: true });
                setMode("flow");
              }}
            >
              Sim, refazer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
