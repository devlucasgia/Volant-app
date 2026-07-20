import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useTour } from "@/context/TourContext";
import { Loader2 } from "lucide-react";


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
    // Limpa o rect anterior imediatamente ao trocar de alvo pra evitar
    // "glow fantasma" na posição antiga enquanto o novo alvo ainda não
    // foi medido (ex.: drawer abrindo entre passos).
    setRect(null);
    if (!selector) {
      return;
    }

    let cancelled = false;
    let raf = 0;
    let scrolled = false;
    // Só passa a valer medições depois que o alvo assentou (380ms após 1ª
    // detecção). Antes disso, o elemento pode existir em posição transitória
    // (drawer animando), e medir agora pinta o glow no lugar errado.
    let settled = false;
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
        if (!scrolled) {
          scrolled = true;
          try {
            (el as HTMLElement).scrollIntoView({ block: "center", behavior: "smooth" });
          } catch {
            /* noop */
          }
          window.setTimeout(() => {
            if (cancelled) return;
            settled = true;
            measure(el);
          }, 380);
          return; // NÃO mede imediato — evita capturar posição transitória.
        }
        if (settled) measure(el);
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
      if (cancelled || !settled) return;
      const el = document.querySelector(selector);
      if (!el) return;
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => measure(el));
    };
    window.addEventListener("resize", onResizeOrScroll);
    window.addEventListener("scroll", onResizeOrScroll, true);

    const interval = window.setInterval(() => {
      if (!settled) return;
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
  const { activeTour, currentStepIndex, steps, validating, next, prev, skip } = useTour();
  const step = activeTour ? steps[currentStepIndex] ?? null : null;
  const rect = useTargetRect(step?.target ?? null);

  // Auto-finaliza tour órfão: se o alvo sumiu do DOM por mais de 900ms, encerra.
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
  const showPrev = showNext && !!prevStep && prevStep.advance === "next";

  // Spotlight em TODAS as etapas quando há alvo; só desliga se spotlight===false.
  const noHighlight = step.spotlight === false || !rect;
  const mode: "spotlight" | "none" = noHighlight ? "none" : "spotlight";

  // Step espera um alvo mas o rect ainda não assentou (transição entre steps).
  // Esconde o balão nesse intervalo para evitar que ele pule do centro para
  // o topo/rodapé depois de ~380ms. Conclusão real (mode === "none") não entra.
  const awaitingRect =
    !!step && step.spotlight !== false && !!step.target && !rect && mode !== "none";


  // 4 camadas escuras recortando o alvo.
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

  // Medição real do balão (evita estimar altura e cobrir o alvo).
  const balloonRef = useRef<HTMLDivElement>(null);
  const [balloonSize, setBalloonSize] = useState<{ w: number; h: number } | null>(null);
  useLayoutEffect(() => {
    if (!balloonRef.current || awaitingRect) {
      setBalloonSize(null);
      return;
    }
    const el = balloonRef.current;
    const measure = () => {
      const r = el.getBoundingClientRect();
      setBalloonSize((prev) =>
        prev && Math.abs(prev.w - r.width) < 0.5 && Math.abs(prev.h - r.height) < 0.5
          ? prev
          : { w: r.width, h: r.height },
      );
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [awaitingRect, step, validating, currentStepIndex]);

  // Posição adjacente ao alvo, nunca sobrepondo, com clamp no viewport.
  const GAP = 14;
  const MARGIN = 12;
  const W = window.innerWidth;
  const H = window.innerHeight;
  const bw = balloonSize?.w ?? 320;
  const bh = balloonSize?.h ?? 220;

  let balloonTop: number;
  let balloonLeft: number;
  let arrowSide: "top" | "bottom" | null = null;

  if (mode === "none" || !rect) {
    balloonTop = (H - bh) / 2;
    balloonLeft = (W - bw) / 2;
  } else {
    const spaceBelow = H - (rect.top + rect.height) - MARGIN;
    const spaceAbove = rect.top - MARGIN;

    if (spaceBelow >= bh + GAP && spaceBelow >= spaceAbove) {
      balloonTop = rect.top + rect.height + GAP;
      arrowSide = "top";
    } else if (spaceAbove >= bh + GAP) {
      balloonTop = rect.top - bh - GAP;
      arrowSide = "bottom";
    } else {
      // Alvo grande demais (drawer inteiro): coloca no lado com mais folga.
      if (spaceBelow >= spaceAbove) {
        balloonTop = Math.min(rect.top + rect.height + GAP, H - bh - MARGIN);
        arrowSide = "top";
      } else {
        balloonTop = Math.max(rect.top - bh - GAP, MARGIN);
        arrowSide = "bottom";
      }
    }

    const targetCenter = rect.left + rect.width / 2;
    balloonLeft = Math.round(targetCenter - bw / 2);
    balloonLeft = Math.max(MARGIN, Math.min(balloonLeft, W - bw - MARGIN));
    balloonTop = Math.max(MARGIN, Math.min(balloonTop, H - bh - MARGIN));
  }

  // Seta apontando pro alvo (só em spotlight). Posição horizontal alinhada ao centro do alvo.
  let arrowLeft = bw / 2;
  if (rect && arrowSide) {
    const targetCenter = rect.left + rect.width / 2;
    arrowLeft = Math.max(16, Math.min(bw - 16, targetCenter - balloonLeft));
  }

  const measured = balloonSize !== null;

  const progress = ((currentStepIndex + 1) / steps.length) * 100;
  const showHint = !validating && step.advance === "action" && !!step.hint;

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

      {/* Glow pulsante no alvo. */}
      {mode !== "none" && rect && (
        <div
          className="tour-glow pointer-events-none absolute rounded-[14px]"
          style={{ top: rect.top, left: rect.left, width: rect.width, height: rect.height }}
        />
      )}

      {/* Balão: posicionado adjacente ao alvo, nunca cobre. */}
      {!awaitingRect && (
        <div
          ref={balloonRef}
          className={cn(
            "fixed z-[9999] w-[min(92vw,340px)] rounded-2xl border border-border/60 bg-[hsl(var(--card))] p-0 shadow-[0_20px_50px_-10px_rgba(0,0,0,0.75),0_4px_12px_-2px_rgba(0,0,0,0.5)] transition-opacity duration-150",
            measured ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0",
          )}
          style={{ top: balloonTop, left: balloonLeft }}
        >
          {/* Seta apontando pro alvo */}
          {arrowSide && (
            <div
              className="pointer-events-none absolute h-3 w-3 rotate-45 border border-border/60 bg-[hsl(var(--card))]"
              style={{
                left: arrowLeft - 6,
                top: arrowSide === "top" ? -6 : undefined,
                bottom: arrowSide === "bottom" ? -6 : undefined,
                borderRight: arrowSide === "top" ? "none" : undefined,
                borderBottom: arrowSide === "top" ? "none" : undefined,
                borderLeft: arrowSide === "bottom" ? "none" : undefined,
                borderTop: arrowSide === "bottom" ? "none" : undefined,
              }}
            />
          )}

          {/* Cabeçalho */}
          <div className="flex items-start gap-3 px-4 pt-4">
            {step.icon && (
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-primary/15 text-lg leading-none">
                <span aria-hidden>{step.icon}</span>
              </div>
            )}
            <div className="min-w-0 flex-1">
              <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                Passo {currentStepIndex + 1} de {steps.length}
              </div>
              <div className="mt-0.5 text-[15.5px] font-bold leading-tight text-foreground">
                {step.title}
              </div>
            </div>
          </div>

          {/* Corpo */}
          <p className="px-4 pt-2 text-[13.5px] leading-[1.45] text-muted-foreground">
            {step.body}
          </p>

          {/* Pílula: validação ou dica */}
          {validating ? (
            <div className="px-4 pt-3">
              <span className="inline-flex items-center gap-2 rounded-full border border-primary/40 bg-primary/15 px-3 py-1 text-[12px] font-semibold text-primary">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Certo! Avançando...
              </span>
            </div>
          ) : showHint ? (
            <div className="px-4 pt-3">
              <span className="inline-flex items-center rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-[12px] font-medium text-primary">
                {step.hint}
              </span>
            </div>
          ) : null}

          {/* Rodapé */}
          <div className="mt-4 flex items-center gap-3 border-t border-border/40 px-4 py-3">
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-gradient-to-r from-primary via-primary to-primary/60 transition-all duration-300 motion-reduce:transition-none"
                style={{ width: `${progress}%` }}
              />
            </div>
            <button
              type="button"
              onClick={skip}
              className="text-[12px] font-medium text-muted-foreground underline-offset-2 hover:underline"
            >
              Pular
            </button>
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
      )}

    </div>,
    document.body,
  );
}


