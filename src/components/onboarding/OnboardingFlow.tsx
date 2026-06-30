import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import confetti from "canvas-confetti";
import {
  ArrowRight, ArrowLeft, X, Plus, Play, StopCircle, Target,
  Clock, BarChart3, Sliders, GripVertical, CheckCircle2, Sparkles,
  TrendingUp, TrendingDown, Calendar, Wallet, Receipt, Gauge,
  Brain, Route, Home, History, MoreHorizontal,
} from "lucide-react";
import { Button } from "@/components/ui/button";

import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { isStandalone, detectPlatform } from "@/lib/pwaInstall";
import { OnboardingInstallStep } from "./OnboardingInstallStep";
import volantLogoSplash from "@/assets/volant-logo-splash.webp";

export const ONBOARDING_OPEN_EVENT = "volant:open-onboarding";

type StepKey = "instalar" | "welcome" | "registro" | "jornada" | "relatorios" | "customizacao" | "planejamento" | "final";

const BASE_STEPS: StepKey[] = ["welcome", "registro", "jornada", "relatorios", "customizacao", "planejamento", "final"];

/** Decide se o passo "instalar" deve ser incluído pra este usuário/sessão. */
function shouldShowInstallStep(installPromptSeen: boolean): boolean {
  if (installPromptSeen) return false;
  if (typeof window === "undefined") return false;
  if (isStandalone()) return false;
  const p = detectPlatform();
  // Desktop / não-suportado: sem valor mostrar o passo.
  return p === "android-chrome" || p === "ios-safari" || p === "ios-other";
}

export function OnboardingFlow() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [stepIdx, setStepIdx] = useState(0);
  const [steps, setSteps] = useState<StepKey[]>(BASE_STEPS);
  const checked = useRef(false);

  // Initial check from DB (only once after auth)
  useEffect(() => {
    if (!user || checked.current) return;
    checked.current = true;
    supabase
      .from("profiles")
      .select("onboarded, install_prompt_seen")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data && (data as any).onboarded === false) {
          const seen = Boolean((data as any).install_prompt_seen);
          const withInstall: StepKey[] = shouldShowInstallStep(seen)
            ? ["instalar", ...BASE_STEPS]
            : BASE_STEPS;
          setSteps(withInstall);
          setStepIdx(0);
          setOpen(true);
        }
      });
  }, [user]);

  // Manual reopen via Settings
  useEffect(() => {
    const handler = () => {
      setSteps(BASE_STEPS);
      setStepIdx(0);
      setOpen(true);
    };
    window.addEventListener(ONBOARDING_OPEN_EVENT, handler);
    return () => window.removeEventListener(ONBOARDING_OPEN_EVENT, handler);
  }, []);

  const finish = async () => {
    setOpen(false);
    if (user) {
      await supabase.from("profiles").upsert({
        id: user.id,
        onboarded: true,
        install_prompt_seen: true,
      } as any);
    }
    window.dispatchEvent(new CustomEvent("volant:onboarding-finished"));
  };

  const markInstallSeen = async () => {
    if (user) {
      await supabase.from("profiles").upsert({
        id: user.id,
        install_prompt_seen: true,
      } as any);
    }
  };

  const step = steps[stepIdx];
  const isFirst = stepIdx === 0;
  const isLast = stepIdx === steps.length - 1;
  const isInstallStep = step === "instalar";
  const next = () => setStepIdx((i) => Math.min(steps.length - 1, i + 1));
  const prev = () => setStepIdx((i) => Math.max(0, i - 1));

  const handleInstallDone = async () => {
    await markInstallSeen();
    next();
  };


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

            <div className="flex items-center gap-1.5">
              {steps.map((_, i) => (
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
                  {step === "instalar" && <OnboardingInstallStep onDone={handleInstallDone} />}
                  {step === "welcome" && <WelcomeStep />}
                  {step === "registro" && <RegistroStep />}
                  {step === "jornada" && <JornadaStep />}
                  {step === "relatorios" && <RelatoriosStep />}
                  {step === "customizacao" && <CustomizacaoStep />}
                  {step === "planejamento" && <PlanejamentoStep />}
                  {step === "final" && <FinalStep onMount={fireConfetti} />}
                </motion.div>
              </AnimatePresence>
            </div>

            {!isInstallStep && (
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
            )}
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
            src={volantLogoSplash}
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
      description="Toque no + verde, escolha ganho ou gasto e preencha. Leva poucos segundos."
    >
      <PhoneFrame>
        <div className="absolute inset-0 flex flex-col bg-background">
          {/* Mock home content — hero + Meta + KM Inteligente + Performance */}
          <div className="flex-1 space-y-1.5 overflow-hidden p-2 opacity-90">
            <div className="flex items-center justify-between">
              <div className="text-[10px] font-semibold">Olá, Motorista 👋</div>
              <div className="h-4 w-4 rounded-full bg-muted" />
            </div>

            {/* Hero: LUCRO LÍQUIDO */}
            <div className="rounded-xl border border-success/30 bg-success/10 p-2">
              <div className="flex items-center justify-between">
                <div className="text-[8px] font-semibold uppercase tracking-wider text-success/80">
                  Lucro líquido
                </div>
                <div className="flex items-center gap-0.5 rounded-full border border-border/60 bg-card/70 p-[1px]">
                  <span className="rounded-full bg-success/20 px-1.5 py-[1px] text-[7px] font-semibold text-success">
                    Líquido
                  </span>
                  <span className="px-1.5 py-[1px] text-[7px] font-medium text-muted-foreground">
                    Bruto
                  </span>
                </div>
              </div>
              <div className="mt-0.5 text-[7px] text-muted-foreground">depois dos gastos</div>
              <div className="mt-0.5 text-lg font-bold tabular-nums leading-none text-success">
                R$ 142,30
              </div>
              <div className="mt-1 text-[8px] text-muted-foreground">
                <span className="text-info">Bruto R$ 184,50</span>
                <span className="px-1 text-muted-foreground/60">·</span>
                <span className="text-destructive">Gastos R$ 42,20</span>
              </div>
            </div>

            {/* Meta do dia */}
            <div className="rounded-xl border border-border bg-card p-2">
              <div className="flex items-center justify-between text-[8px]">
                <span className="font-semibold uppercase tracking-wider text-muted-foreground">
                  Meta do dia
                </span>
                <span className="font-semibold tabular-nums text-success">62%</span>
              </div>
              <div className="mt-1 flex items-baseline justify-between">
                <div className="text-[10px] font-bold tabular-nums text-foreground">R$ 142,30</div>
                <div className="text-[8px] text-muted-foreground tabular-nums">de R$ 230,00</div>
              </div>
              <div className="mt-1 h-1 overflow-hidden rounded-full bg-muted">
                <div className="h-full w-[62%] rounded-full bg-success" />
              </div>
            </div>

            {/* KM Inteligente + Performance lado a lado */}
            <div className="grid grid-cols-2 gap-1.5">
              <div className="rounded-xl border border-border bg-card p-2">
                <div className="flex items-center gap-1 text-[7px] font-semibold uppercase tracking-wider text-muted-foreground">
                  <Route className="h-2.5 w-2.5 text-info" /> KM Inteligente
                </div>
                <div className="mt-1 text-sm font-bold tabular-nums leading-none text-info">
                  R$ 2,18
                </div>
                <div className="mt-0.5 text-[7px] text-muted-foreground">mínimo / km</div>
              </div>
              <div className="rounded-xl border border-border bg-card p-2">
                <div className="flex items-center gap-1 text-[7px] font-semibold uppercase tracking-wider text-muted-foreground">
                  <Gauge className="h-2.5 w-2.5 text-foreground" /> Performance
                </div>
                <div className="mt-1 flex items-baseline gap-1">
                  <span className="text-sm font-bold tabular-nums leading-none text-foreground">R$ 28,40</span>
                  <span className="text-[7px] text-muted-foreground">/h</span>
                </div>
                <div className="mt-0.5 text-[7px] tabular-nums text-muted-foreground">
                  R$ 2,41 /km
                </div>
              </div>
            </div>
          </div>

          <MockBottomNav activeKey="inicio" />

          {/* Backdrop when radial/drawer open */}
          <AnimatePresence>
            {(phase === "radial" || phase === "drawer") && (
              <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="absolute inset-0 bg-background/60 backdrop-blur-[2px]"
              />
            )}
          </AnimatePresence>

          {/* Radial actions */}
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

          {/* Center FAB */}
          <AnimatePresence>
            {phase !== "drawer" && (
              <motion.div
                initial={{ opacity: 0, scale: 0.6 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.6 }}
                transition={{ duration: 0.2 }}
                className="pointer-events-none absolute inset-x-0 bottom-3 z-10 flex justify-center"
              >
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
              </motion.div>
            )}
          </AnimatePresence>

          {/* Drawer — mirrors real EntryDrawer (Novo ganho) */}
          <AnimatePresence>
            {phase === "drawer" && (
              <motion.div
                initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
                transition={{ type: "spring", damping: 24, stiffness: 240 }}
                className="absolute inset-x-0 bottom-0 max-h-[92%] overflow-hidden rounded-t-2xl border-t border-border bg-card shadow-elevated"
              >
                <MockNovoGanhoDrawer />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </PhoneFrame>
    </StepShell>
  );
}

/* ============================================================
 *  STEP 3 — Jornada
 * ============================================================ */
function JornadaStep() {
  const reduce = useReducedMotion();
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
  const hoursDecimal = workSec / 3600;

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

              <div className="mt-2 grid grid-cols-3 gap-1.5">
                <div className="rounded-md bg-muted/50 px-1.5 py-1 text-center">
                  <div className="text-[7px] uppercase tracking-wider text-muted-foreground">Trabalhado</div>
                  <div className="text-[10px] font-bold tabular-nums">{fmt(workSec)}</div>
                </div>
                <div className="rounded-md bg-muted/50 px-1.5 py-1 text-center">
                  <div className="text-[7px] uppercase tracking-wider text-muted-foreground">Descanso</div>
                  <div className="text-[10px] font-bold tabular-nums">{fmt(restSec)}</div>
                </div>
                <div className="rounded-md bg-muted/50 px-1.5 py-1 text-center">
                  <div className="text-[7px] uppercase tracking-wider text-muted-foreground">KM</div>
                  <div className="text-[10px] font-bold tabular-nums">12 km</div>
                </div>
              </div>

              <div className="mt-2.5 space-y-1.5">
                {phase === "idle" && (
                  <motion.div
                    animate={reduce ? undefined : { scale: [1, 1.04, 1] }}
                    transition={reduce ? undefined : { duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
                    className="flex h-8 w-full items-center justify-center gap-1.5 rounded-md gradient-success text-[11px] font-semibold text-primary-foreground shadow-fab"
                  >
                    <Play className="h-3 w-3" /> Iniciar jornada
                  </motion.div>
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

          {/* Goal modal */}
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
                    <Play className="h-3 w-3" /> Iniciar jornada
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Earning drawer with prefilled hours */}
          <AnimatePresence>
            {phase === "ended" && (
              <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="absolute inset-0 flex items-end bg-background/70 backdrop-blur-sm"
              >
                <motion.div
                  initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
                  transition={{ type: "spring", damping: 22, stiffness: 220, delay: 0.2 }}
                  className="max-h-[92%] w-full overflow-hidden rounded-t-2xl border-t border-border bg-card shadow-elevated"
                >
                  <MockNovoGanhoDrawer prefillHours={hoursDecimal} />
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
  const reduce = useReducedMotion();
  return (
    <StepShell
      eyebrow="Histórico & Relatórios"
      title="Veja para onde seu dinheiro vai"
      description="Lucro líquido em destaque, insights inteligentes e sua performance por hora, dia, km e corrida."
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

          {/* Hero: Lucro líquido */}
          <motion.div
            initial={reduce ? {} : { opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            className="mb-1.5 rounded-xl border border-success/40 bg-success/5 p-2.5 text-center"
          >
            <div className="text-[7px] font-semibold uppercase tracking-[0.18em] text-success/80">
              Lucro líquido
            </div>
            <div className="mt-0.5 text-xl font-bold tabular-nums text-success leading-none">
              R$ 1.112,67
            </div>
            <div className="mt-1 flex items-center justify-center gap-1.5 text-[8px] text-muted-foreground">
              <span><span className="text-info font-semibold">Bruto</span> R$ 1.427,01</span>
              <span className="text-muted-foreground/40">·</span>
              <span><span className="text-destructive font-semibold">Gastos</span> R$ 314,34</span>
            </div>
          </motion.div>

          {/* Insights inteligentes */}
          <motion.div
            initial={reduce ? {} : { opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
            className="mb-1.5 flex items-start gap-1.5 rounded-xl border border-border bg-card p-2"
          >
            <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
              <Sparkles className="h-2.5 w-2.5" />
            </span>
            <div className="min-w-0">
              <div className="text-[7px] font-semibold uppercase tracking-wider text-muted-foreground">
                Insights inteligentes
              </div>
              <div className="text-[9px] leading-snug text-foreground/90">
                Quarta foi seu melhor dia: R$ 312,40 líquidos.
              </div>
            </div>
          </motion.div>

          {/* Visão geral — lista */}
          <motion.div
            initial={reduce ? {} : { opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
            className="mb-1.5 rounded-xl border border-border bg-card"
          >
            <div className="border-b border-border/60 px-2 py-1 text-[7px] font-semibold uppercase tracking-wider text-muted-foreground">
              Visão geral
            </div>
            <ul className="divide-y divide-border/60 text-[9px]">
              {[
                { icon: <Gauge className="h-2.5 w-2.5" />, label: "Média por hora", value: "R$ 59,46" },
                { icon: <Calendar className="h-2.5 w-2.5" />, label: "Média por dia", value: "R$ 326,13" },
                { icon: <Route className="h-2.5 w-2.5" />, label: "R$/km", value: "R$ 2,52" },
                { icon: <Wallet className="h-2.5 w-2.5" />, label: "R$/corrida", value: "R$ 44,59" },
              ].map((row) => (
                <li key={row.label} className="flex items-center justify-between px-2 py-1.5">
                  <div className="flex items-center gap-1.5">
                    <span className="flex h-4 w-4 items-center justify-center rounded-md bg-muted text-muted-foreground">
                      {row.icon}
                    </span>
                    <span className="text-foreground/90">{row.label}</span>
                  </div>
                  <span className="font-bold tabular-nums">{row.value}</span>
                </li>
              ))}
            </ul>
          </motion.div>

          {/* Evolução diária */}
          <motion.div
            initial={reduce ? {} : { opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
            className="mb-1 rounded-xl border border-border bg-card p-2"
          >
            <div className="mb-1 flex items-center justify-between">
              <div className="text-[7px] font-semibold uppercase tracking-wider text-muted-foreground">
                Evolução diária
              </div>
            </div>
            <div className="mb-1 flex gap-0.5 text-[7px]">
              <span className="rounded-full bg-success/15 px-1.5 py-0.5 font-semibold text-success">Lucro</span>
              <span className="rounded-full bg-muted px-1.5 py-0.5 text-muted-foreground">Gastos</span>
              <span className="rounded-full bg-muted px-1.5 py-0.5 text-muted-foreground">KM</span>
              <span className="rounded-full bg-muted px-1.5 py-0.5 text-muted-foreground">Horas</span>
            </div>
            <svg viewBox="0 0 120 32" className="h-8 w-full">
              <motion.path
                d="M2 26 Q14 22 22 22 T40 14 Q46 6 52 8 Q58 10 64 22 T120 18"
                fill="none" stroke="hsl(var(--success))" strokeWidth="1.8" strokeLinecap="round"
                initial={reduce ? { pathLength: 1 } : { pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ delay: 0.5, duration: 1.2, ease: "easeOut" }}
              />
            </svg>
          </motion.div>
        </div>
      </PhoneFrame>
    </StepShell>
  );
}

/* ============================================================
 *  STEP 5 — Customização
 * ============================================================ */
function CustomizacaoStep() {
  const [home, setHome] = useState<Record<string, boolean>>({
    meta: true, performance: true, byApp: true, gastos: false, jornada: true,
  });

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
      description="Na aba Mais, toque no card para ativar ou desativar. Reordene pela alça ou pelas setas."
    >
      <MiniSettingsCard icon={<Sliders className="h-3.5 w-3.5" />} title="Tela inicial">
        <p className="-mt-1 mb-1.5 text-[10px] leading-snug text-muted-foreground">
          Toque no card para ativar ou desativar. Arraste pela alça ou use as setas para reordenar.
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

function HighlightRow({ text, delay = 0 }: { text: string; delay?: number }) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      initial={reduce ? {} : { opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay, duration: 0.35 }}
      className="flex items-start gap-2 rounded-lg border border-border bg-card/60 px-2.5 py-1.5 text-[11px] text-foreground/85"
    >
      <Sparkles className="mt-0.5 h-3 w-3 shrink-0 text-primary" />
      <span>{text}</span>
    </motion.div>
  );
}

/* ============================================================
 *  STEP 6 — Planejamento Inteligente
 * ============================================================ */
function PlanejamentoStep() {
  const reduce = useReducedMotion();

  // Plano de 31 dias — snapshot validado
  const DIAS_TOTAL = 31;
  const DIAS_RODADOS = 11;
  const DIAS_RESTANTES = 20;
  const META_DIARIA = 650;
  const RPK_MINIMO = 2.20;
  const META_LIQUIDA = 14000;
  const META_BRUTA = 20000;
  const FIXOS = 6000;
  const KM_ESTIMADO = 8800;
  const RPK_ALVO = 2.27;
  const JA_FIZ = 7000;
  const KM_RODADO = 2900;
  const RPK_ATUAL = 2.41;

  const progressPct = Math.round((DIAS_RODADOS / DIAS_TOTAL) * 100);
  const fmtBR = (n: number) => n.toLocaleString("pt-BR");
  const fmt2 = (n: number) => n.toFixed(2).replace(".", ",");

  return (
    <StepShell
      eyebrow="Planejamento Inteligente"
      title="Sua meta e o R$/km ideal num só lugar"
      description="Meta diária e R$/km mínimo, calculados a partir do seu plano mensal e dos custos do carro."
    >
      <PhoneFrame>
        <div className="absolute inset-0 flex flex-col overflow-y-auto bg-background p-2.5">
          {/* Header */}
          <div className="mb-1.5 flex items-center gap-1.5">
            <span className="flex h-5 w-5 items-center justify-center rounded-md bg-success/15 text-success">
              <Brain className="h-3 w-3" />
            </span>
            <div className="min-w-0">
              <div className="text-[10px] font-bold leading-tight">Planejamento Inteligente</div>
              <div className="text-[7px] text-muted-foreground">Seus objetivos e acompanhamento do mês</div>
            </div>
          </div>

          {/* Linha de dias + barra */}
          <div className="mb-1.5">
            <div className="flex items-center justify-between text-[8px]">
              <span className="font-semibold text-foreground">{DIAS_RODADOS} de {DIAS_TOTAL} dias</span>
              <span className="text-muted-foreground">{DIAS_RESTANTES} dias restantes</span>
            </div>
            <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-muted">
              <motion.div
                initial={reduce ? { width: `${progressPct}%` } : { width: 0 }}
                animate={{ width: `${progressPct}%` }}
                transition={{ duration: 1.0, ease: "easeOut" }}
                className="h-full rounded-full gradient-success"
              />
            </div>
          </div>

          {/* OBJETIVOS DO DIA — duas colunas com divisor + números grandes */}
          <motion.div
            initial={reduce ? {} : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="mb-1.5 rounded-xl border border-success/30 bg-success/5 p-2 shadow-[0_0_0_1px_hsl(var(--success)/0.15)]"
          >
            <div className="mb-1.5 text-[7px] font-semibold uppercase tracking-[0.18em] text-success/80">
              Objetivos do dia
            </div>
            <div className="grid grid-cols-2 divide-x divide-border/60">
              <div className="pr-1.5">
                <div className="text-[7px] uppercase tracking-wider text-muted-foreground">Meta</div>
                <div className="mt-0.5 leading-none">
                  <span className="text-[8px] font-semibold text-success">R$ </span>
                  <span className="text-[16px] font-bold tabular-nums text-success">{fmtBR(META_DIARIA)}</span>
                </div>
                <div className="mt-0.5 text-[7px] text-muted-foreground">pra faturar</div>
              </div>
              <div className="pl-1.5">
                <div className="text-[7px] uppercase tracking-wider text-muted-foreground">R$/km mínimo</div>
                <div className="mt-0.5 leading-none">
                  <span className="text-[16px] font-bold tabular-nums text-success">{fmt2(RPK_MINIMO)}</span>
                  <span className="text-[8px] font-semibold text-success"> /km</span>
                </div>
                <div className="mt-0.5 text-[7px] text-muted-foreground">por corrida</div>
              </div>
            </div>
            <div className="mt-1.5 border-t border-border/60 pt-1 text-[7px] leading-snug text-muted-foreground">
              Fixos até você lançar novos registros. Aí recalculam.
            </div>
          </motion.div>

          {/* Insight positivo (estático) */}
          <motion.div
            initial={reduce ? {} : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.12, duration: 0.4 }}
            className="mb-1.5 flex items-start gap-1.5 rounded-xl border border-border bg-card p-2"
          >
            <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-md bg-success/15 text-[9px] text-success">
              ⚡
            </span>
            <div className="min-w-0 flex-1">
              <div className="text-[7px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Insights inteligentes
              </div>
              <p className="mt-0.5 text-[8px] leading-snug text-foreground/85">
                Seu R$/km está em <span className="font-semibold text-success">2,41</span> — acima do mínimo. Se mantiver esse ritmo nos {DIAS_RESTANTES} dias restantes, você fecha o mês no alvo.
              </p>
            </div>
          </motion.div>

          {/* Plano vs Realizado */}
          <motion.div
            initial={reduce ? {} : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.4 }}
            className="mb-1.5 grid grid-cols-2 gap-1.5"
          >
            {/* Plano */}
            <div className="rounded-xl border border-border bg-card p-1.5">
              <div className="mb-1 flex items-center justify-between gap-1">
                <div className="text-[7px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Plano de junho
                </div>
                <span className="rounded-full bg-amber-500/15 px-1 py-[1px] text-[6px] font-bold uppercase tracking-wider text-amber-500">
                  Refeito
                </span>
              </div>
              <div className="space-y-0.5 text-[7px] text-muted-foreground">
                <div className="flex items-center justify-between">
                  <span>Meta líquida</span>
                  <span className="font-semibold tabular-nums text-foreground">R$ {fmtBR(META_LIQUIDA)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Dias</span>
                  <span className="font-semibold tabular-nums text-foreground">{DIAS_TOTAL}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>KM estimado</span>
                  <span className="font-semibold tabular-nums text-foreground">{fmtBR(KM_ESTIMADO)} km</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>R$/km alvo</span>
                  <span className="font-semibold tabular-nums text-foreground">R$ {fmt2(RPK_ALVO)}</span>
                </div>
              </div>
            </div>

            {/* Até agora */}
            <div className="rounded-xl border border-border bg-card p-1.5">
              <div className="mb-1 flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-success" />
                <div className="text-[7px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Até agora
                </div>
              </div>
              <div className="space-y-0.5 text-[7px] text-muted-foreground">
                <div className="flex items-center justify-between">
                  <span>Já fiz</span>
                  <span className="font-bold tabular-nums text-success">R$ {fmtBR(JA_FIZ)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Dias rodados</span>
                  <span className="font-semibold tabular-nums text-foreground">{DIAS_RODADOS}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>KM rodado</span>
                  <span className="font-semibold tabular-nums text-foreground">{fmtBR(KM_RODADO)} km</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>R$/km atual</span>
                  <span className="font-bold tabular-nums text-success">R$ {fmt2(RPK_ATUAL)}</span>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Composição da meta */}
          <motion.div
            initial={reduce ? {} : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.4 }}
            className="rounded-xl border border-border bg-card p-2"
          >
            <div className="mb-1.5 text-[7px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Meta do mês · Composição
            </div>
            <div className="rounded-lg border border-info/30 bg-info/5 px-1.5 py-1 mb-1">
              <div className="text-[7px] uppercase tracking-wider text-info/80">Meta bruta</div>
              <div className="text-[12px] font-bold tabular-nums text-info leading-tight">
                R$ {fmtBR(META_BRUTA)}
              </div>
            </div>
            <div className="flex items-center gap-1 text-[8px]">
              <span className="text-muted-foreground">=</span>
              <div className="flex-1 rounded-md border border-success/30 bg-success/5 px-1.5 py-1">
                <div className="text-[6.5px] uppercase tracking-wider text-success/80">Líquida</div>
                <div className="text-[10px] font-bold tabular-nums text-success leading-tight">
                  R$ {fmtBR(META_LIQUIDA)}
                </div>
              </div>
              <span className="text-muted-foreground">+</span>
              <div className="flex-1 rounded-md border border-border bg-muted/40 px-1.5 py-1">
                <div className="text-[6.5px] uppercase tracking-wider text-muted-foreground">Custos fixos</div>
                <div className="text-[10px] font-bold tabular-nums text-foreground leading-tight">
                  R$ {fmtBR(FIXOS)}
                </div>
              </div>
            </div>
            <p className="mt-1.5 text-[7px] leading-snug text-muted-foreground">
              Combustível e alimentação não entram na meta, são custos variáveis.
            </p>
          </motion.div>
        </div>
      </PhoneFrame>

      <div className="mt-3 space-y-1.5">
        <HighlightRow delay={0.6} text="Meta diária e R$/km mínimo calculados a partir do seu plano mensal." />
        <HighlightRow delay={0.75} text="O R$/km mínimo se ajusta conforme você faturar ao longo do mês." />
        <HighlightRow delay={0.9} text="Ajustável em Mais → Planejamento Inteligente." />
      </div>
    </StepShell>
  );
}



/* ============================================================
 *  STEP — Final
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

function PhoneFrame({ children, compact }: { children: React.ReactNode; compact?: boolean }) {
  return (
    <div
      className={cn(
        "relative mx-auto h-auto w-full overflow-hidden rounded-[32px] border-[3px] border-foreground/10 bg-card shadow-elevated",
        compact ? "aspect-[3/4] max-h-[48vh] max-w-[260px]" : "aspect-[9/16] max-h-[60vh] max-w-[280px]",
      )}
    >
      {children}
    </div>
  );
}

/** Mock da BottomNav real: Início · Histórico · (FAB) · Relatórios · Mais (•••). */
function MockBottomNav({ activeKey = "inicio" }: { activeKey?: "inicio" | "historico" | "relatorios" | "mais" }) {
  const items = [
    { key: "inicio", label: "Início", Icon: Home },
    { key: "historico", label: "Histórico", Icon: History },
    { key: "relatorios", label: "Relatórios", Icon: BarChart3 },
    { key: "mais", label: "Mais", Icon: MoreHorizontal },
  ] as const;
  return (
    <div className="relative border-t border-border bg-card/80 px-2 pt-2 pb-1.5">
      <div className="grid grid-cols-5 items-center text-[8px] text-muted-foreground">
        {items.slice(0, 2).map(({ key, label, Icon }) => (
          <div key={key} className={cn(
            "flex flex-col items-center gap-0.5",
            activeKey === key && "text-primary"
          )}>
            <Icon className="h-3 w-3" />
            <span>{label}</span>
          </div>
        ))}
        <div aria-hidden />
        {items.slice(2).map(({ key, label, Icon }) => (
          <div key={key} className={cn(
            "flex flex-col items-center gap-0.5",
            activeKey === key && "text-primary"
          )}>
            <Icon className="h-3 w-3" />
            <span>{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Réplica visual enxuta do EntryDrawer real (Novo ganho).
 * Sem interação — usado nos passos 2 e 3 do tour.
 */
function MockNovoGanhoDrawer({ prefillHours }: { prefillHours?: number }) {
  const h = prefillHours != null && prefillHours > 0 ? Math.floor(prefillHours) : 0;
  const m = prefillHours != null && prefillHours > 0
    ? Math.round((prefillHours - h) * 60)
    : 0;
  const prefilled = prefillHours != null && prefillHours > 0;

  return (
    <div className="flex max-h-full flex-col">
      <div className="mx-auto mt-1.5 h-1 w-8 shrink-0 rounded-full bg-muted-foreground/30" />
      <div className="shrink-0 px-2.5 pt-1.5 pb-1 text-center text-[11px] font-semibold">Novo ganho</div>

      <div className="flex-1 space-y-2 overflow-hidden px-2.5 pb-2.5">
        {/* A jornada — Horas trabalhadas (mock visual da roda) */}
        <div>
          <div className="mb-0.5 flex items-center justify-between text-[7px] font-semibold uppercase tracking-wider text-muted-foreground">
            <span>A jornada · Horas trabalhadas</span>
          </div>
          <div className="relative overflow-hidden rounded-md border border-border/60 bg-muted/30">
            <div className="pointer-events-none absolute left-0 right-0 top-1/2 z-0 h-[20px] -translate-y-1/2 border-y border-border/60 bg-card/70" />
            <div className="relative z-10 flex items-center justify-center gap-2 py-1.5 text-[12px] font-bold tabular-nums">
              <div className="flex flex-col items-center leading-none">
                <span className="text-[7px] text-muted-foreground/60">{Math.max(0, h - 1)}h</span>
                <span className={cn("text-[12px]", prefilled ? "text-success" : "text-foreground")}>{h}h</span>
                <span className="text-[7px] text-muted-foreground/60">{h + 1}h</span>
              </div>
              <span className="text-muted-foreground/60">:</span>
              <div className="flex flex-col items-center leading-none">
                <span className="text-[7px] text-muted-foreground/60">{String((m + 59) % 60).padStart(2, "0")}</span>
                <span className={cn("text-[12px]", prefilled ? "text-success" : "text-foreground")}>{String(m).padStart(2, "0")}</span>
                <span className="text-[7px] text-muted-foreground/60">{String((m + 1) % 60).padStart(2, "0")}</span>
              </div>
            </div>
          </div>
          {prefilled && (
            <div className="mt-0.5 text-[7px] text-success">
              Preenchido pela jornada
            </div>
          )}
        </div>

        {/* Quilometragem */}
        <div>
          <div className="mb-0.5 flex items-center justify-between text-[7px] font-semibold uppercase tracking-wider text-muted-foreground">
            <span>Quilometragem</span>
            <span className="flex gap-0.5 rounded-full bg-muted/40 p-0.5 normal-case tracking-normal">
              <span className="rounded-full bg-card px-1.5 py-0 text-[7px] font-semibold text-foreground">Total</span>
              <span className="px-1.5 py-0 text-[7px]">Inicial-Final</span>
            </span>
          </div>
          <div className="rounded-md border border-border bg-muted/30 px-2 py-1 text-[9px] text-muted-foreground/60">
            Km rodados
          </div>
        </div>

        {/* Plataformas */}
        <div>
          <div className="mb-0.5 text-[7px] font-semibold uppercase tracking-wider text-muted-foreground">
            Em quais apps você rodou hoje?
          </div>
          <div className="rounded-md border border-border bg-card p-1.5">
            <div className="mb-1 flex items-center gap-1.5">
              <div className="grid h-4 w-4 place-items-center rounded-full bg-foreground text-[6px] font-bold text-background">U</div>
              <span className="text-[9px] font-semibold">Uber</span>
            </div>
            <div className="grid grid-cols-[1fr_56px] gap-1.5">
              <div>
                <div className="text-[6.5px] text-muted-foreground">Valor recebido</div>
                <div className="rounded border border-success/40 bg-success/10 px-1.5 py-0.5 text-[10px] font-bold tabular-nums text-success">
                  R$ 80,00
                </div>
              </div>
              <div>
                <div className="text-[6.5px] text-muted-foreground">Corridas</div>
                <div className="rounded border border-border bg-muted/30 px-1.5 py-0.5 text-center text-[10px] font-bold tabular-nums">
                  8
                </div>
              </div>
            </div>
          </div>
          <div className="mt-1 text-center text-[8px] font-semibold text-primary">+ Adicionar plataforma</div>
        </div>

        <div className="flex gap-1.5 pt-0.5">
          <div className="flex-1 rounded-md border border-border py-1 text-center text-[10px]">Cancelar</div>
          <div className="flex-1 rounded-md gradient-success py-1 text-center text-[10px] font-semibold text-primary-foreground">Salvar</div>
        </div>
      </div>
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
