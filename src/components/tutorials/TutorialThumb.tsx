import { Play, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import type { TutorialVideo } from "@/lib/tutorials/videos";

interface Props {
  video: TutorialVideo;
  watched: boolean;
  className?: string;
}

/**
 * Padrão A: thumbnail desenhada no app, sempre em banner horizontal.
 * A orientação do vídeo (portrait/landscape) NÃO muda a thumb — só o player.
 */
export function TutorialThumb({ video, watched, className }: Props) {
  const Icon = video.Icon;
  return (
    <div
      className={cn(
        "relative w-full overflow-hidden rounded-t-2xl aspect-[16/7.5]",
        className,
      )}
      style={{
        background:
          "radial-gradient(120% 140% at 85% 15%, hsl(142 45% 15%) 0%, hsl(222 42% 10%) 55%)",
      }}
    >
      {/* marca d'água (ícone da função) */}
      <div className="pointer-events-none absolute -bottom-5 -right-3 opacity-[0.13]">
        <Icon className="h-28 w-28 text-primary" strokeWidth={1.6} />
      </div>

      {/* topo esquerdo: marca VOLANT ou selo assistido */}
      {watched ? (
        <span className="absolute left-3 top-2.5 inline-flex items-center gap-1 rounded-full border border-primary/35 bg-primary/15 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-primary">
          <Check className="h-2.5 w-2.5" strokeWidth={3} /> Assistido
        </span>
      ) : (
        <span className="absolute left-3 top-2.5 inline-flex items-center gap-1.5 text-[11px] font-extrabold tracking-wide text-foreground/90">
          <span className="flex h-4 w-4 items-center justify-center rounded bg-primary/15">
            <Play className="h-2.5 w-2.5 fill-primary text-primary" />
          </span>
          VOLANT
        </span>
      )}

      {/* play central */}
      <span className="absolute left-1/2 top-1/2 flex h-10 w-10 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-primary/40 bg-primary/15 text-primary shadow-[0_0_26px_-6px_hsl(142_71%_45%_/_0.55)]">
        <Play className="h-4 w-4 fill-current" />
      </span>

      {/* título dentro da thumb */}
      <div className="absolute bottom-3 left-3 right-14 text-[15px] font-extrabold leading-tight text-foreground">
        {video.title}
      </div>

      {/* duração */}
      <span className="absolute bottom-2.5 right-2.5 rounded-md bg-black/60 px-1.5 py-0.5 text-[10px] font-semibold text-white">
        {video.durationLabel}
      </span>
    </div>
  );
}
