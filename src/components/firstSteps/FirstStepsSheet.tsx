import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Check, ChevronRight, Play, RotateCcw, GraduationCap } from "lucide-react";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from "@/components/ui/drawer";
import { cn } from "@/lib/utils";
import { useUI } from "@/context/UIContext";
import { useTour } from "@/context/TourContext";
import { earningsTourSteps } from "@/lib/tours/earningsTour";
import { expensesTourSteps } from "@/lib/tours/expensesTour";
import type { FirstStepTask } from "@/lib/firstSteps";
import { videoForFirstStep, type TutorialVideo } from "@/lib/tutorials/videos";
import { useTutorialsWatched } from "@/hooks/useTutorialsWatched";
import { TutorialPlayerSheet } from "@/components/tutorials/TutorialPlayerSheet";

export interface FirstStepsSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tasks: FirstStepTask[];
  done: number;
  total: number;
}

type TourKey = "earnings" | "expenses";

/** Bloco de apoio à direita da tarefa: vídeo, tour, ou nada. */
type Aside =
  | { kind: "video"; video: TutorialVideo }
  | { kind: "tour"; tourKey: TourKey }
  | null;

function asideFor(task: FirstStepTask): Aside {
  // Ganho e gasto SEMPRE mostram tour (decisão travada), mesmo que exista vídeo mapeado.
  if (task.key === "earnings") return { kind: "tour", tourKey: "earnings" };
  if (task.key === "expenses") return { kind: "tour", tourKey: "expenses" };
  const video = videoForFirstStep(task.key);
  return video ? { kind: "video", video } : null;
}

export function FirstStepsSheet({ open, onOpenChange, tasks, done, total }: FirstStepsSheetProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { openDrawer } = useUI();
  const { startTour } = useTour();
  const { markWatched } = useTutorialsWatched();
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;

  const [activeVideo, setActiveVideo] = useState<TutorialVideo | null>(null);
  const [videoOpen, setVideoOpen] = useState(false);

  /** Dispara o tour na Home, aguardando a montagem quando vier de outra rota. */
  const runTourOnHome = (tourKey: TourKey, force: boolean) => {
    const run = () => {
      if (tourKey === "earnings") {
        startTour("earnings", earningsTourSteps, force ? { force: true } : undefined);
      } else {
        startTour("expenses", expensesTourSteps, force ? { force: true } : undefined);
      }
    };
    if (location.pathname !== "/app") {
      navigate("/app");
      window.setTimeout(run, 500);
    } else {
      window.setTimeout(run, 200);
    }
  };

  const handleTaskClick = (task: FirstStepTask) => {
    if (task.done) return;
    // Fecha ANTES de navegar/abrir drawer pra sheet não ficar por cima.
    onOpenChange(false);
    setTimeout(() => {
      if (task.action === "openEntryDrawer") {
        openDrawer();
        return;
      }
      if (task.action === "startEarningsTour") {
        runTourOnHome("earnings", false);
        return;
      }
      if (task.action === "startExpensesTour") {
        runTourOnHome("expenses", false);
        return;
      }
      if (task.route) navigate(task.route, { state: { returnTo: "/app" } });
    }, 60);
  };

  const handleVideoChip = (video: TutorialVideo) => {
    onOpenChange(false);
    setTimeout(() => {
      setActiveVideo(video);
      setVideoOpen(true);
    }, 60);
  };

  const handleTourChip = (tourKey: TourKey) => {
    onOpenChange(false);
    // force: true — o chip existe justamente para refazer um tour já visto.
    setTimeout(() => runTourOnHome(tourKey, true), 60);
  };

  const handleOpenCentral = () => {
    onOpenChange(false);
    setTimeout(() => navigate("/ajustes/tutoriais"), 60);
  };

  return (
    <>
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className="max-h-[85vh]">
          <DrawerHeader className="pb-2">
            <DrawerTitle className="text-[16px] font-bold">Primeiros passos</DrawerTitle>
            <DrawerDescription className="text-[12px]">
              {done} de {total} concluídos
            </DrawerDescription>
          </DrawerHeader>

          <div className="px-4">
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary transition-[width] duration-300"
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>

          <ul className="space-y-2 overflow-y-auto px-4 pt-4">
            {tasks.map((task) => {
              const isDone = task.done;
              const aside = asideFor(task);
              return (
                <li key={task.key}>
                  <div className="flex items-stretch overflow-hidden rounded-xl border border-border/60 bg-card">
                    {/* ZONA 1 — a tarefa */}
                    <button
                      type="button"
                      onClick={isDone ? undefined : () => handleTaskClick(task)}
                      disabled={isDone}
                      className={cn(
                        "flex min-w-0 flex-1 items-center gap-3 p-3 text-left",
                        isDone ? "opacity-60" : "active:opacity-70",
                      )}
                    >
                      <span
                        className={cn(
                          "flex h-[23px] w-[23px] shrink-0 items-center justify-center rounded-full border-2",
                          isDone
                            ? "border-primary bg-primary text-[hsl(222_47%_7%)]"
                            : "border-border bg-transparent",
                        )}
                      >
                        {isDone && <Check className="h-3 w-3" strokeWidth={3.5} />}
                      </span>

                      <span
                        className={cn(
                          "min-w-0 flex-1 text-[13.5px] font-semibold leading-snug",
                          isDone && "text-muted-foreground line-through",
                        )}
                      >
                        {task.label}
                      </span>

                      {!isDone && (
                        <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                      )}
                    </button>

                    {/* ZONA 2 — apoio (nunca riscada, nunca desabilitada) */}
                    {aside && aside.kind === "video" && (
                      <button
                        type="button"
                        onClick={() => handleVideoChip(aside.video)}
                        aria-label={`Ver vídeo: ${aside.video.title}`}
                        className="flex min-w-[64px] items-center justify-center border-l border-border/60 bg-primary/[0.05] px-3 transition-colors active:bg-primary/10"
                      >
                        <span className="flex flex-col items-center gap-0.5">
                          <span className="flex h-[26px] w-[26px] items-center justify-center rounded-full border border-primary/35 bg-primary/15 text-primary">
                            <Play className="h-2.5 w-2.5 fill-current" />
                          </span>
                          <span className="text-[8.5px] font-extrabold tracking-wider text-primary">
                            VÍDEO
                          </span>
                        </span>
                      </button>
                    )}

                    {aside && aside.kind === "tour" && (
                      <button
                        type="button"
                        onClick={() => handleTourChip(aside.tourKey)}
                        aria-label={
                          aside.tourKey === "earnings"
                            ? "Refazer tour de lançamento de ganhos"
                            : "Refazer tour de lançamento de gastos"
                        }
                        className={cn(
                          "flex min-w-[64px] items-center justify-center border-l border-border/60 px-3 transition-colors",
                          aside.tourKey === "earnings"
                            ? "bg-info/[0.05] active:bg-info/10"
                            : "bg-destructive/[0.05] active:bg-destructive/10",
                        )}
                      >
                        <span className="flex flex-col items-center gap-0.5">
                          <span
                            className={cn(
                              "flex h-[26px] w-[26px] items-center justify-center rounded-full border",
                              aside.tourKey === "earnings"
                                ? "border-info/35 bg-info/15 text-info"
                                : "border-destructive/35 bg-destructive/15 text-destructive",
                            )}
                          >
                            <RotateCcw className="h-3 w-3" />
                          </span>
                          <span
                            className={cn(
                              "text-[8.5px] font-extrabold tracking-wider",
                              aside.tourKey === "earnings" ? "text-info" : "text-destructive",
                            )}
                          >
                            TOUR
                          </span>
                        </span>
                      </button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>

          <button
            type="button"
            onClick={handleOpenCentral}
            className="mx-4 mb-4 mt-3 flex items-center justify-center gap-1.5 rounded-lg py-2 text-[12px] text-muted-foreground transition-colors active:text-foreground"
          >
            <GraduationCap className="h-3.5 w-3.5 text-primary" />
            Quer ver tudo? Abra a{" "}
            <span className="font-semibold text-primary">Central de Tutoriais</span>
          </button>
        </DrawerContent>
      </Drawer>

      <TutorialPlayerSheet
        video={activeVideo}
        open={videoOpen}
        onOpenChange={(o) => {
          setVideoOpen(o);
          if (!o) setActiveVideo(null);
        }}
        onMarkWatched={markWatched}
      />
    </>
  );
}
