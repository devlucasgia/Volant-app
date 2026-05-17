import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import confetti from "canvas-confetti";
import {
  ArrowRight, ArrowLeft, X, Plus, Play, StopCircle, Target,
  Clock, BarChart3, Sliders, GripVertical, CheckCircle2, Sparkles,
  TrendingUp, TrendingDown, Calendar, Wallet, Receipt, Gauge, ChevronDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";

import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

export const ONBOARDING_OPEN_EVENT = "volant:open-onboarding";

type StepKey = "welcome" | "registro" | "jornada" | "relatorios" | "customizacao" | "metas" | "final";

const STEPS: StepKey[] = ["welcome", "registro", "jornada", "relatorios", "customizacao", "metas", "final"];

export function OnboardingFlow() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [stepIdx, setStepIdx] = useState(0);
  const checked = useRef(false);

  // Initial check from DB (only once after auth)
  useEffect(() => {
    if (!user || checked.current) return;
    checked.current = true;
    supabase
      .from("profiles")
      .select("onboarded")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data && (data as any).onboarded === false) {
          setStepIdx(0);
          setOpen(true);
        }
      });
  }, [user]);

  // Manual reopen via Settings
  useEffect(() => {
    const handler = () => { setStepIdx(0); setOpen(true); };
    window.addEventListener(ONBOARDING_OPEN_EVENT, handler);
    return () => window.removeEventListener(ONBOARDING_OPEN_EVENT, handler);
  }, []);

  const finish = async () => {
    setOpen(false);
    if (user) {
      await supabase.from("profiles").upsert({ id: user.id, onboarded: true } as any);
    }
    // Notify other dialogs (e.g. car onboarding) that the tour is done
    window.dispatchEvent(new CustomEvent("volant:onboarding-finished"));
  };

  const step = STEPS[stepIdx];
  const isFirst = stepIdx === 0;
  const isLast = stepIdx === STEPS.length - 1;
  const next = () => setStepIdx((i) => Math.min(STEPS.length - 1, i + 1));
  const prev = () => setStepIdx((i) => Math.max(0, i - 1));

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="onb"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          className="fixed inset-0 z-[100] flex flex-col overflow-hidden bg-background"
          style={{
            paddingTop: "env(safe-area-inset-top)",
          }}
        >
          {/* Ambient gradient backdrop */}
          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            <div className="absolute -top-32 -left-24 h-72 w-72 rounded-full bg-primary/20 blur-3xl" />
            <div className="absolute -bottom-32 -right-24 h-80 w-80 rounded-full bg-primary-glow/15 blur-3xl" />
          </div>

          {/* Top bar */}
          <div className="relative z-10 flex shrink-0 items-center justify-between px-5 pt-3">
            <button
              onClick={prev}
              disabled={isFirst}
              className={cn(
                "flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition",
                isFirst ? "opacity-0 pointer-events-none" : "hover:bg-muted"
              )}
              aria-label="Voltar"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>

            {/* Progress dots — only during tour steps */}
            <div className="flex items-center gap-1.5">
              {STEPS.map((_, i) => (
                <span
                  key={i}
                  className={cn(
                    "h-1.5 rounded-full transition-all duration-300",
                    i === stepIdx ? "w-5 bg-primary" : "w-1.5 bg-muted-foreground/25"
                  )}
                />
              ))}
            </div>

            {!isLast ? (
              <button
                onClick={finish}
                className="rounded-full px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted"
              >
                Pular
              </button>
            ) : (
              <button
                onClick={finish}
                className="flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground hover:bg-muted"
                aria-label="Fechar"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Content */}
          <div className="relative z-10 mx-auto flex w-full min-h-0 max-w-md flex-1 flex-col px-5 pt-2">
            <div className="min-h-0 flex-1 overflow-y-auto pb-2">
              <AnimatePresence mode="wait">
                <motion.div
                  key={step}
                  initial={{ opacity: 0, x: 24 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -24 }}
                  transition={{ duration: 0.35, ease: "easeOut" }}
                  className="flex min-h-full flex-col"
                >
                  {step === "welcome" && <WelcomeStep />}
                  {step === "registro" && <RegistroStep />}
                  {step === "jornada" && <JornadaStep />}
                  {step === "relatorios" && <RelatoriosStep />}
                  {step === "customizacao" && <CustomizacaoStep />}
                  {step === "final" && <FinalStep onMount={fireConfetti} />}
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Footer CTA — always visible, respects iOS safe area */}
            <div
              className="shrink-0 pt-3"
              style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}
            >
              {isLast ? (
                <Button
                  onClick={finish}
                  className="h-14 w-full gradient-success text-base font-semibold text-primary-foreground shadow-fab"
                >
                  Bora rodar e lucrar
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              ) : (
                <Button
                  onClick={next}
                  className="h-14 w-full gradient-success text-base font-semibold text-primary-foreground shadow-fab"
                >
                  {isFirst ? "Começar" : "Continuar"}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function fireConfetti() {
  const colors = ["#22c55e", "#4ade80", "#86efac", "#bbf7d0"];
  const burst = (origin: { x: number; y: number }) => {
    confetti({
      particleCount: 60,
      spread: 70,
      startVelocity: 35,
      origin,
      colors,
      scalar: 0.9,
      ticks: 200,
    });
  };
  burst({ x: 0.2, y: 0.4 });
  setTimeout(() => burst({ x: 0.8, y: 0.4 }), 180);
  setTimeout(() => burst({ x: 0.5, y: 0.3 }), 360);
}

/* ============================================================
 *  STEP 1 — Welcome
 * ============================================================ */
function WelcomeStep() {
  const reduce = useReducedMotion();
  return (
    <div className="flex min-h-full flex-1 flex-col items-center justify-center py-6 text-center">
      <motion.div
        initial={reduce ? {} : { scale: 0.85 }}
        animate={{ scale: 1 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="relative mb-6"
      >
        <div className="absolute inset-0 -z-10 animate-pulse rounded-full bg-primary/25 blur-3xl" />
        <div className="h-28 w-28 overflow-hidden rounded-full border border-primary/20 bg-[#0b1220] shadow-[0_0_24px_hsl(var(--primary)/0.45)]">
          <img
            src="/volant-logo-splash.png"
            alt="Volant"
            loading="eager"
            decoding="sync"
            // @ts-expect-error fetchpriority is valid HTML
            fetchpriority="high"
            className="h-full w-full scale-110 object-cover"
          />
        </div>
      </motion.div>

      <motion.div
        initial={reduce ? {} : { y: 12, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.4 }}
        className="space-y-2"
      >
        <div className="text-xs font-semibold uppercase tracking-[0.18em] text-primary/80">
          Bem-vindo ao Volant
        </div>
        <h1 className="text-3xl font-bold leading-tight text-foreground">
          <span className="text-primary">Mais controle,</span>
          <br />
          <span className="text-primary">mais lucro.</span>
        </h1>
        <p className="mx-auto mt-3 max-w-xs text-[14px] leading-relaxed text-muted-foreground">
          Vamos te mostrar como o Volant trabalha por você no dia a dia das corridas.
        </p>
      </motion.div>
    </div>
  );
}

/* ============================================================
 *  STEP 2 — Registro rápido
 * ============================================================ */
function RegistroStep() {
  // Looped scenario: idle → radial open → drawer with prefilled fields
  const PHASES = ["idle", "radial", "drawer"] as const;
  type Phase = typeof PHASES[number];
  const [phase, setPhase] = useState<Phase>("idle");

  useEffect(() => {
    const t1 = setTimeout(() => setPhase("radial"), 900);
    const t2 = setTimeout(() => setPhase("drawer"), 2200);
    const t3 = setTimeout(() => setPhase("idle"), 6500);
    return () => { [t1, t2, t3].forEach(clearTimeout); };
  }, []);

  return (
    <StepShell
      eyebrow="Registro rápido"
      title="Lance um ganho em segundos"
      description="Toque no + verde, escolha ganho ou gasto e preencha — leva poucos segundos."
    >
      <PhoneFrame>
        <div className="absolute inset-0 flex flex-col bg-background">
          {/* Mock home content */}
          <div className="flex-1 space-y-1.5 p-2.5 opacity-90">
            <div className="text-[10px] font-semibold">Olá, Lucas 👋</div>
            <div className="rounded-lg gradient-success/30 border border-success/30 bg-success/10 p-2">
              <div className="text-[8px] font-semibold uppercase tracking-wider text-success/80">Lucro líquido</div>
              <div className="text-base font-bold tabular-nums text-success">R$ 142,30</div>
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              <div className="rounded-lg border border-border bg-card p-1.5">
                <div className="text-[8px] uppercase text-success/80">Bruto</div>
                <div className="text-[11px] font-bold tabular-nums">R$ 184,50</div>
              </div>
              <div className="rounded-lg border border-border bg-card p-1.5">
                <div className="text-[8px] uppercase text-destructive/80">Gastos</div>
                <div className="text-[11px] font-bold tabular-nums">R$ 42,20</div>
              </div>
            </div>
          </div>

          {/* Bottom nav mock — real layout with center FAB */}
          <div className="relative border-t border-border bg-card/80 px-2 pt-2 pb-1.5">
            <div className="grid grid-cols-5 items-center text-[8px] text-muted-foreground">
              <div className="flex flex-col items-center gap-0.5"><div className="h-3 w-3 rounded-sm bg-primary/60" /><span className="text-primary">Início</span></div>
              <div className="flex flex-col items-center gap-0.5"><div className="h-3 w-3 rounded-sm bg-muted-foreground/30" /><span>Histórico</span></div>
              <div aria-hidden />
              <div className="flex flex-col items-center gap-0.5"><div className="h-3 w-3 rounded-sm bg-muted-foreground/30" /><span>Relatórios</span></div>
              <div className="flex flex-col items-center gap-0.5"><div className="h-3 w-3 rounded-sm bg-muted-foreground/30" /><span>Ajustes</span></div>
            </div>
          </div>

          {/* Backdrop when radial/drawer open */}
          <AnimatePresence>
            {(phase === "radial" || phase === "drawer") && (
              <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="absolute inset-0 bg-background/60 backdrop-blur-[2px]"
              />
            )}
          </AnimatePresence>

          {/* Radial actions — float above FAB */}
          <AnimatePresence>
            {phase === "radial" && (
              <motion.div
                initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}
                className="absolute inset-x-0 bottom-16 z-10 flex justify-center gap-2 px-3"
              >
                <div className="flex items-center gap-1 rounded-full border border-border bg-card px-2 py-1 text-[9px] font-semibold shadow-elevated">
                  <span className="grid h-4 w-4 place-items-center rounded-full bg-success/15 text-success">
                    <TrendingUp className="h-2.5 w-2.5" />
                  </span>
                  Novo ganho
                </div>
                <div className="flex items-center gap-1 rounded-full border border-border bg-card px-2 py-1 text-[9px] font-semibold shadow-elevated">
                  <span className="grid h-4 w-4 place-items-center rounded-full bg-destructive/15 text-destructive">
                    <TrendingDown className="h-2.5 w-2.5" />
                  </span>
                  Novo gasto
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Center FAB — anchored to nav center via flex centering for pixel-perfect alignment */}
          <div className="pointer-events-none absolute inset-x-0 bottom-3 z-20 flex justify-center">
            <motion.div
              animate={
                phase === "idle"
                  ? { scale: [1, 1.08, 1] }
                  : { scale: 1, rotate: phase === "radial" ? 45 : 0 }
              }
              transition={
                phase === "idle"
                  ? { duration: 1.6, repeat: Infinity, ease: "easeInOut" }
                  : { duration: 0.25 }
              }
              className="pointer-events-auto grid h-10 w-10 place-items-center rounded-full gradient-success text-primary-foreground shadow-fab ring-4 ring-background"
            >
              {phase === "radial" ? <X className="h-5 w-5" strokeWidth={2.5} /> : <Plus className="h-5 w-5" strokeWidth={2.5} />}
            </motion.div>
          </div>

          {/* Drawer mock — mirrors real "Novo registro" form */}
          <AnimatePresence>
            {phase === "drawer" && (
              <motion.div
                initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
                transition={{ type: "spring", damping: 24, stiffness: 240 }}
                className="absolute inset-x-0 bottom-0 max-h-[88%] overflow-hidden rounded-t-2xl border-t border-border bg-card p-3 shadow-elevated"
              >
                <div className="mx-auto mb-1.5 h-1 w-8 rounded-full bg-muted-foreground/30" />
                <div className="mb-2 text-center text-[11px] font-semibold">Novo registro</div>

                <div className="space-y-2">
                  <div>
                    <div className="mb-0.5 text-[8px] font-semibold text-muted-foreground">Data do registro</div>
                    <div className="flex items-center gap-1.5 rounded-md border border-border bg-muted/30 px-2 py-1.5 text-[10px]">
                      <Calendar className="h-3 w-3 text-muted-foreground" />
                      15 de maio de 2026
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-0.5 rounded-md border border-border bg-muted/30 p-0.5">
                    <div className="flex items-center justify-center gap-1 rounded bg-card py-1 text-[10px] font-semibold">
                      <TrendingUp className="h-2.5 w-2.5 text-success" /> Lucro
                    </div>
                    <div className="flex items-center justify-center gap-1 py-1 text-[10px] text-muted-foreground">
                      <TrendingDown className="h-2.5 w-2.5" /> Gasto
                    </div>
                  </div>

                  <div>
                    <div className="mb-0.5 flex items-center justify-between text-[8px] font-semibold">
                      <span className="text-muted-foreground">Plataforma</span>
                      <span className="text-primary">+ Nova plataforma</span>
                    </div>
                    <div className="flex items-center justify-between rounded-md border border-border bg-muted/30 px-2 py-1.5 text-[10px]">
                      <div className="flex items-center gap-1.5">
                        <div className="grid h-4 w-4 place-items-center rounded-full bg-foreground text-[6px] font-bold text-background">U</div>
                        Uber
                      </div>
                      <ChevronDown className="h-3 w-3 text-muted-foreground" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <div className="mb-0.5 text-[8px] font-semibold text-muted-foreground">Horas trabalhadas</div>
                      <div className="rounded-md border border-border bg-muted/30 px-2 py-1.5 text-[10px] text-muted-foreground/70">Ex: 6.5</div>
                    </div>
                    <div>
                      <div className="mb-0.5 text-[8px] font-semibold text-muted-foreground">Valor recebido</div>
                      <motion.div
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }}
                        className="rounded-md border border-success/40 bg-success/10 px-2 py-1.5 text-[10px] font-bold tabular-nums text-success"
                      >
                        R$ 80,00
                      </motion.div>
                    </div>
                  </div>

                  <div className="flex gap-2 pt-1">
                    <div className="flex-1 rounded-md border border-border py-1.5 text-center text-[10px]">Cancelar</div>
                    <div className="flex-1 rounded-md gradient-success py-1.5 text-center text-[10px] font-semibold text-primary-foreground">Salvar</div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </PhoneFrame>
    </StepShell>
  );
}

/* ============================================================
 *  STEP 3 — Jornada (fictional scenario)
 * ============================================================ */
function JornadaStep() {
  // Looped: idle → goal → running → resting → running → ended (drawer)
  const PHASES = ["idle", "goal", "running", "resting", "running2", "ended"] as const;
  type Phase = typeof PHASES[number];
  const [phase, setPhase] = useState<Phase>("idle");
  const [workSec, setWorkSec] = useState(0);
  const [restSec, setRestSec] = useState(0);

  useEffect(() => {
    const ts: any[] = [];
    ts.push(setTimeout(() => setPhase("goal"), 600));
    ts.push(setTimeout(() => setPhase("running"), 1900));
    ts.push(setTimeout(() => setPhase("resting"), 4200));
    ts.push(setTimeout(() => setPhase("running2"), 6000));
    ts.push(setTimeout(() => setPhase("ended"), 7800));
    ts.push(setTimeout(() => { setPhase("idle"); setWorkSec(0); setRestSec(0); }, 12500));
    return () => ts.forEach(clearTimeout);
  }, []);

  useEffect(() => {
    if (phase === "running" || phase === "running2") {
      const i = setInterval(() => setWorkSec((s) => s + 53), 90);
      return () => clearInterval(i);
    }
    if (phase === "resting") {
      const i = setInterval(() => setRestSec((s) => s + 23), 90);
      return () => clearInterval(i);
    }
  }, [phase]);

  const fmt = (sec: number) => {
    const h = String(Math.floor(sec / 3600)).padStart(2, "0");
    const m = String(Math.floor((sec % 3600) / 60)).padStart(2, "0");
    const s = String(sec % 60).padStart(2, "0");
    return `${h}:${m}:${s}`;
  };
  const hoursDecimal = (workSec / 3600).toFixed(2).replace(".", ",");

  const isRunning = phase === "running" || phase === "running2";
  const isResting = phase === "resting";

  return (
    <StepShell
      eyebrow="Jornada inteligente"
      title="Meta, descanso e ganho automático"
      description="Defina a meta ao iniciar, pause para descansar e, ao encerrar, o registro de ganho abre com as horas já preenchidas."
    >
      <PhoneFrame>
        <div className="absolute inset-0 flex flex-col bg-background">
          <div className="border-b border-border/60 bg-card/80 px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Jornada
          </div>

          <div className="flex-1 p-3">
            <div className="rounded-xl border border-border bg-card p-3 shadow-sm">
              <div className="mb-2 flex items-center gap-1.5 text-[10px] text-muted-foreground">
                <span className={cn(
                  "h-1.5 w-1.5 rounded-full",
                  isRunning ? "bg-primary animate-pulse" :
                  isResting ? "bg-warning" :
                  phase === "ended" ? "bg-success" : "bg-muted-foreground/40"
                )} />
                {isRunning ? "Trabalhando" : isResting ? "Em descanso" : phase === "ended" ? "Encerrada" : "Parado"}
              </div>

              <div className="flex flex-col items-center rounded-lg bg-muted/40 py-3">
                <span className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">Tempo</span>
                <span className="mt-1 text-2xl font-bold tabular-nums leading-none">
                  {fmt(workSec)}
                </span>
              </div>

              <div className="mt-2 grid grid-cols-2 gap-1.5">
                <div className="rounded-md bg-muted/50 px-2 py-1">
                  <div className="text-[7px] uppercase tracking-wider text-muted-foreground">Trabalhado</div>
                  <div className="text-[10px] font-bold tabular-nums">{fmt(workSec)}</div>
                </div>
                <div className="rounded-md bg-muted/50 px-2 py-1">
                  <div className="text-[7px] uppercase tracking-wider text-muted-foreground">Descanso</div>
                  <div className="text-[10px] font-bold tabular-nums">{fmt(restSec)}</div>
                </div>
              </div>

              <div className="mt-2.5 space-y-1.5">
                {phase === "idle" && (
                  <div className="flex h-8 w-full items-center justify-center gap-1.5 rounded-md gradient-success text-[11px] font-semibold text-primary-foreground">
                    <Play className="h-3 w-3" /> Iniciar jornada
                  </div>
                )}
                {isRunning && (
                  <>
                    <div className="flex h-8 w-full items-center justify-center gap-1.5 rounded-md border border-border bg-card text-[11px] font-semibold">
                      ☕ Pausar para descanso
                    </div>
                    <div className="flex h-7 w-full items-center justify-center gap-1.5 rounded-md border border-destructive/40 text-[11px] font-semibold text-destructive">
                      <StopCircle className="h-3 w-3" /> Encerrar jornada
                    </div>
                  </>
                )}
                {isResting && (
                  <>
                    <div className="flex h-8 w-full items-center justify-center gap-1.5 rounded-md gradient-success text-[11px] font-semibold text-primary-foreground">
                      <Play className="h-3 w-3" /> Retornar do descanso
                    </div>
                    <div className="flex h-7 w-full items-center justify-center gap-1.5 rounded-md border border-destructive/40 text-[11px] font-semibold text-destructive">
                      <StopCircle className="h-3 w-3" /> Encerrar jornada
                    </div>
                  </>
                )}
                {phase === "ended" && (
                  <div className="flex h-8 w-full items-center justify-center gap-1.5 rounded-md bg-success/15 text-[11px] font-semibold text-success">
                    <CheckCircle2 className="h-3 w-3" /> Jornada encerrada
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Goal modal overlay */}
          <AnimatePresence>
            {phase === "goal" && (
              <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="absolute inset-0 flex items-end bg-background/70 backdrop-blur-sm"
              >
                <motion.div
                  initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
                  transition={{ type: "spring", damping: 22, stiffness: 220 }}
                  className="w-full rounded-t-2xl border-t border-border bg-card p-3 shadow-elevated"
                >
                  <div className="mx-auto mb-2 h-1 w-8 rounded-full bg-muted-foreground/30" />
                  <div className="mb-1 flex items-center gap-1.5 text-[11px] font-semibold">
                    <Target className="h-3 w-3 text-primary" /> Meta da jornada
                  </div>
                  <div className="rounded-md bg-muted/50 px-2 py-2 text-[13px] font-bold tabular-nums text-foreground">
                    R$ 250,00
                  </div>
                  <div className="mt-2 flex h-7 w-full items-center justify-center gap-1.5 rounded-md gradient-success text-[11px] font-semibold text-primary-foreground">
                    <Play className="h-3 w-3" /> Iniciar
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Earning drawer mirroring the real "Novo registro" form */}
          <AnimatePresence>
            {phase === "ended" && (
              <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="absolute inset-0 flex items-end bg-background/70 backdrop-blur-sm"
              >
                <motion.div
                  initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
                  transition={{ type: "spring", damping: 22, stiffness: 220, delay: 0.2 }}
                  className="max-h-[92%] w-full overflow-hidden rounded-t-2xl border-t border-border bg-card p-2.5 shadow-elevated"
                >
                  <div className="mx-auto mb-1.5 h-1 w-8 rounded-full bg-muted-foreground/30" />
                  <div className="mb-2 text-center text-[11px] font-semibold">Novo registro</div>

                  <div className="space-y-1.5">
                    <div>
                      <div className="mb-0.5 text-[8px] font-semibold text-muted-foreground">Data do registro</div>
                      <div className="flex items-center gap-1.5 rounded-md border border-border bg-muted/30 px-2 py-1 text-[9px]">
                        <Calendar className="h-2.5 w-2.5 text-muted-foreground" />
                        16 de maio de 2026
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-0.5 rounded-md border border-border bg-muted/30 p-0.5">
                      <div className="flex items-center justify-center gap-1 rounded bg-card py-0.5 text-[9px] font-semibold">
                        <TrendingUp className="h-2.5 w-2.5 text-success" /> Lucro
                      </div>
                      <div className="flex items-center justify-center gap-1 py-0.5 text-[9px] text-muted-foreground">
                        <TrendingDown className="h-2.5 w-2.5" /> Gasto
                      </div>
                    </div>

                    <div>
                      <div className="mb-0.5 flex items-center justify-between text-[8px] font-semibold">
                        <span className="text-muted-foreground">Plataforma</span>
                        <span className="text-primary">+ Nova plataforma</span>
                      </div>
                      <div className="flex items-center justify-between rounded-md border border-border bg-muted/30 px-2 py-1 text-[9px]">
                        <div className="flex items-center gap-1.5">
                          <div className="grid h-3.5 w-3.5 place-items-center rounded-full bg-foreground text-[5px] font-bold text-background">U</div>
                          Uber
                        </div>
                        <ChevronDown className="h-2.5 w-2.5 text-muted-foreground" />
                      </div>
                    </div>

                    <div>
                      <div className="mb-0.5 flex items-center justify-between text-[8px] font-semibold text-muted-foreground">
                        <span>Quilometragem</span>
                        <span className="flex gap-0.5 rounded-full bg-muted/40 p-0.5">
                          <span className="rounded-full bg-card px-1.5 py-0 text-[7px] text-foreground">Total</span>
                          <span className="px-1.5 py-0 text-[7px]">Ini/Fim</span>
                        </span>
                      </div>
                      <div className="rounded-md border border-border bg-muted/30 px-2 py-1 text-[9px] text-muted-foreground/60">Km rodados</div>
                    </div>

                    <div className="grid grid-cols-2 gap-1.5">
                      <div>
                        <div className="mb-0.5 text-[8px] font-semibold text-muted-foreground">Horas trabalhadas</div>
                        <motion.div
                          initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                          transition={{ delay: 0.5 }}
                          className="rounded-md border-2 border-success bg-success/10 px-2 py-1 text-[10px] font-bold tabular-nums text-success"
                        >
                          {hoursDecimal}
                        </motion.div>
                      </div>
                      <div>
                        <div className="mb-0.5 text-[8px] font-semibold text-muted-foreground">Valor recebido</div>
                        <div className="rounded-md border border-border bg-muted/30 px-2 py-1 text-[9px] text-muted-foreground/60">R$ 0,00</div>
                      </div>
                    </div>

                    <div>
                      <div className="mb-0.5 text-[8px] font-semibold text-muted-foreground">Quantidade de corridas</div>
                      <div className="rounded-md border border-border bg-muted/30 px-2 py-1 text-[9px] text-muted-foreground/60">Opcional</div>
                    </div>

                    <div className="flex gap-1.5 pt-1">
                      <div className="flex-1 rounded-md border border-border py-1 text-center text-[10px]">Cancelar</div>
                      <div className="flex-1 rounded-md gradient-success py-1 text-center text-[10px] font-semibold text-primary-foreground">Salvar</div>
                    </div>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </PhoneFrame>

      <div className="mt-3 flex items-start gap-2 rounded-xl border border-primary/20 bg-primary/5 p-2.5 text-[11px] text-foreground/80">
        <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
        <span>
          Inicia com a meta, pausa para descansar e termina com as horas já no formulário.
        </span>
      </div>
    </StepShell>
  );
}

/* ============================================================
 *  STEP 4 — Histórico & Relatórios
 * ============================================================ */
function RelatoriosStep() {
  return (
    <StepShell
      eyebrow="Histórico & Relatórios"
      title="Veja para onde seu dinheiro vai"
      description="Bruto, gastos, líquido e performance por hora, km, dia e corrida."
    >
      <PhoneFrame>
        <div className="absolute inset-0 flex flex-col overflow-y-auto bg-background p-2.5">
          {/* Header */}
          <div className="mb-1.5">
            <div className="text-[12px] font-bold leading-tight">Relatórios</div>
            <div className="text-[8px] text-muted-foreground">maio de 2026</div>
          </div>

          {/* Period tabs */}
          <div className="mb-2 grid grid-cols-3 gap-0.5 rounded-full border border-border bg-muted/30 p-0.5 text-[8px]">
            <div className="rounded-full gradient-success py-1 text-center font-semibold text-primary-foreground">Por mês</div>
            <div className="py-1 text-center text-muted-foreground">Por ano</div>
            <div className="py-1 text-center text-muted-foreground">Person.</div>
          </div>

          {/* Lucro líquido big card with chart */}
          <motion.div
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            className="mb-1.5 rounded-xl border border-success/40 bg-success/5 p-2"
          >
            <div className="flex items-center gap-1 text-[8px] font-semibold uppercase tracking-wider text-success">
              <Wallet className="h-2.5 w-2.5" /> Lucro líquido
            </div>
            <div className="mt-0.5 text-base font-bold tabular-nums">R$ 1.112,67</div>
            <svg viewBox="0 0 120 28" className="mt-1 h-6 w-full">
              <motion.path
                d="M2 24 Q14 22 22 22 T40 16 Q46 6 52 7 Q58 8 64 22 T120 22"
                fill="none" stroke="hsl(var(--success))" strokeWidth="1.8" strokeLinecap="round"
                initial={{ pathLength: 0 }} animate={{ pathLength: 1 }}
                transition={{ delay: 0.4, duration: 1.2, ease: "easeOut" }}
              />
            </svg>
          </motion.div>

          {/* Média por hora */}
          <motion.div
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
            className="mb-1.5 rounded-xl border border-success/30 bg-success/5 p-2"
          >
            <div className="flex items-center gap-1 text-[8px] font-semibold uppercase tracking-wider text-success">
              <Gauge className="h-2.5 w-2.5" /> Média por hora
            </div>
            <div className="mt-0.5 text-sm font-bold tabular-nums">R$ 59,46</div>
            <div className="text-[8px] text-muted-foreground">com 24,0h trabalhadas</div>
          </motion.div>

          {/* Bruto / Gastos side by side */}
          <div className="grid grid-cols-2 gap-1.5">
            <motion.div
              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
              className="rounded-xl border border-info/30 bg-info/5 p-2"
            >
              <div className="flex items-center gap-1 text-[8px] font-semibold uppercase tracking-wider text-info">
                <Wallet className="h-2.5 w-2.5" /> Bruto
              </div>
              <div className="mt-0.5 text-[11px] font-bold tabular-nums">R$ 1.427,01</div>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}
              className="rounded-xl border border-destructive/30 bg-destructive/5 p-2"
            >
              <div className="flex items-center gap-1 text-[8px] font-semibold uppercase tracking-wider text-destructive">
                <Receipt className="h-2.5 w-2.5" /> Gastos
              </div>
              <div className="mt-0.5 text-[11px] font-bold tabular-nums">R$ 314,34</div>
            </motion.div>
          </div>

          {/* Dias / Média dia */}
          <motion.div
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }}
            className="mt-1.5 grid grid-cols-2 gap-2 rounded-xl border border-success/30 bg-card p-2 text-center"
          >
            <div>
              <div className="text-[7px] font-semibold uppercase tracking-wider text-success">📅 Dias ativos</div>
              <div className="mt-0.5 text-[10px] font-bold">4 dias</div>
            </div>
            <div className="border-l border-border">
              <div className="text-[7px] font-semibold uppercase tracking-wider text-success">Média / dia</div>
              <div className="mt-0.5 text-[10px] font-bold tabular-nums">R$ 326,13</div>
            </div>
          </motion.div>

          {/* KM total / Média km */}
          <motion.div
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.55 }}
            className="mt-1.5 grid grid-cols-2 gap-2 rounded-xl border border-info/30 bg-card p-2 text-center"
          >
            <div>
              <div className="text-[7px] font-semibold uppercase tracking-wider text-info">KM total</div>
              <div className="mt-0.5 text-[10px] font-bold tabular-nums">690 km</div>
            </div>
            <div className="border-l border-border">
              <div className="text-[7px] font-semibold uppercase tracking-wider text-info">Média / km</div>
              <div className="mt-0.5 text-[10px] font-bold tabular-nums">R$ 2,52</div>
            </div>
          </motion.div>

          {/* Corridas / R$ por corrida */}
          <motion.div
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.65 }}
            className="mt-1.5 mb-1 grid grid-cols-2 gap-2 rounded-xl border border-[hsl(280_70%_60%/0.3)] bg-card p-2 text-center"
          >
            <div>
              <div className="text-[7px] font-semibold uppercase tracking-wider text-[hsl(280_70%_70%)]">🏁 Corridas</div>
              <div className="mt-0.5 text-[10px] font-bold tabular-nums">39</div>
            </div>
            <div className="border-l border-border">
              <div className="text-[7px] font-semibold uppercase tracking-wider text-[hsl(280_70%_70%)]">R$ / corrida</div>
              <div className="mt-0.5 text-[10px] font-bold tabular-nums">R$ 44,59</div>
            </div>
          </motion.div>
        </div>
      </PhoneFrame>
    </StepShell>
  );
}

/* ============================================================
 *  STEP 5 — Customização (real)
 * ============================================================ */
function CustomizacaoStep() {
  // Real settings: tap the whole card to toggle on/off. No switches.
  const [home, setHome] = useState<Record<string, boolean>>({
    meta: true, performance: true, byApp: true, gastos: false, jornada: true,
  });

  // Animate toggle to suggest tap-to-activate
  useEffect(() => {
    const t1 = setTimeout(() => setHome((h) => ({ ...h, gastos: true })), 900);
    const t2 = setTimeout(() => setHome((h) => ({ ...h, byApp: false })), 1900);
    const t3 = setTimeout(() => setHome((h) => ({ ...h, byApp: true })), 2700);
    return () => { [t1, t2, t3].forEach(clearTimeout); };
  }, []);

  return (
    <StepShell
      eyebrow="Personalização"
      title="Monte a tela do seu jeito"
      description="Em Ajustes, toque no card para ativar ou desativar. Reordene pela alça ou pelas setas."
    >
      <MiniSettingsCard icon={<Sliders className="h-3.5 w-3.5" />} title="Tela inicial">
        <p className="-mt-1 mb-1.5 text-[10px] leading-snug text-muted-foreground">
          Toque no card para ativar/desativar. Arraste pela alça ou use as setas para reordenar.
        </p>
        <CardToggleRow label="Meta" icon={<Target className="h-3 w-3" />} active={home.meta} />
        <CardToggleRow label="Performance" icon={<Gauge className="h-3 w-3" />} active={home.performance} />
        <CardToggleRow label="Por app" icon={<BarChart3 className="h-3 w-3" />} active={home.byApp} />
        <CardToggleRow label="Gastos" icon={<Receipt className="h-3 w-3" />} active={home.gastos} />
        <CardToggleRow label="Jornada" icon={<Clock className="h-3 w-3" />} active={home.jornada} isLast />
      </MiniSettingsCard>

      <div className="mt-3 flex items-start gap-2 rounded-xl border border-primary/20 bg-primary/5 p-2.5 text-[11px] text-foreground/80">
        <Sliders className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
        <span>O mesmo funciona em Relatórios: você escolhe quais cards aparecem e em qual ordem.</span>
      </div>
    </StepShell>
  );
}

/* ============================================================
 *  STEP 6 — Final
 * ============================================================ */
function FinalStep({ onMount }: { onMount: () => void }) {
  const { user } = useAuth();
  const name = useMemo(() => {
    const n = (user?.user_metadata as any)?.display_name
      || (user?.user_metadata as any)?.full_name
      || user?.email?.split("@")[0]
      || "motorista";
    return String(n).split(" ")[0];
  }, [user]);

  useEffect(() => {
    const t = setTimeout(onMount, 200);
    return () => clearTimeout(t);
  }, [onMount]);

  return (
    <div className="flex min-h-full flex-1 flex-col items-center justify-center py-6 text-center">
      <motion.div
        initial={{ scale: 0.4, opacity: 0, rotate: -10 }}
        animate={{ scale: 1, opacity: 1, rotate: 0 }}
        transition={{ type: "spring", damping: 14, stiffness: 200 }}
        className="mb-6 flex h-24 w-24 items-center justify-center rounded-full gradient-success shadow-fab"
      >
        <CheckCircle2 className="h-12 w-12 text-primary-foreground" />
      </motion.div>

      <motion.h1
        initial={{ y: 12, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="text-[26px] font-bold capitalize leading-tight"
      >
        Tudo pronto, {name}! 🚀
      </motion.h1>
      <motion.p
        initial={{ y: 12, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.35 }}
        className="mt-3 max-w-xs text-[15px] leading-relaxed text-foreground/90"
      >
        Agora é sua vez. Registre seu primeiro ganho e descubra <span className="font-semibold text-primary">quanto realmente sobra no fim do dia</span>.
      </motion.p>
    </div>
  );
}

/* ============================================================
 *  Shared mock building blocks
 * ============================================================ */

function StepShell({
  eyebrow, title, description, children,
}: { eyebrow: string; title: string; description: string; children: React.ReactNode }) {
  return (
    <div className="flex min-h-full flex-col">
      <div className="mb-4 text-center">
        <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary/80">{eyebrow}</div>
        <h2 className="mt-1.5 text-[22px] font-bold leading-tight text-foreground">{title}</h2>
        <p className="mx-auto mt-2 max-w-[320px] text-[13.5px] leading-relaxed text-muted-foreground">{description}</p>
      </div>
      <div className="flex flex-1 flex-col items-stretch justify-center gap-3">{children}</div>
    </div>
  );
}

function PhoneFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative mx-auto aspect-[9/16] h-auto max-h-[60vh] w-full max-w-[280px] overflow-hidden rounded-[32px] border-[3px] border-foreground/10 bg-card shadow-elevated">
      {children}
    </div>
  );
}

function MockCard({
  label, value, tone,
}: { label: string; value: string; tone: "default" | "success" | "destructive" }) {
  const toneClass =
    tone === "success" ? "text-success" :
    tone === "destructive" ? "text-destructive" : "text-foreground";
  return (
    <div className="rounded-lg border border-border bg-card p-2">
      <div className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={cn("mt-0.5 text-sm font-bold tabular-nums", toneClass)}>{value}</div>
    </div>
  );
}

function MiniSettingsCard({
  icon, title, children,
}: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-3 shadow-sm">
      <div className="mb-2 flex items-center gap-2 text-[12px] font-semibold">
        <span className="flex h-6 w-6 items-center justify-center rounded-md bg-primary/10 text-primary">
          {icon}
        </span>
        {title}
      </div>
      <div className="space-y-1.5">{children}</div>
    </div>
  );
}

function CardToggleRow({
  label, icon, active, isLast,
}: { label: string; icon: React.ReactNode; active: boolean; isLast?: boolean }) {
  return (
    <motion.div
      layout
      animate={{
        backgroundColor: active ? "hsl(var(--success) / 0.05)" : "hsl(var(--card))",
      }}
      transition={{ duration: 0.25 }}
      className={cn(
        "flex items-center justify-between rounded-xl border px-2.5 py-2",
        active ? "border-success/50" : "border-border"
      )}
    >
      <div className="flex items-center gap-2 text-[12px]">
        <GripVertical className="h-3 w-3 text-muted-foreground/60" />
        <span
          className={cn(
            "flex h-6 w-6 items-center justify-center rounded-full",
            active ? "bg-success/15 text-success" : "bg-muted text-muted-foreground"
          )}
        >
          {icon}
        </span>
        <span className="font-medium">{label}</span>
      </div>
      <div className="flex items-center gap-1.5">
        <motion.span
          animate={{ opacity: active ? 1 : 0.45 }}
          className={cn(
            "text-[9px] font-bold uppercase tracking-wider",
            active ? "text-success" : "text-muted-foreground"
          )}
        >
          {active ? "Ativo" : "Inativo"}
        </motion.span>
        <span className="text-muted-foreground/60">↑</span>
        <span className={cn(isLast ? "text-muted-foreground/30" : "text-muted-foreground/80")}>↓</span>
      </div>
    </motion.div>
  );
}
