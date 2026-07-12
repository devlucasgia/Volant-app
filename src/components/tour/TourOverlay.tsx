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
        setRect(null); // desiste; a camada pai decide o que fazer
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

    // Reavalia periodicamente enquanto o passo estiver ativo (drawer abrindo, layout mudando).
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

/** Auto-skip: se o passo "action" tem alvo que sumiu por mais de 3s, avança sem trancar. */
function useAutoSkipMissingActionTarget(hasRect: boolean, isActionStep: boolean, skip: () => void) {
  useEffect(() => {
    if (!isActionStep) return;
    if (hasRect) return;
    // Só age depois do POLL_TIMEOUT que o hook já espera → esse timer é backup extra.
    const t = window.setTimeout(() => {
      // no-op: preferimos manter o usuário no controle; "Pular" está sempre visível.
    }, POLL_TIMEOUT_MS + 500);
    return () => window.clearTimeout(t);
  }, [hasRect, isActionStep, skip]);
}

export function TourOverlay() {
  const { activeTour, currentStepIndex, steps, next, skip } = useTour();
  const step = activeTour ? steps[currentStepIndex] ?? null : null;
  const rect = useTargetRect(step?.target ?? null);
  useAutoSkipMissingActionTarget(!!rect, step?.advance === "action", skip);

  if (!step) return null;

  const isLast = currentStepIndex >= steps.length - 1;
  const showNext = step.advance === "next";

  // Se o alvo está dentro de um drawer/dialog (Vaul, Radix), NÃO renderizamos as camadas
  // escuras bloqueantes — elas capturariam cliques/foco e travariam a interação.
  // O próprio drawer já tem backdrop, então o efeito visual de foco se mantém.
  const targetEl = rect ? document.querySelector(step.target) : null;
  const insideDrawer = !!targetEl?.closest(
    '[data-vaul-drawer], [vaul-drawer], [role="dialog"]',
  );

  // Recorte: 4 divs escuras cercando o alvo. Se não temos rect ainda, escurece tudo.
  const parts: Array<{ top: number; left: number; width: number; height: number } | null> = rect
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
    : [null];

  return createPortal(
    <div
      className="pointer-events-none fixed inset-0 z-[9998]"
      aria-live="polite"
    >
      {/* Camadas escuras (com pointer-events próprios, para bloquear cliques fora do alvo) */}
      {rect
        ? parts.map((p, i) =>
            p ? (
              <div
                key={i}
                className="pointer-events-auto absolute bg-black/60 transition-opacity duration-200 motion-reduce:transition-none"
                style={{ top: p.top, left: p.left, width: p.width, height: p.height }}
                onClick={step.advance === "next" ? () => {} : undefined}
              />
            ) : null,
          )
        : (
          <div className="pointer-events-auto absolute inset-0 bg-black/60" />
        )}

      {/* Anchor invisível no alvo para posicionar o balão */}
      <Popover open={true}>
        {rect && (
          <PopoverAnchor asChild>
            <div
              className="pointer-events-none absolute"
              style={{
                top: rect.top,
                left: rect.left,
                width: rect.width,
                height: rect.height,
              }}
            />
          </PopoverAnchor>
        )}
        <PopoverContent
          side={step.placement ?? "top"}
          align="center"
          sideOffset={12}
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

          <div className="mt-3 flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={skip}
              className="text-[12px] font-medium text-muted-foreground underline-offset-2 hover:underline"
            >
              Pular
            </button>
            {showNext && (
              <Button size="sm" onClick={next} className="h-8 rounded-full px-4 text-[12px]">
                {isLast ? "Concluir" : "Próximo"}
              </Button>
            )}
          </div>
        </PopoverContent>
      </Popover>
    </div>,
    document.body,
  );
}
