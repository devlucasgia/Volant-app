import { PageHeader } from "@/components/ui-bits";
import { Button } from "@/components/ui/button";
import { useTimer, formatHMS } from "@/context/TimerContext";
import { Play, Pause, RotateCcw, Coffee, Timer as TimerIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export default function Journey() {
  const { state, workMs, restMs, start, pauseRest, resumeWork, reset } = useTimer();

  const statusLabel =
    state === "running" ? "Trabalhando" :
    state === "resting" ? "Em descanso" : "Parado";

  const ringClass =
    state === "running" ? "from-primary to-primary/40" :
    state === "resting" ? "from-warning to-warning/40" :
    "from-muted to-muted/40";

  return (
    <>
      <PageHeader title="Jornada" subtitle="Controle do seu tempo de trabalho" />
      <div className="space-y-5 px-4 pt-4">
        {/* Main timer */}
        <div className="rounded-3xl border border-border bg-card p-6 text-center shadow-elevated">
          <div className="mx-auto mb-4 flex h-12 items-center justify-center gap-2 text-sm font-medium text-muted-foreground">
            <TimerIcon className="h-4 w-4" />
            <span>{statusLabel}</span>
            {state !== "idle" && (
              <span className={cn(
                "ml-1 inline-block h-2 w-2 rounded-full",
                state === "running" ? "bg-primary animate-pulse" : "bg-warning"
              )} />
            )}
          </div>
          <div className={cn(
            "mx-auto grid h-52 w-52 place-items-center rounded-full bg-gradient-to-br p-1",
            ringClass
          )}>
            <div className="grid h-full w-full place-items-center rounded-full bg-card">
              <div className="text-4xl font-bold tabular-nums">{formatHMS(workMs)}</div>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-muted p-3">
              <div className="text-xs text-muted-foreground">Trabalhado</div>
              <div className="text-lg font-bold tabular-nums">{formatHMS(workMs)}</div>
            </div>
            <div className="rounded-xl bg-muted p-3">
              <div className="text-xs text-muted-foreground">Descanso</div>
              <div className="text-lg font-bold tabular-nums">{formatHMS(restMs)}</div>
            </div>
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
          {state !== "idle" && (
            <Button
              onClick={() => { if (confirm("Zerar o timer? Os tempos serão perdidos.")) reset(); }}
              variant="ghost"
              className="h-12 w-full text-muted-foreground"
            >
              <RotateCcw className="mr-2 h-4 w-4" /> Zerar
            </Button>
          )}
        </div>

        <p className="text-center text-xs text-muted-foreground">
          O timer continua mesmo se você fechar ou trocar de tela.
        </p>
      </div>
    </>
  );
}
