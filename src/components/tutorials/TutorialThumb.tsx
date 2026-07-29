import { Play, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import type { TutorialVideo } from "@/lib/tutorials/videos";

interface Props {
  video: TutorialVideo;
  watched: boolean;
  className?: string;
}

/**
 * Thumbnail desenhada no app — sem depender de imagem externa.
 * Padrão A: gradiente + marca d'água + play central + duração + selo assistido.
 */
export function TutorialThumb({ video, watched, className }: Props) {
  const isPortrait = video.orientation === "portrait";
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-xl",
        "bg-gradient-to-br from-primary/30 via-primary/15 to-background",
        "ring-1 ring-inset ring-border/60",
        isPortrait ? "aspect-[9/16]" : "aspect-video",
        className,
      )}
    >
      {/* Marca d'água / selo assistido */}
      <div className="absolute left-2 top-2 z-10">
        {watched ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/90 px-2 py-0.5 text-[10px] font-semibold text-white shadow-sm">
            <Check className="h-3 w-3" strokeWidth={3} />
            Assistido
          </span>
        ) : (
          <span className="rounded-md bg-background/50 px-1.5 py-0.5 text-[9px] font-bold tracking-[0.14em] text-foreground/70 backdrop-blur-sm">
            VOLANT
          </span>
        )}
      </div>

      {/* Duração */}
      <div className="absolute bottom-2 right-2 z-10 rounded-md bg-black/60 px-1.5 py-0.5 text-[10px] font-medium text-white backdrop-blur-sm">
        {video.durationLabel}
      </div>

      {/* Play central */}
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="flex h-11 w-11 items-center justify-center rounded-full bg-white/95 text-primary shadow-lg ring-1 ring-black/5">
          <Play className="h-5 w-5 translate-x-[1px]" fill="currentColor" />
        </span>
      </div>
    </div>
  );
}
