import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, GraduationCap, RotateCcw, ChevronRight, Wallet, Receipt } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  TUTORIAL_SECTIONS,
  videosBySection,
  type TutorialVideo,
} from "@/lib/tutorials/videos";
import { useTutorialsWatched } from "@/hooks/useTutorialsWatched";
import { TutorialThumb } from "@/components/tutorials/TutorialThumb";
import { TutorialPlayerSheet } from "@/components/tutorials/TutorialPlayerSheet";
import { useTour } from "@/context/TourContext";
import { earningsTourSteps } from "@/lib/tours/earningsTour";
import { expensesTourSteps } from "@/lib/tours/expensesTour";


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
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted/50 text-foreground/70 ring-1 ring-inset ring-current/15 shadow-[0_0_12px_-6px_currentColor]">
          <GraduationCap className="h-4 w-4" />
        </span>
        <div className="min-w-0">
          <h1 className="truncate text-[17px] font-bold leading-tight tracking-tight text-foreground">
            Central de Tutoriais
          </h1>
          <p className="text-[11px] leading-tight text-muted-foreground/80">
            Aprenda a usar o Volant no seu ritmo.
          </p>
        </div>
      </div>
    </header>
  );
}

interface VideoCardProps {
  video: TutorialVideo;
  watched: boolean;
  onOpen: () => void;
}

function VideoCard({ video, watched, onOpen }: VideoCardProps) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className={cn(
        "group w-full overflow-hidden rounded-2xl border border-border bg-card text-left",
        "shadow-[0_1px_0_0_hsl(var(--border)),0_8px_21px_-18px_rgba(0,0,0,0.40)]",
        "transition-transform active:scale-[0.985]",
      )}
    >
      <TutorialThumb video={video} watched={watched} />
      {video.description ? (
        <div className="px-3.5 pb-3 pt-2.5">
          <p className="text-[11.5px] leading-snug text-muted-foreground">
            {video.description}
          </p>
        </div>
      ) : (
        <div className="pb-1.5" />
      )}
    </button>
  );
}

export default function CentralTutoriais() {
  const navigate = useNavigate();
  const { isWatched, markWatched } = useTutorialsWatched();
  const { startTour } = useTour();

  function handleReplayTour(kind: "earnings" | "expenses") {
    navigate("/app");
    window.setTimeout(() => {
      if (kind === "earnings") {
        startTour("earnings", earningsTourSteps, { force: true });
      } else {
        startTour("expenses", expensesTourSteps, { force: true });
      }
    }, 500);
  }

  const [activeVideo, setActiveVideo] = useState<TutorialVideo | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, []);

  function handleOpen(v: TutorialVideo) {
    setActiveVideo(v);
    setSheetOpen(true);
  }

  return (
    <div className="flex min-h-[100dvh] flex-col">
      <ScreenHeader onBack={() => navigate("/ajustes")} />
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 px-4 py-6 pb-28">
        {TUTORIAL_SECTIONS.map((section) => {
          const vids = videosBySection(section.key);
          if (vids.length === 0) return null;
          return (
            <section key={section.key} className="space-y-2.5">
              <h2 className="px-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                {section.title}
              </h2>
              <div className="flex flex-col gap-3">
                {vids.map((v) => (
                  <VideoCard
                    key={v.id}
                    video={v}
                    watched={isWatched(v.id)}
                    onOpen={() => handleOpen(v)}
                  />
                ))}
              </div>
            </section>
          );
        })}

        {/* Boas-vindas — rever apresentação (evento já existente no app) */}
        <section className="space-y-2.5">
          <h2 className="px-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Boas-vindas
          </h2>
          <button
            type="button"
            onClick={() =>
              window.dispatchEvent(new CustomEvent("volant:open-onboarding"))
            }
            className={cn(
              "group flex w-full items-center gap-3 rounded-2xl border border-border bg-card p-4 text-left",
              "shadow-[0_1px_0_0_hsl(var(--border)),0_8px_21px_-18px_rgba(0,0,0,0.40)]",
              "transition-colors hover:bg-muted/30 active:scale-[0.995]",
            )}
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">
              <RotateCcw className="h-4 w-4" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="text-[14px] font-semibold text-foreground">
                Rever apresentação do Volant
              </div>
              <p className="text-[11.5px] text-muted-foreground">
                A introdução que você viu no primeiro acesso.
              </p>
            </div>
            <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/70 transition-transform group-hover:translate-x-0.5" />
          </button>
        </section>

        <section className="space-y-2.5">
          <h2 className="px-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Tours interativos
          </h2>
          <div className="flex flex-col gap-3">
            <button
              type="button"
              onClick={() => handleReplayTour("earnings")}
              className={cn(
                "group flex w-full items-center gap-3 rounded-2xl border border-border bg-card p-4 text-left",
                "shadow-[0_1px_0_0_hsl(var(--border)),0_8px_21px_-18px_rgba(0,0,0,0.40)]",
                "transition-colors hover:bg-muted/30 active:scale-[0.995]",
              )}
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-info/10 text-info">
                <Wallet className="h-4 w-4" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="text-[14px] font-semibold text-foreground">
                  Refazer tour de lançamento de ganhos
                </div>
                <p className="text-[11.5px] text-muted-foreground">
                  Passo a passo guiado, na prática.
                </p>
              </div>
              <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/70 transition-transform group-hover:translate-x-0.5" />
            </button>

            <button
              type="button"
              onClick={() => handleReplayTour("expenses")}
              className={cn(
                "group flex w-full items-center gap-3 rounded-2xl border border-border bg-card p-4 text-left",
                "shadow-[0_1px_0_0_hsl(var(--border)),0_8px_21px_-18px_rgba(0,0,0,0.40)]",
                "transition-colors hover:bg-muted/30 active:scale-[0.995]",
              )}
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-destructive/10 text-destructive">
                <Receipt className="h-4 w-4" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="text-[14px] font-semibold text-foreground">
                  Refazer tour de lançamento de gastos
                </div>
                <p className="text-[11.5px] text-muted-foreground">
                  Passo a passo guiado, na prática.
                </p>
              </div>
              <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/70 transition-transform group-hover:translate-x-0.5" />
            </button>
          </div>
        </section>
      </div>


      <TutorialPlayerSheet
        video={activeVideo}
        open={sheetOpen}
        onOpenChange={(o) => {
          setSheetOpen(o);
          if (!o) setActiveVideo(null);
        }}
        onMarkWatched={markWatched}
      />
    </div>
  );
}
