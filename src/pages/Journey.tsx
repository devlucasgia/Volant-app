import { useState } from "react";
import { PageHeader } from "@/components/ui-bits";
import { Button } from "@/components/ui/button";
import { useTimer, formatHMS } from "@/context/TimerContext";
import { Play, RotateCcw, Coffee, Timer as TimerIcon, StopCircle, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
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

export default function Journey() {
  const { state, workMs, restMs, start, pauseRest, resumeWork, endJourney, reset } = useTimer();
  const [confirmEnd, setConfirmEnd] = useState(false);

  const totalMs = workMs + restMs;
  const isEnded = state === "ended";

  const statusLabel =
    state === "running" ? "Trabalhando" :
    state === "resting" ? "Em descanso" :
    state === "ended" ? "Jornada encerrada" : "Parado";

  const ringClass =
    state === "running" ? "from-primary to-primary/40" :
    state === "resting" ? "from-warning to-warning/40" :
    state === "ended" ? "from-muted-foreground/40 to-muted-foreground/10" :
    "from-muted to-muted/40";

  return (
    <>
      <PageHeader title="Jornada" subtitle="Controle do seu tempo de trabalho" />
      <div className="space-y-5 px-4 pt-4">
        {/* Main timer */}
        <div className="rounded-3xl border border-border bg-card p-6 text-center shadow-elevated">
          <div className="mx-auto mb-4 flex h-12 items-center justify-center gap-2 text-sm font-medium text-muted-foreground">
            {isEnded ? <CheckCircle2 className="h-4 w-4 text-success" /> : <TimerIcon className="h-4 w-4" />}
            <span>{statusLabel}</span>
            {state === "running" || state === "resting" ? (
              <span className={cn(
                "ml-1 inline-block h-2 w-2 rounded-full",
                state === "running" ? "bg-primary animate-pulse" : "bg-warning"
              )} />
            ) : null}
          </div>
          <div className={cn(
            "mx-auto grid h-52 w-52 place-items-center rounded-full bg-gradient-to-br p-1",
            ringClass
          )}>
            <div className="grid h-full w-full place-items-center rounded-full bg-card">
              <div className="text-4xl font-bold tabular-nums">{formatHMS(workMs)}</div>
            </div>
          </div>

          <div className={cn("mt-6 grid gap-3", isEnded ? "grid-cols-3" : "grid-cols-2")}>
            <div className="rounded-xl bg-muted p-3">
              <div className="text-xs text-muted-foreground">Trabalhado</div>
              <div className="text-lg font-bold tabular-nums">{formatHMS(workMs)}</div>
            </div>
            <div className="rounded-xl bg-muted p-3">
              <div className="text-xs text-muted-foreground">Descanso</div>
              <div className="text-lg font-bold tabular-nums">{formatHMS(restMs)}</div>
            </div>
            {isEnded && (
              <div className="rounded-xl bg-success/10 p-3">
                <div className="text-xs text-muted-foreground">Total</div>
                <div className="text-lg font-bold tabular-nums">{formatHMS(totalMs)}</div>
              </div>
            )}
          </div>
        </div>

        {/* Controls */}
        <div className="space-y-2">
          {state === "idle" && (
            <Button onClick={start} className="h-14 w-full gradient-success text-primary-foreground text-base">
              <Play className="mr-2 h-5 w-5" /> Iniciar jornada
            </Button>
          )}
          {state === "running" && (
            <Button onClick={pauseRest} className="h-14 w-full text-base" variant="outline">
              <Coffee className="mr-2 h-5 w-5" /> Pausar para descanso
            </Button>
          )}
          {state === "resting" && (
            <Button onClick={resumeWork} className="h-14 w-full gradient-success text-primary-foreground text-base">
              <Play className="mr-2 h-5 w-5" /> Retornar do descanso
            </Button>
          )}

          {(state === "running" || state === "resting") && (
            <Button
              onClick={() => setConfirmEnd(true)}
              variant="outline"
              className="h-12 w-full border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
            >
              <StopCircle className="mr-2 h-5 w-5" /> Encerrar jornada
            </Button>
          )}

          {isEnded && (
            <Button
              onClick={() => { reset(); start(); }}
              className="h-14 w-full gradient-success text-primary-foreground text-base"
            >
              <Play className="mr-2 h-5 w-5" /> Iniciar nova jornada
            </Button>
          )}

          {state !== "idle" && !isEnded && (
            <Button
              onClick={() => { if (confirm("Zerar o timer? Os tempos serão perdidos.")) reset(); }}
              variant="ghost"
              className="h-12 w-full text-muted-foreground"
            >
              <RotateCcw className="mr-2 h-4 w-4" /> Zerar
            </Button>
          )}

          {isEnded && (
            <Button
              onClick={reset}
              variant="ghost"
              className="h-12 w-full text-muted-foreground"
            >
              <RotateCcw className="mr-2 h-4 w-4" /> Limpar tempos
            </Button>
          )}
        </div>

        <p className="text-center text-xs text-muted-foreground">
          {isEnded
            ? "A jornada anterior foi encerrada. Inicie uma nova quando quiser."
            : "O timer continua mesmo se você fechar ou trocar de tela."}
        </p>
      </div>

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
              onClick={endJourney}
            >
              Encerrar jornada
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
