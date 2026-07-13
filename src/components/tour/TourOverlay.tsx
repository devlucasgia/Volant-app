import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Popover, PopoverContent, PopoverAnchor } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { useTour } from "@/context/TourContext";

interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
}

const PADDING = 8;
const POLL_INTERVAL_MS = 150;
const POLL_TIMEOUT_MS = 3000;

function useTargetRect(selector: string | null): Rect | null {
  const [rect, setRect] = useState<Rect | null>(null);

  useEffect(() => {
    if (!selector) {
      setRect(null);
      return;
    }
    let cancelled = false;
    let raf = 0;
    const started = Date.now();

    const measure = (el: Element) => {
      const r = el.getBoundingClientRect();
      setRect({
        top: r.top - PADDING,
        left: r.left - PADDING,
        width: r.width + PADDING * 2,
        height: r.height + PADDING * 2,
      });
    };

    const tick = () => {
      if (cancelled) return;
      const el = document.querySelector(selector);
      if (el) {
        measure(el);
        return;
      }
      if (Date.now() - started > POLL_TIMEOUT_MS) {
        setRect(null);
        return;
      }
      window.setTimeout(tick, POLL_INTERVAL_MS);
    };
    tick();

    const onResizeOrScroll = () => {
      if (cancelled) return;
      const el = document.querySelector(selector);
      if (!el) return;
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => measure(el));
    };
    window.addEventListener("resize", onResizeOrScroll);
    window.addEventListener("scroll", onResizeOrScroll, true);

    const interval = window.setInterval(() => {
      const el = document.querySelector(selector);
      if (el) measure(el);
    }, 300);

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResizeOrScroll);
      window.removeEventListener("scroll", onResizeOrScroll, true);
      window.clearInterval(interval);
    };
  }, [selector]);

  return rect;
}

export function TourOverlay() {
  const { activeTour, currentStepIndex, steps, next, prev, skip } = useTour();
  const step = activeTour ? steps[currentStepIndex] ?? null : null;
  const rect = useTargetRect(step?.target ?? null);

  // Auto-finaliza tour órfão: se o alvo sumiu do DOM por mais de 900ms, encerra.
  // (Hook precisa vir antes de qualquer early return.)
  const isLastForHook = step ? currentStepIndex >= steps.length - 1 : true;
  useEffect(() => {
    if (!step || isLastForHook) return;
    if (rect) return;
    const t = window.setTimeout(() => {
      const stillMissing = !document.querySelector(step.target);
      if (stillMissing) skip();
    }, 900);
    return () => window.clearTimeout(t);
  }, [rect, step, isLastForHook, skip]);

  if (!step) return null;

  const isLast = currentStepIndex >= steps.length - 1;
  const showNext = step.advance === "next";
  const prevStep = currentStepIndex > 0 ? steps[currentStepIndex - 1] : null;
  // Só permite "Voltar" quando o passo anterior era "next" (informativo).
  // Voltar por cima de uma ação já cumprida (drawer aberto, salvo etc.) quebra o tour.
  const showPrev = showNext && !!prevStep && prevStep.advance === "next";

  const targetEl = rect ? document.querySelector(step.target) : null;
  const insideDrawer = !!targetEl?.closest(
    '[data-vaul-drawer], [vaul-drawer], [role="dialog"]',
  );

  const mode: "spotlight" | "glow" | "none" =
    isLast ? "none" : insideDrawer ? "glow" : "spotlight";

  // 4 camadas escuras recortando o alvo (só usadas no modo spotlight).
  const parts = rect
    ? [
        { top: 0, left: 0, width: window.innerWidth, height: Math.max(0, rect.top) },
        {
          top: Math.max(0, rect.top),
          left: 0,
          width: Math.max(0, rect.left),
          height: Math.max(0, rect.height),
        },
        {
          top: Math.max(0, rect.top),
          left: rect.left + rect.width,
          width: Math.max(0, window.innerWidth - (rect.left + rect.width)),
          height: Math.max(0, rect.height),
        },
        {
          top: rect.top + rect.height,
          left: 0,
          width: window.innerWidth,
          height: Math.max(0, window.innerHeight - (rect.top + rect.height)),
        },
      ]
    : [];

  // Anchor: no rect quando temos alvo; no centro da viewport pro modo "none".
  const anchorStyle =
    mode === "none" || !rect
      ? { top: "50vh", left: "50vw", width: 0, height: 0 } as const
      : { top: rect.top, left: rect.left, width: rect.width, height: rect.height };

  return createPortal(
    <div
      className="pointer-events-none fixed inset-0 z-[9998]"
      aria-live="polite"
    >
      {/* Spotlight: 4 camadas pretas recortando o alvo. NÃO bloqueiam cliques. */}
      {mode === "spotlight" && rect && parts.map((p, i) => (
        <div
          key={i}
          className="pointer-events-none absolute bg-black/70 transition-opacity duration-200 motion-reduce:transition-none"
          style={{ top: p.top, left: p.left, width: p.width, height: p.height }}
        />
      ))}

      {/* Glow pulsante no alvo: em spotlight e glow. */}
      {mode !== "none" && rect && (
        <div
          className="tour-glow pointer-events-none absolute rounded-[14px]"
          style={{ top: rect.top, left: rect.left, width: rect.width, height: rect.height }}
        />
      )}

      <Popover open={true}>
        <PopoverAnchor asChild>
          <div className="pointer-events-none absolute" style={anchorStyle} />
        </PopoverAnchor>
        <PopoverContent
          side={mode === "none" ? "bottom" : (step.placement ?? "top")}
          align="center"
          sideOffset={mode === "none" ? 0 : 12}
          collisionPadding={16}
          className="pointer-events-auto z-[9999] w-[min(88vw,320px)] rounded-2xl border border-border bg-card p-4 shadow-elevated"
          onOpenAutoFocus={(e) => e.preventDefault()}
          onCloseAutoFocus={(e) => e.preventDefault()}
          onPointerDownOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => e.preventDefault()}
        >
          <div className="mb-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Passo {currentStepIndex + 1} de {steps.length}
          </div>
          <div className="mb-1.5 text-[15px] font-bold leading-tight text-foreground">
            {step.title}
          </div>
          <p className="text-[13px] leading-snug text-muted-foreground">{step.body}</p>

          <div className="mt-3 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={skip}
              className="text-[12px] font-medium text-muted-foreground underline-offset-2 hover:underline"
            >
              Pular
            </button>
            <div className="flex items-center gap-2">
              {showPrev && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={prev}
                  className="h-8 rounded-full px-3 text-[12px]"
                >
                  Voltar
                </Button>
              )}
              {showNext && (
                <Button size="sm" onClick={next} className="h-8 rounded-full px-4 text-[12px]">
                  {isLast ? "Concluir" : "Próximo"}
                </Button>
              )}
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>,
    document.body,
  );
}
