import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { NumberField } from "@/components/NumberField";
import { Label } from "@/components/ui/label";
import { useTimer, formatHMS } from "@/context/TimerContext";

function formatCompactDuration(ms: number): string {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  if (totalSec < 60) return `${totalSec}s`;
  const totalMin = Math.floor(totalSec / 60);
  if (totalMin < 60) return `${totalMin}m`;
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return m > 0 ? `${h}h${m}m` : `${h}h`;
}
import { useData } from "@/context/DataContext";
import { useUI } from "@/context/UIContext";
import { Play, RotateCcw, Coffee, Square, CheckCircle2, Target, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { deriveGoals } from "@/lib/stats";
import { useHeroMetric } from "@/lib/heroMetric";
import { usePlanningSnapshot } from "@/lib/planningEngine";
import { format } from "date-fns";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription } from "@/components/ui/drawer";

const todayKey = () => format(new Date(), "yyyy-MM-dd");
const goalStorageKey = (view: "gross" | "net") =>
  `volant_day_goal_${view}_${todayKey()}`;
const folgaWorkedKey = () => `volant_folga_worked_${todayKey()}`;

interface JourneyModuleProps {
  isFolgaToday?: boolean;
}

export function JourneyModule({ isFolgaToday = false }: JourneyModuleProps) {
  const { state, workMs, restMs, start, pauseRest, resumeWork, endJourney, reset } = useTimer();
  const { settings, entries } = useData();
  const { openDrawer } = useUI();

  const [heroView] = useHeroMetric();
  const isGross = heroView === "gross";
  const journeyAccentBtn = isGross
    ? "bg-gradient-to-b from-[hsl(var(--goal-gross))] to-[hsl(var(--goal-gross))]/85 text-white shadow-[0_2px_12px_-2px_hsl(var(--goal-gross)/0.55),inset_0_1px_0_hsl(0_0%_100%/0.12)] hover:from-[hsl(var(--goal-gross))]/95 hover:to-[hsl(var(--goal-gross))]/80"
    : "gradient-success text-primary-foreground";

  // Cor da borda pulsante por modo
  const pulseBorder = isGross
    ? "border-[hsl(var(--goal-gross))]/70"
    : "border-success/70";

  const plan = usePlanningSnapshot();
  const suggestedDaily = useMemo(() => {
    const fromPlan = isGross ? plan.homeDailyGross : plan.homeDailyNet;
    if (fromPlan && fromPlan > 0) return Math.round(fromPlan);
    const fallback = deriveGoals(settings.monthlyGoal, entries, new Date(), {
      goalType: isGross ? "bruto" : "liquido",
      workingDays: settings.workingDaysPerMonth,
      remainingWorkingDays: settings.remainingWorkingDays,
    }).daily;
    return Math.round(fallback || 0);
  }, [isGross, plan.homeDailyGross, plan.homeDailyNet, settings.monthlyGoal, entries, settings.workingDaysPerMonth, settings.remainingWorkingDays]);

  const view: "gross" | "net" = isGross ? "gross" : "net";
  const [confirmEnd, setConfirmEnd] = useState(false);
  const [goalOpen, setGoalOpen] = useState(false);
  const [goalValue, setGoalValue] = useState<number | null>(null);
  const [pendingResetThenStart, setPendingResetThenStart] = useState(false);

  const isEnded = state === "ended";

  const statusLabel =
    state === "running" ? "Trabalhando" :
    state === "resting" ? "Em descanso" :
    state === "ended" ? "Jornada encerrada" : "Parado";

  const statusDot =
    state === "running" ? "bg-primary animate-pulse" :
    state === "resting" ? "bg-warning" :
    state === "ended" ? "bg-success" : "bg-muted-foreground/40";

  const openGoal = (resetFirst: boolean) => {
    // Item 3: campo inicia vazio. Sem pré-preenchimento.
    setGoalValue(null);
    setPendingResetThenStart(resetFirst);
    setGoalOpen(true);
  };

  const confirmGoalAndStart = () => {
    const v = goalValue ?? 0;
    try {
      const key = goalStorageKey(view);
      if (v > 0) localStorage.setItem(key, String(v));
      else localStorage.removeItem(key);
      window.dispatchEvent(new CustomEvent("volant:dayGoalChanged"));

      // Item 4: se hoje é folga e o motorista decidiu trabalhar, marca a flag
      // de sessão para a Home transicionar para o estado normal de trabalho.
      if (isFolgaToday) {
        localStorage.setItem(folgaWorkedKey(), "1");
        window.dispatchEvent(new CustomEvent("volant:folgaWorkedChanged"));
      }
    } catch { /* noop */ }
    setGoalOpen(false);
    if (pendingResetThenStart) reset();
    start();
  };

  const handleEndConfirmed = () => {
    const final = endJourney();
    const workedHours = final.workMs / (1000 * 60 * 60);
    setTimeout(() => {
      openDrawer({ tab: "earning", prefillHours: workedHours });
    }, 200);
  };

  const accentText =
    state === "running" ? (isGross ? "text-[hsl(var(--goal-gross))]" : "text-success") :
    state === "resting" ? "text-warning" :
    "text-foreground";

  // Feedback condicional no modal (Item 3)
  const feedback = useMemo(() => {
    if (!goalValue || goalValue <= 0 || !suggestedDaily) return null;
    if (goalValue > suggestedDaily) {
      return { text: "Boa! Os próximos dias ficam mais tranquilos.", cls: "text-success" };
    }
    if (goalValue < suggestedDaily) {
      return { text: "Os próximos dias vão precisar compensar.", cls: "text-warning" };
    }
    return null;
  }, [goalValue, suggestedDaily]);

  // ===== Estado IDLE — card inteiro clicável, apenas ícone Play centralizado =====
  if (state === "idle") {
    const isFolga = isFolgaToday;
    const playColor = isGross ? "text-[hsl(var(--goal-gross))]" : "text-success";
    return (
      <>
        <button
          type="button"
          onClick={() => openGoal(false)}
          aria-label={isFolga ? "Trabalhar hoje mesmo assim" : "Iniciar jornada"}
          className={cn(
            "group relative flex w-full items-center justify-center rounded-2xl border px-4 py-3 shadow-sm transition-all duration-200 active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
            isFolga
              ? "border-border bg-muted/20"
              : cn("bg-card animate-breath", pulseBorder),
          )}
        >
          {isFolga ? (
            <div className="flex items-center justify-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted/60 text-muted-foreground">
                <Coffee className="h-5 w-5" />
              </span>
              <div className="min-w-0 text-center">
                <div className="text-sm font-semibold leading-tight text-muted-foreground">Dia de folga</div>
                <div className="mt-0.5 text-[11px] leading-tight text-muted-foreground">
                  Se quiser rodar hoje mesmo assim, toque aqui
                </div>
              </div>
            </div>
          ) : (
            <Play className={cn("h-10 w-10", playColor)} fill="currentColor" />
          )}

          <ChevronRight className="absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 shrink-0 text-muted-foreground/60 transition-transform group-hover:translate-x-0.5 group-active:translate-x-1" />
        </button>

        {renderGoalDrawer()}
      </>
    );
  }

  function renderGoalDrawer() {
    return (
      <Drawer open={goalOpen} onOpenChange={setGoalOpen}>
        <DrawerContent className="min-h-[60vh] max-h-[92vh]">
          <div className="mx-auto flex w-full max-w-md flex-1 flex-col overflow-hidden">
            <DrawerHeader className="items-center text-center pb-2">
              <div className="mx-auto mb-2 flex h-11 w-11 items-center justify-center rounded-full bg-primary/10">
                <Target className="h-5 w-5 text-primary" />
              </div>
              <DrawerTitle className="text-center text-lg">Meta da jornada</DrawerTitle>
              <DrawerDescription className="text-center text-[13px] leading-snug">
                Sua meta sugerida é calculada pelo Volant com base no que ainda falta pro mês. Você pode ajustar para hoje — se passar da sugestão, os próximos dias ficam mais leves. Se ficar abaixo, eles compensam.
              </DrawerDescription>
            </DrawerHeader>
            <div className="flex-1 space-y-2 overflow-y-auto px-5 pb-1">
              {isFolgaToday && (
                <div className="mb-3 rounded-xl border border-warning/30 bg-warning/10 px-3 py-2 text-[12px] leading-snug text-warning">
                  Hoje é dia de folga no seu planejamento. Se trabalhar, o que você ganhar vai aliviar as metas dos próximos dias.
                </div>
              )}
              <Label className="text-xs text-muted-foreground">Meta (R$)</Label>
              <NumberField
                currency
                value={goalValue}
                onChange={setGoalValue}
                autoFocus
              />
              {suggestedDaily > 0 && (
                <button
                  type="button"
                  onClick={() => setGoalValue(suggestedDaily)}
                  className="mt-1 inline-flex items-center gap-1.5 rounded-full border border-success/40 bg-success/10 px-3 py-1.5 text-[12px] font-semibold text-success transition-colors hover:bg-success/15 active:scale-[0.98]"
                >
                  <span aria-hidden>💡</span>
                  Sugestão do Volant: R$ {suggestedDaily.toLocaleString("pt-BR")} — toque para usar
                </button>
              )}
              <div className={cn("min-h-[16px] text-[11.5px] leading-tight", feedback?.cls)}>
                {feedback?.text}
              </div>
            </div>
            <div className="flex shrink-0 gap-2 border-t border-border/40 px-5 py-4 pb-[calc(env(safe-area-inset-bottom)+16px)]">
              <Button variant="outline" className="h-11 flex-1" onClick={() => setGoalOpen(false)}>
                Cancelar
              </Button>
              <Button className={cn("h-11 flex-1", journeyAccentBtn)} onClick={confirmGoalAndStart}>
                <Play className="mr-2 h-4 w-4" /> Iniciar jornada
              </Button>
            </div>
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  // ===== Estados ativo / em descanso / encerrado =====
  return (
    <section className="flex min-h-[72px] items-center justify-between gap-3 rounded-2xl border border-border bg-card px-4 py-3 shadow-sm">
      {/* Esquerda: cronômetro + label compactos */}
      <div className="flex min-w-0 items-center gap-3">
        {(state === "running" || state === "resting") && (
          <>
            <span className={cn("h-2 w-2 shrink-0 rounded-full", statusDot)} />
            <div className="min-w-0">
              <div className={cn("font-mono tabular-nums text-xl font-semibold leading-none", accentText)}>
                {formatHMS(workMs)}
              </div>
              <div className="mt-1 text-[9px] font-bold uppercase tracking-wider text-muted-foreground leading-none">
                {state === "running" ? "Ao vivo" : "Em descanso"}
              </div>
            </div>
          </>
        )}

        {isEnded && (
          <>
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-success/15 text-success">
              <CheckCircle2 className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <div className="text-sm font-semibold text-foreground leading-tight">Jornada encerrada</div>
              <div className="whitespace-nowrap text-[11px] text-muted-foreground leading-tight tabular-nums">
                {restMs > 0
                  ? `${formatCompactDuration(workMs)} trab. · ${formatCompactDuration(restMs)} pausa`
                  : `${formatCompactDuration(workMs)} trabalhados`}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Direita: botões agrupados com peso visual equivalente */}
      <div className="flex shrink-0 items-center gap-2">
        {state === "running" && (
          <>
            <Button onClick={pauseRest} variant="outline" size="icon" className="h-10 w-10 text-warning" aria-label="Pausar jornada">
              <Coffee className="h-5 w-5" />
            </Button>
            <Button
              onClick={() => setConfirmEnd(true)}
              size="icon"
              className="h-10 w-10 bg-destructive text-destructive-foreground hover:bg-destructive/90"
              aria-label="Encerrar jornada"
            >
              <Square className="h-5 w-5" fill="currentColor" />
            </Button>
          </>
        )}

        {state === "resting" && (
          <>
            <Button onClick={resumeWork} size="icon" className={cn("h-10 w-10 transition-colors duration-500", journeyAccentBtn)} aria-label="Retornar à jornada">
              <Play className="h-5 w-5" fill="currentColor" />
            </Button>
            <Button
              onClick={() => setConfirmEnd(true)}
              size="icon"
              className="h-10 w-10 bg-destructive text-destructive-foreground hover:bg-destructive/90"
              aria-label="Encerrar jornada"
            >
              <Square className="h-5 w-5" fill="currentColor" />
            </Button>
          </>
        )}

        {isEnded && (
          <>
            <Button onClick={() => reset()} size="icon" className={cn("h-10 w-10 transition-colors duration-500", journeyAccentBtn)} aria-label="Nova jornada">
              <RotateCcw className="h-5 w-5" />
            </Button>
          </>
        )}
      </div>
      <span className="sr-only">{statusLabel}</span>

      {/* End confirmation */}
      <AlertDialog open={confirmEnd} onOpenChange={setConfirmEnd}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Encerrar a jornada de hoje?</AlertDialogTitle>
            <AlertDialogDescription>
              Após encerrar, não será possível continuar esta mesma jornada.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleEndConfirmed}
            >
              Encerrar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {renderGoalDrawer()}
    </section>
  );
}
