import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { NumberField } from "@/components/NumberField";
import { Label } from "@/components/ui/label";
import { useTimer, formatHMS } from "@/context/TimerContext";
import { useData } from "@/context/DataContext";
import { useUI } from "@/context/UIContext";
import { Play, RotateCcw, Coffee, StopCircle, CheckCircle2, Target } from "lucide-react";
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

const readDayGoal = (view: "gross" | "net"): number | null => {
  try {
    // 1) Chave nova por visão
    const raw = localStorage.getItem(goalStorageKey(view));
    if (raw) {
      const n = Number(raw);
      if (n > 0) return n;
    }
    // 2) Migração leve: chave antiga sem visão — usa para a visão ativa e remove.
    const legacy = localStorage.getItem(`volant_day_goal_${todayKey()}`);
    if (legacy) {
      const n = Number(legacy);
      if (n > 0) {
        localStorage.setItem(goalStorageKey(view), String(n));
        localStorage.removeItem(`volant_day_goal_${todayKey()}`);
        return n;
      }
    }
    return null;
  } catch {
    return null;
  }
};

export function JourneyModule() {
  const { state, workMs, restMs, start, pauseRest, resumeWork, endJourney, reset } = useTimer();
  const { settings, entries } = useData();
  const { openDrawer } = useUI();

  // Visually mirrors the Home Líquido/Bruto mode (heroView), não mais o settings.goalType.
  const [heroView] = useHeroMetric();
  const isGross = heroView === "gross";
  const journeyAccentBtn = isGross
    ? "bg-gradient-to-b from-[hsl(var(--goal-gross))] to-[hsl(var(--goal-gross))]/85 text-white shadow-[0_2px_12px_-2px_hsl(var(--goal-gross)/0.55),inset_0_1px_0_hsl(0_0%_100%/0.12)] hover:from-[hsl(var(--goal-gross))]/95 hover:to-[hsl(var(--goal-gross))]/80"
    : "gradient-success text-primary-foreground";

  // Sugestão inteligente: prioriza o motor do Planejamento Inteligente
  // (mesma fonte usada pela Home). Cai para deriveGoals quando o planejamento
  // ainda não foi configurado.
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
  const [goalValue, setGoalValue] = useState<number | null>(readDayGoal(view) ?? suggestedDaily ?? null);
  const [pendingResetThenStart, setPendingResetThenStart] = useState(false);

  const totalMs = workMs + restMs;
  const isEnded = state === "ended";
  const isActive = state === "running" || state === "resting";

  const statusLabel =
    state === "running" ? "Trabalhando" :
    state === "resting" ? "Em descanso" :
    state === "ended" ? "Jornada encerrada" : "Parado";

  const statusDot =
    state === "running" ? "bg-primary animate-pulse" :
    state === "resting" ? "bg-warning" :
    state === "ended" ? "bg-success" : "bg-muted-foreground/40";

  const openGoal = (resetFirst: boolean) => {
    setGoalValue(readDayGoal(view) ?? suggestedDaily ?? null);
    setPendingResetThenStart(resetFirst);
    setGoalOpen(true);
  };

  const confirmGoalAndStart = async () => {
    const v = goalValue ?? 0;
    try {
      const key = goalStorageKey(view);
      if (v > 0) localStorage.setItem(key, String(v));
      else localStorage.removeItem(key);
      window.dispatchEvent(new CustomEvent("volant:dayGoalChanged"));
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

  const hasTime = workMs > 0 || restMs > 0;

  return (
    <section className="relative overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-card to-card/60 p-4 shadow-sm">
      {/* Status pill */}
      <div className="flex items-center justify-between">
        <div className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-background/40 px-2.5 py-1">
          <span className={cn("h-1.5 w-1.5 rounded-full", statusDot)} />
          <span className="text-[10.5px] font-medium uppercase tracking-wider text-muted-foreground">
            {statusLabel}
          </span>
        </div>
        {isEnded && (
          <span className="inline-flex items-center gap-1 text-[10.5px] font-medium text-success">
            <CheckCircle2 className="h-3 w-3" /> Concluída
          </span>
        )}
      </div>

      {/* Cronômetro hero */}
      <div className="mt-3 text-center">
        <div
          className={cn(
            "text-[44px] font-bold tabular-nums leading-none tracking-tight transition-colors",
            state === "running" && (isGross ? "text-[hsl(var(--goal-gross))]" : "text-success"),
            state === "resting" && "text-warning",
            state === "ended" && "text-foreground",
            state === "idle" && "text-foreground/85",
          )}
        >
          {formatHMS(workMs)}
        </div>
        {hasTime ? (
          <div className="mt-1.5 flex items-center justify-center gap-3 text-[11px] text-muted-foreground">
            <span>
              Trab. <span className="font-semibold tabular-nums text-foreground/85">{formatHMS(workMs)}</span>
            </span>
            <span className="h-2.5 w-px bg-border/70" />
            <span className="inline-flex items-center gap-1">
              <Coffee className="h-3 w-3" />
              <span className="font-semibold tabular-nums text-foreground/85">{formatHMS(restMs)}</span>
            </span>
          </div>
        ) : (
          <div className="mt-1.5 text-[11px] text-muted-foreground">Tempo trabalhado hoje</div>
        )}
      </div>

      {/* Controls */}
      <div className="mt-4">
        {state === "idle" && (
          <Button onClick={() => openGoal(false)} className={cn("h-11 w-full transition-colors duration-500", journeyAccentBtn)}>
            <Play className="mr-2 h-4 w-4" /> Iniciar jornada
          </Button>
        )}

        {state === "running" && (
          <div className="flex gap-2">
            <Button onClick={pauseRest} variant="outline" className="h-10 flex-1">
              <Coffee className="mr-2 h-4 w-4" /> Descanso
            </Button>
            <Button
              onClick={() => setConfirmEnd(true)}
              variant="outline"
              size="icon"
              className="h-10 w-10 shrink-0 border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
              aria-label="Encerrar jornada"
            >
              <StopCircle className="h-4 w-4" />
            </Button>
          </div>
        )}

        {state === "resting" && (
          <div className="flex gap-2">
            <Button onClick={resumeWork} className={cn("h-10 flex-1 transition-colors duration-500", journeyAccentBtn)}>
              <Play className="mr-2 h-4 w-4" /> Retornar
            </Button>
            <Button
              onClick={() => setConfirmEnd(true)}
              variant="outline"
              size="icon"
              className="h-10 w-10 shrink-0 border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
              aria-label="Encerrar jornada"
            >
              <StopCircle className="h-4 w-4" />
            </Button>
          </div>
        )}

        {isEnded && (
          <div className="flex gap-2">
            <Button onClick={() => openGoal(true)} className={cn("h-10 flex-1 transition-colors duration-500", journeyAccentBtn)}>
              <Play className="mr-2 h-4 w-4" /> Nova jornada
            </Button>
            <Button onClick={reset} variant="outline" size="icon" className="h-10 w-10 shrink-0 text-muted-foreground" aria-label="Limpar tempos">
              <RotateCcw className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      {/* End confirmation */}
      <AlertDialog open={confirmEnd} onOpenChange={setConfirmEnd}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deseja encerrar a jornada?</AlertDialogTitle>
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
              Encerrar jornada
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Goal modal */}
      <Drawer open={goalOpen} onOpenChange={setGoalOpen}>
        <DrawerContent>
          <div className="mx-auto w-full max-w-md">
            <DrawerHeader className="items-center text-center pb-2">
              <div className="mx-auto mb-2 flex h-11 w-11 items-center justify-center rounded-full bg-primary/10">
                <Target className="h-5 w-5 text-primary" />
              </div>
              <DrawerTitle className="text-center text-lg">Meta da jornada</DrawerTitle>
              <DrawerDescription className="text-center text-[13px] leading-snug">
                Defina quanto você quer ganhar hoje. Esta meta vale apenas para o dia de hoje.
              </DrawerDescription>
            </DrawerHeader>
            <div className="space-y-2 px-5 pb-1">
              <Label className="text-xs text-muted-foreground">Meta (R$)</Label>
              <NumberField
                currency
                value={goalValue}
                onChange={setGoalValue}
                autoFocus
              />
              {suggestedDaily > 0 && (
                <p className="text-[11px] text-muted-foreground">
                  Sugestão inteligente: R$ {suggestedDaily.toLocaleString("pt-BR")}
                </p>
              )}
            </div>
            <div className="flex gap-2 px-5 py-4 pb-[calc(env(safe-area-inset-bottom)+16px)]">
              <Button variant="outline" className="h-11 flex-1" onClick={() => setGoalOpen(false)}>
                Cancelar
              </Button>
              <Button className="h-11 flex-1 gradient-success text-primary-foreground" onClick={confirmGoalAndStart}>
                <Play className="mr-2 h-4 w-4" /> Iniciar jornada
              </Button>
            </div>
          </div>
        </DrawerContent>
      </Drawer>
    </section>
  );
}
