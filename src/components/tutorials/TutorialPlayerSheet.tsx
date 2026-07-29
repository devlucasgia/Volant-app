import { useEffect, useRef, useState } from "react";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import type { TutorialVideo } from "@/lib/tutorials/videos";
import { cn } from "@/lib/utils";

// Carrega a IFrame API do YouTube uma única vez.
let ytApiPromise: Promise<void> | null = null;
function loadYouTubeApi(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  const w = window as any;
  if (w.YT && w.YT.Player) return Promise.resolve();
  if (ytApiPromise) return ytApiPromise;
  ytApiPromise = new Promise<void>((resolve) => {
    const prev = w.onYouTubeIframeAPIReady;
    w.onYouTubeIframeAPIReady = () => {
      if (typeof prev === "function") prev();
      resolve();
    };
    const tag = document.createElement("script");
    tag.src = "https://www.youtube.com/iframe_api";
    document.head.appendChild(tag);
  });
  return ytApiPromise;
}

interface Props {
  video: TutorialVideo | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onMarkWatched: (id: string) => void;
}

const YT_STATE_ENDED = 0;

export function TutorialPlayerSheet({ video, open, onOpenChange, onMarkWatched }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const playerRef = useRef<any>(null);
  const pollRef = useRef<number | null>(null);
  const markedRef = useRef(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!open || !video) return;
    markedRef.current = false;
    setReady(false);
    let cancelled = false;

    void loadYouTubeApi().then(() => {
      if (cancelled || !containerRef.current) return;
      const w = window as any;
      // Cria o host dentro do container (a API substitui esse nó pelo iframe).
      const host = document.createElement("div");
      host.id = `yt-host-${video.id}-${Date.now()}`;
      containerRef.current.innerHTML = "";
      containerRef.current.appendChild(host);

      playerRef.current = new w.YT.Player(host.id, {
        width: "100%",
        height: "100%",
        videoId: video.youtubeId,
        playerVars: {
          rel: 0,
          modestbranding: 1,
          playsinline: 1,
        },
        events: {
          onReady: () => setReady(true),
          onStateChange: (e: any) => {
            if (e.data === YT_STATE_ENDED && !markedRef.current) {
              markedRef.current = true;
              onMarkWatched(video.id);
            }
          },
        },
      });

      // Polling 90% (caso feche antes do ENDED).
      pollRef.current = window.setInterval(() => {
        if (markedRef.current) return;
        const p = playerRef.current;
        if (!p || typeof p.getCurrentTime !== "function") return;
        try {
          const cur = p.getCurrentTime();
          const dur = p.getDuration();
          if (dur > 0 && cur / dur >= 0.9) {
            markedRef.current = true;
            onMarkWatched(video.id);
          }
        } catch {
          /* noop */
        }
      }, 1000);
    });

    return () => {
      cancelled = true;
      if (pollRef.current) {
        window.clearInterval(pollRef.current);
        pollRef.current = null;
      }
      const p = playerRef.current;
      if (p && typeof p.destroy === "function") {
        try {
          p.destroy();
        } catch {
          /* noop */
        }
      }
      playerRef.current = null;
      if (containerRef.current) containerRef.current.innerHTML = "";
      setReady(false);
    };
  }, [open, video, onMarkWatched]);

  const isPortrait = video?.orientation === "portrait";

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[92vh]">
        <DrawerHeader className="pb-2">
          <DrawerTitle className="text-left text-[15px] leading-tight">
            {video?.title ?? ""}
          </DrawerTitle>
          {video?.description ? (
            <p className="text-left text-[12px] text-muted-foreground">
              {video.description}
            </p>
          ) : null}
        </DrawerHeader>
        <div className="flex justify-center px-4 pb-6">
          <div
            className={cn(
              "relative w-full overflow-hidden rounded-xl bg-black",
              "[&_iframe]:absolute [&_iframe]:inset-0 [&_iframe]:h-full [&_iframe]:w-full",
              isPortrait ? "max-w-[260px] aspect-[9/16]" : "aspect-video",
            )}
          >
            <div
              ref={containerRef}
              className="absolute inset-0 h-full w-full"
              aria-hidden={!ready}
            />
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
