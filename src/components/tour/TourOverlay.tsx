import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Popover, PopoverContent, PopoverAnchor } from "@/components/ui/popover";
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

  // Posição do balão: se o alvo está na metade superior da tela, o balão vai
  // pro rodapé (evita cobrir). Caso contrário, fica no topo. Sem alvo → centro.
  const targetInTopHalf = !!rect && rect.top < window.innerHeight * 0.45;
  const anchorStyle =
    mode === "none" || !rect
      ? ({ top: "50vh", left: "50vw", width: 0, height: 0 } as const)
      : targetInTopHalf
        ? ({ top: window.innerHeight - 24, left: "50vw", width: 0, height: 0 } as const)
        : ({ top: 24, left: "50vw", width: 0, height: 0 } as const);

  const popoverSide =
    mode === "none" ? "bottom" : targetInTopHalf ? "top" : "bottom";
  const popoverSideOffset = 8;

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
          side={popoverSide}
          align="center"
          sideOffset={popoverSideOffset}

          collisionPadding={16}
          className="pointer-events-auto z-[9999] w-[min(88vw,340px)] rounded-2xl border border-white/10 bg-[hsl(var(--card))] p-0 shadow-[0_20px_50px_-10px_rgba(0,0,0,0.75),0_4px_12px_-2px_rgba(0,0,0,0.5)]"
          style={{ backgroundColor: "hsl(var(--card))" }}
          onOpenAutoFocus={(e) => e.preventDefault()}
          onCloseAutoFocus={(e) => e.preventDefault()}
          onPointerDownOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => e.preventDefault()}
        >
          {/* Cabeçalho: ícone + eyebrow/título */}
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
              <div className="mt-0.5 text-[15px] font-bold leading-tight text-foreground">
                {step.title}
              </div>
            </div>
          </div>

          {/* Corpo */}
          <p className="px-4 pt-2 text-[13px] leading-snug text-muted-foreground">
            {step.body}
          </p>

          {/* Pílula: feedback de validação OU dica normal */}
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

          {/* Rodapé: progresso + ações */}
          <div className="mt-4 flex items-center gap-3 border-t border-white/5 px-4 py-3">
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/10">
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
        </PopoverContent>
      </Popover>
    </div>,
    document.body,
  );
}

