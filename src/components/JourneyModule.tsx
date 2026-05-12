import { useState } from "react";
import { Button } from "@/components/ui/button";
import { NumberField } from "@/components/NumberField";
import { Label } from "@/components/ui/label";
import { useTimer, formatHMS } from "@/context/TimerContext";
import { useData } from "@/context/DataContext";
import { useUI } from "@/context/UIContext";
import { Play, RotateCcw, Coffee, Timer as TimerIcon, StopCircle, CheckCircle2, Target } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription } from "@/components/ui/drawer";

export function JourneyModule() {
  const { state, workMs, restMs, start, pauseRest, resumeWork, endJourney, reset } = useTimer();
  const { settings, updateSettings } = useData();
  const { openDrawer } = useUI();

  const [confirmEnd, setConfirmEnd] = useState(false);
  const [goalOpen, setGoalOpen] = useState(false);
  const [goalValue, setGoalValue] = useState<number | null>(settings.dailyGoal || null);
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
    setGoalValue(settings.dailyGoal || null);
    setPendingResetThenStart(resetFirst);
    setGoalOpen(true);
  };

  const confirmGoalAndStart = async () => {
    const v = goalValue ?? 0;
    if (v !== settings.dailyGoal) {
      try { await updateSettings({ dailyGoal: v }); } catch { /* noop */ }
    }
    setGoalOpen(false);
    if (pendingResetThenStart) reset();
    // small delay-free start; reset is sync state setter
    start();
  };

  const handleEndConfirmed = () => {
    const workedHours = workMs / (1000 * 60 * 60);
    endJourney();
    // open new earning form with worked hours prefilled
    setTimeout(() => {
      openDrawer({ tab: "earning", prefillHours: workedHours });
    }, 200);
  };

  return (
    <section className="rounded-2xl border border-border bg-card p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <span className={cn("h-1.5 w-1.5 rounded-full", statusDot)} />
          {statusLabel}
        </div>
        {isEnded && <CheckCircle2 className="h-4 w-4 text-success" />}
      </div>

      {/* Compact timer — visually centered */}
      <div className="flex flex-col items-center justify-center rounded-xl bg-muted/40 px-4 py-4">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Tempo</span>
        <span className="mt-1 text-4xl font-bold tabular-nums leading-none">{formatHMS(workMs)}</span>
      </div>

      {/* Mini stats */}
      <div className={cn("mt-3 grid gap-2", isEnded ? "grid-cols-3" : "grid-cols-2")}>
        <div className="rounded-lg bg-muted/50 px-3 py-2">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Trabalhado</div>
          <div className="text-sm font-bold tabular-nums">{formatHMS(workMs)}</div>
        </div>
        <div className="rounded-lg bg-muted/50 px-3 py-2">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Descanso</div>
          <div className="text-sm font-bold tabular-nums">{formatHMS(restMs)}</div>
        </div>
        {isEnded && (
          <div className="rounded-lg bg-success/10 px-3 py-2">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Total</div>
            <div className="text-sm font-bold tabular-nums">{formatHMS(totalMs)}</div>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="mt-3 space-y-2">
        {state === "idle" && (
          <Button onClick={() => openGoal(false)} className="h-11 w-full gradient-success text-primary-foreground">
            <Play className="mr-2 h-4 w-4" /> Iniciar jornada
          </Button>
        )}
        {state === "running" && (
          <Button onClick={pauseRest} variant="outline" className="h-11 w-full">
            <Coffee className="mr-2 h-4 w-4" /> Pausar para descanso
          </Button>
        )}
        {state === "resting" && (
          <Button onClick={resumeWork} className="h-11 w-full gradient-success text-primary-foreground">
            <Play className="mr-2 h-4 w-4" /> Retornar do descanso
          </Button>
        )}
        {isActive && (
          <Button
            onClick={() => setConfirmEnd(true)}
            variant="outline"
            className="h-10 w-full border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
          >
            <StopCircle className="mr-2 h-4 w-4" /> Encerrar jornada
          </Button>
        )}
        {isEnded && (
          <>
            <Button onClick={() => openGoal(true)} className="h-11 w-full gradient-success text-primary-foreground">
              <Play className="mr-2 h-4 w-4" /> Iniciar nova jornada
            </Button>
            <Button onClick={reset} variant="ghost" className="h-9 w-full text-muted-foreground">
              <RotateCcw className="mr-2 h-4 w-4" /> Limpar tempos
            </Button>
          </>
        )}
      </div>

      <p className="mt-3 text-center text-[11px] text-muted-foreground">
        {isEnded
          ? "A jornada anterior foi encerrada. Inicie uma nova quando quiser."
          : "O timer continua mesmo se você fechar ou trocar de tela."}
      </p>

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
            <DrawerHeader>
              <DrawerTitle className="flex items-center gap-2">
                <Target className="h-4 w-4 text-primary" /> Meta da jornada
              </DrawerTitle>
              <DrawerDescription>Defina sua meta para hoje.</DrawerDescription>
            </DrawerHeader>
            <div className="space-y-2 px-4 pb-2">
              <Label>Meta (R$)</Label>
              <NumberField
                currency
                value={goalValue}
                onChange={setGoalValue}
                autoFocus
              />
            </div>
            <div className="flex gap-2 px-4 py-3 pb-[calc(env(safe-area-inset-bottom)+12px)]">
              <Button variant="outline" className="flex-1" onClick={() => setGoalOpen(false)}>
                Cancelar
              </Button>
              <Button className="flex-1 gradient-success text-primary-foreground" onClick={confirmGoalAndStart}>
                <Play className="mr-2 h-4 w-4" /> Iniciar jornada
              </Button>
            </div>
          </div>
        </DrawerContent>
      </Drawer>
    </section>
  );
}
