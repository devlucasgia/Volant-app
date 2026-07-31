import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Check, ChevronRight, Play, GraduationCap } from "lucide-react";
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

export function FirstStepsSheet({ open, onOpenChange, tasks, done, total }: FirstStepsSheetProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { openDrawer } = useUI();
  const { startTour } = useTour();
  const { markWatched } = useTutorialsWatched();
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;

  const [activeVideo, setActiveVideo] = useState<TutorialVideo | null>(null);
  const [videoOpen, setVideoOpen] = useState(false);

  const handleTaskClick = (task: FirstStepTask) => {
    if (task.done) return;
    // Fecha ANTES de navegar/abrir drawer pra sheet não ficar por cima.
    onOpenChange(false);
    setTimeout(() => {
      if (task.action === "openEntryDrawer") {
        openDrawer();
        return;
      }
      if (task.action === "startEarningsTour" || task.action === "startExpensesTour") {
        const run = () => {
          if (task.action === "startEarningsTour") {
            startTour("earnings", earningsTourSteps);
          } else {
            startTour("expenses", expensesTourSteps);
          }
        };
        if (location.pathname !== "/app") {
          navigate("/app");
          // aguarda a Home montar
          window.setTimeout(run, 500);
        } else {
          window.setTimeout(run, 200);
        }
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

          <ul className="space-y-2 px-4 pt-4">
            {tasks.map((task) => {
              const isDone = task.done;
              const video = videoForFirstStep(task.key);
              return (
                <li key={task.key}>
                  <div
                    className={cn(
                      "flex w-full items-center gap-2 rounded-xl border border-border/60 bg-card px-3 py-3",
                      isDone ? "opacity-70" : "",
                    )}
                  >
                    <button
                      type="button"
                      onClick={isDone ? undefined : () => handleTaskClick(task)}
                      disabled={isDone}
                      className={cn(
                        "flex min-w-0 flex-1 items-center gap-3 text-left",
                        !isDone && "active:opacity-70",
                      )}
                    >
                      <span
                        className={cn(
                          "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2",
                          isDone
                            ? "border-success bg-success text-[hsl(222_47%_7%)]"
                            : "border-border bg-transparent",
                        )}
                      >
                        {isDone && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
                      </span>

                      <span
                        className={cn(
                          "min-w-0 flex-1 text-[13.5px] font-semibold leading-snug",
                          isDone && "line-through text-muted-foreground",
                        )}
                      >
                        {task.label}
                      </span>
                    </button>

                    {video && (
                      <button
                        type="button"
                        onClick={() => handleVideoChip(video)}
                        className="flex shrink-0 items-center gap-1 rounded-full border border-primary/30 bg-primary/[0.08] px-2.5 py-1 text-[10.5px] font-bold text-primary transition-colors active:bg-primary/15"
                      >
                        <Play className="h-2.5 w-2.5 fill-current" />
                        Vídeo
                      </button>
                    )}

                    {!isDone && !video && (
                      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                    )}
                  </div>
                </li>
              );
            })}
          </ul>

          <button
            type="button"
            onClick={handleOpenCentral}
            className="mx-4 mb-4 mt-1 flex items-center justify-center gap-1.5 rounded-lg py-2 text-[12px] text-muted-foreground transition-colors active:text-foreground"
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
