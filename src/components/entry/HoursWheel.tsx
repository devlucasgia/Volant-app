import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

/**
 * Seletor estilo "alarme" para horas trabalhadas.
 *
 * - 2 colunas roláveis (horas | minutos) com snap.
 * - Faixa central destaca o valor selecionado.
 * - Rolagem em LOOP (23→0 e 0→23; 59→0 e 0→59), como relógios de apps robustos.
 * - Link "digitar" troca pra 2 campos numéricos.
 * - Respeita `prefers-reduced-motion` em qualquer scroll programático.
 */

const ITEM_H = 28; // px por item
const VISIBLE = 3; // 1 central + 1 acima + 1 abaixo
const CONTAINER_H = ITEM_H * VISIBLE; // 84px
const REPEATS = 41; // ímpar para termos um bloco central exato
const MID = Math.floor(REPEATS / 2);

interface Props {
  /** Valor atual em horas decimais (ex.: 6.5 = 6h30). null = vazio. */
  value: number | null;
  onChange: (decimalHours: number | null) => void;
  /** Faixa de horas exibidas (default 0..23). */
  maxHours?: number;
  /** Passo dos minutos em min (default 1). */
  minuteStep?: number;
}

function fromDecimal(decimal: number | null, minuteStep: number): { h: number; m: number } {
  if (decimal == null || !isFinite(decimal) || decimal <= 0) return { h: 0, m: 0 };
  const h = Math.floor(decimal);
  const minutesRaw = Math.round((decimal - h) * 60);
  const m = Math.round(minutesRaw / minuteStep) * minuteStep;
  if (m >= 60) return { h: h + 1, m: 0 };
  return { h, m };
}

function toDecimal(h: number, m: number): number {
  return Math.round((h + m / 60) * 100) / 100;
}

function prefersReducedMotion() {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function mod(n: number, m: number): number {
  return ((n % m) + m) % m;
}

function Wheel({
  values,
  value,
  onSelect,
  format,
}: {
  values: number[];
  value: number;
  onSelect: (v: number) => void;
  format: (n: number) => string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const settleTimer = useRef<number | null>(null);
  const L = values.length;
  const total = REPEATS * L;

  // Posição inicial no bloco central.
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const idx = Math.max(0, values.indexOf(value));
    el.scrollTop = (MID * L + idx) * ITEM_H;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync quando `value` muda externamente — snap para a ocorrência mais próxima.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const idx = values.indexOf(value);
    if (idx < 0) return;
    const currentAbs = Math.round(el.scrollTop / ITEM_H);
    const currentVal = values[mod(currentAbs, L)];
    if (currentVal === value) return;
    const base = Math.floor(currentAbs / L) * L;
    const candidates = [base - L + idx, base + idx, base + L + idx];
    const nearest = candidates.reduce((a, b) =>
      Math.abs(b - currentAbs) < Math.abs(a - currentAbs) ? b : a,
    );
    const clamped = Math.max(0, Math.min(total - 1, nearest));
    el.scrollTo({
      top: clamped * ITEM_H,
      behavior: prefersReducedMotion() ? "auto" : "smooth",
    });
  }, [value, values, total, L]);

  const handleScroll = () => {
    const el = ref.current;
    if (!el) return;
    if (settleTimer.current) window.clearTimeout(settleTimer.current);
    settleTimer.current = window.setTimeout(() => {
      const idx = Math.max(0, Math.min(total - 1, Math.round(el.scrollTop / ITEM_H)));
      const v = values[mod(idx, L)];
      if (v !== value) onSelect(v);
      // Snap suave se ficou levemente fora.
      const snap = idx * ITEM_H;
      if (Math.abs(el.scrollTop - snap) > 0.5) {
        el.scrollTo({ top: snap, behavior: prefersReducedMotion() ? "auto" : "smooth" });
      }
      // Recentraliza no bloco do meio se aproximou das bordas — invisível pro usuário
      // pois os itens são idênticos.
      if (idx < L || idx > total - L) {
        const modIdx = mod(idx, L);
        const newAbs = MID * L + modIdx;
        el.scrollTop = newAbs * ITEM_H;
      }
    }, 90);
  };

  return (
    <div
      ref={ref}
      onScroll={handleScroll}
      className="relative h-[84px] flex-1 overflow-y-scroll snap-y snap-mandatory scrollbar-none"
      style={{ scrollSnapType: "y mandatory", WebkitOverflowScrolling: "touch" }}
    >
      {/* padding top/bottom para alinhar o snap-center com o item ativo. */}
      <div style={{ paddingTop: ITEM_H, paddingBottom: ITEM_H }}>
        {Array.from({ length: total }, (_, i) => {
          const v = values[i % L];
          return (
            <button
              key={i}
              type="button"
              tabIndex={-1}
              onClick={() => {
                const el = ref.current;
                if (!el) return;
                el.scrollTo({
                  top: i * ITEM_H,
                  behavior: prefersReducedMotion() ? "auto" : "smooth",
                });
              }}
              className={cn(
                "flex h-[28px] w-full snap-center items-center justify-center text-base tabular-nums transition-all",
                v === value ? "font-bold text-foreground" : "text-muted-foreground/60",
              )}
            >
              {format(v)}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function HoursWheel({ value, onChange, maxHours = 23, minuteStep = 1 }: Props) {
  const initial = fromDecimal(value, minuteStep);
  const [mode, setMode] = useState<"wheel" | "type">("wheel");
  const [h, setH] = useState<number>(initial.h);
  const [m, setM] = useState<number>(initial.m);

  // Re-sync local state when external `value` changes (ex.: prefillHours).
  useEffect(() => {
    const next = fromDecimal(value, minuteStep);
    setH(next.h);
    setM(next.m);
  }, [value, minuteStep]);

  const commit = (nh: number, nm: number) => {
    setH(nh); setM(nm);
    onChange(nh === 0 && nm === 0 ? null : toDecimal(nh, nm));
  };

  const hours = Array.from({ length: maxHours + 1 }, (_, i) => i);
  const minutes = Array.from({ length: 60 }, (_, i) => i);

  return (
    <div className="space-y-2">
      {mode === "wheel" ? (
        <div className="relative overflow-hidden rounded-xl border border-border/60 bg-muted/40">
          {/* Faixa central destacada */}
          <div
            className="pointer-events-none absolute left-0 right-0 top-1/2 z-0 -translate-y-1/2 border-y border-border/60 bg-card/70"
            style={{ height: ITEM_H }}
          />
          <div className="relative z-10 flex items-stretch">
            <Wheel values={hours} value={h} onSelect={(v) => commit(v, m)} format={(n) => `${n}h`} />
            <div className="flex items-center justify-center px-1 text-base font-bold text-muted-foreground/60">:</div>
            <Wheel
              values={minutes}
              value={m}
              onSelect={(v) => commit(h, v)}
              format={(n) => n.toString().padStart(2, "0")}
            />
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <label className="text-[11px] font-medium text-muted-foreground">Horas</label>
            <input
              type="number"
              inputMode="numeric"
              min={0}
              max={maxHours}
              value={h === 0 && m === 0 ? "" : h}
              placeholder="0"
              onChange={(e) => {
                const v = Math.max(0, Math.min(maxHours, parseInt(e.target.value || "0", 10) || 0));
                commit(v, m);
              }}
              className="h-11 w-full rounded-lg border border-input bg-background px-3 text-center text-lg font-bold tabular-nums focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[11px] font-medium text-muted-foreground">Minutos</label>
            <input
              type="number"
              inputMode="numeric"
              min={0}
              max={59}
              value={h === 0 && m === 0 ? "" : m}
              placeholder="00"
              onChange={(e) => {
                const v = Math.max(0, Math.min(59, parseInt(e.target.value || "0", 10) || 0));
                commit(h, v);
              }}
              className="h-11 w-full rounded-lg border border-input bg-background px-3 text-center text-lg font-bold tabular-nums focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
        </div>
      )}
      <div className="flex items-center justify-between text-[11px]">
        <span className="text-muted-foreground">
          {h === 0 && m === 0 ? "Selecione as horas" : `${h}h ${m.toString().padStart(2, "0")}min`}
        </span>
        <button
          type="button"
          onClick={() => setMode(mode === "wheel" ? "type" : "wheel")}
          className="font-medium text-primary hover:underline"
        >
          {mode === "wheel" ? "Digitar" : "Usar roleta"}
        </button>
      </div>
    </div>
  );
}
