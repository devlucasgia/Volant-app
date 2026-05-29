import { useEffect, useRef, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import {
  ArrowRight,
  Check,
  Gauge,
  LayoutGrid,
  Lock,
  Sparkles,
  Target,
  TrendingUp,
  TrendingDown,
  Wrench,
  Clock,
  ShieldCheck,
  Home as HomeIcon,
  History as HistoryIcon,
  BarChart3,
  Settings as SettingsIcon,
  Plus,
  Minus,
  Wallet,
  Hourglass,
  Brain,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { SplashScreen } from "@/components/SplashScreen";
import volantSymbol from "@/assets/volant-symbol-header.png";
import { useCountUp } from "@/hooks/useCountUp";
import { brl } from "@/lib/format";
import { cn } from "@/lib/utils";

/* -------------------------------------------------------------------------- */
/*  Landing page (pública). Sprint 1 — hero + 3 diferenciais + footer base.   */
/*  Mobile-first. Tema escuro fixo (independente da preferência do usuário)   */
/*  para refletir o visual da identidade Volant na página de vendas.          */
/* -------------------------------------------------------------------------- */

export default function Landing() {
  const { user, loading } = useAuth();
  const mode = useHeroMode(9000);

  // Força o tema escuro só enquanto a landing está montada.
  useEffect(() => {
    const root = document.documentElement;
    const had = root.classList.contains("dark");
    root.classList.add("dark");
    return () => {
      if (!had) root.classList.remove("dark");
    };
  }, []);

  // Enquanto a sessão ainda está sendo resolvida, mostramos o splash neutro
  // em vez do markup completo da landing. Isso evita o "flash" da página de
  // vendas para usuários já autenticados (que serão redirecionados pro /app).
  if (loading) return <SplashScreen />;

  // Usuário logado pula direto pro app.
  if (user) return <Navigate to="/app" replace />;

  return (
    <div
      className="min-h-screen bg-background text-foreground antialiased"
      data-hero-mode={mode}
    >
      <BackgroundGlow />
      <Header />
      <main className="relative">
        <Hero mode={mode} />
        <PainStrip />
        <FeatureKmInteligente />
        <FeatureMetas />
        <FeaturePersonalizacao />
        <SecondaryFeatures />
        <FinalCta />
      </main>
      <Footer />
      <HeroStyles />
    </div>
  );
}

/* ------------------------------- chrome ----------------------------------- */

function Header() {
  return (
    <header className="sticky top-0 z-30 border-b border-border/40 bg-background/70 backdrop-blur-xl">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
        <a href="#top" className="flex items-center gap-2">
          <img src={volantSymbol} alt="Volant" className="h-7 w-7 rounded-full" />
          <span className="text-base font-bold tracking-tight">Volant</span>
        </a>
        <nav className="hidden items-center gap-7 text-sm text-muted-foreground md:flex">
          <a href="#km" className="transition hover:text-foreground">KM inteligente</a>
          <a href="#metas" className="transition hover:text-foreground">Metas</a>
          <a href="#personalizacao" className="transition hover:text-foreground">Personalização</a>
          <a href="#mais" className="transition hover:text-foreground">Mais recursos</a>
        </nav>
        <Link
          to="/auth"
          className="accent-cta inline-flex h-9 items-center gap-1.5 rounded-full px-4 text-sm font-semibold text-primary-foreground transition hover:brightness-110"
        >
          Testar grátis
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </header>
  );
}

function BackgroundGlow() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div className="absolute -top-32 left-1/2 h-[480px] w-[480px] -translate-x-1/2 rounded-full bg-primary/20 blur-3xl" />
      <div className="absolute top-[40%] -left-32 h-[360px] w-[360px] rounded-full bg-primary/10 blur-3xl" />
      <div className="absolute bottom-0 right-0 h-[420px] w-[420px] translate-x-1/3 rounded-full bg-primary/10 blur-3xl" />
    </div>
  );
}

/* --------------------------------- hero ----------------------------------- */

type HeroMode = "liquido" | "bruto";

function useHeroMode(intervalMs = 7000): HeroMode {
  const [mode, setMode] = useState<HeroMode>("liquido");
  useEffect(() => {
    if (typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }
    const id = window.setInterval(() => {
      setMode((m) => (m === "liquido" ? "bruto" : "liquido"));
    }, intervalMs);
    return () => window.clearInterval(id);
  }, [intervalMs]);
  return mode;
}

/** Countup animado — interpola entre valores quando `value` muda. */
function AnimatedNumber({
  value,
  format = (n) => n.toFixed(0),
  durationMs = 900,
  className,
}: {
  value: number;
  format?: (n: number) => string;
  durationMs?: number;
  className?: string;
}) {
  const [display, setDisplay] = useState(value);
  const fromRef = useRef(value);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setDisplay(value);
      fromRef.current = value;
      return;
    }
    const from = fromRef.current;
    const to = value;
    if (from === to) return;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - t, 3);
      const current = from + (to - from) * eased;
      setDisplay(current);
      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        fromRef.current = to;
      }
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [value, durationMs]);

  return <span className={cn("tabular-nums", className)}>{format(display)}</span>;
}

const fmtBRL = (n: number) =>
  `R$ ${n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const fmtBRLInt = (n: number) =>
  `R$ ${Math.round(n).toLocaleString("pt-BR")}`;

function Hero({ mode }: { mode: HeroMode }) {
  return (
    <section
      id="top"
      className="hero-section relative overflow-hidden px-4 pt-8 pb-20 md:pt-16 md:pb-28"
      data-mode={mode}
    >
      {/* Atmosfera: glow verde/azul + linhas de rota animadas (decorativas) */}
      <HeroAtmosphere mode={mode} />

      <div className="relative mx-auto grid max-w-6xl items-center gap-10 md:grid-cols-[1.05fr_1fr] md:gap-14">
        {/* ------------------ Coluna de texto ------------------ */}
        <div className="relative text-center md:text-left">
          <div className="hero-anim hero-anim-1 accent-badge inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-wider backdrop-blur">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-75 accent-dot-ping" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full accent-dot" />
            </span>
            De motorista, para motoristas.
          </div>

          <h1 className="hero-anim hero-anim-2 mt-5 text-balance text-[2.05rem] font-extrabold leading-[1.08] tracking-tight md:text-[3.4rem]">
            Saiba quanto você{" "}
            <span className="relative inline-block accent-text">
              realmente lucra
              <span
                aria-hidden
                className="absolute inset-x-0 -bottom-1 h-[3px] rounded-full accent-underline"
              />
            </span>{" "}
            como motorista de aplicativo.
          </h1>

          <p className="hero-anim hero-anim-3 mx-auto mt-5 max-w-xl text-[15px] leading-relaxed text-muted-foreground md:mx-0 md:text-lg">
            Controle sua rotina, entenda seus números e tome decisões melhores com uma ferramenta
            feita para a realidade de quem dirige todos os dias.
          </p>

          <div className="hero-anim hero-anim-4 mt-7 flex flex-col items-center gap-3 sm:flex-row md:items-start md:justify-start">
            <Link
              to="/auth"
              className="accent-cta group relative inline-flex h-12 w-full items-center justify-center gap-2 overflow-hidden rounded-full px-7 text-sm font-semibold text-primary-foreground transition hover:brightness-110 sm:w-auto"
            >
              <span
                aria-hidden
                className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/25 to-transparent transition-transform duration-700 group-hover:translate-x-full"
              />
              Testar grátis
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
            <a
              href="#km"
              className="inline-flex h-12 w-full items-center justify-center rounded-full border border-border/60 bg-card/60 px-7 text-sm font-semibold text-foreground backdrop-blur transition hover:bg-card sm:w-auto"
            >
              Ver como funciona
            </a>
          </div>

          <p className="hero-anim hero-anim-5 mt-4 flex items-center justify-center gap-1.5 text-xs text-muted-foreground md:justify-start">
            <Check className="h-3.5 w-3.5 accent-text" /> 7 dias grátis. Sem cartão.
          </p>
        </div>


        {/* ------------------ Coluna do mockup ------------------ */}
        <div className="hero-anim hero-anim-mockup relative mx-auto w-full max-w-[290px] md:max-w-none">
          {/* halo dinâmico (verde + azul cross-fade) */}
          <div aria-hidden className="pointer-events-none absolute left-1/2 top-1/2 -z-10 h-[460px] w-[460px] -translate-x-1/2 -translate-y-1/2">
            <div
              className="absolute inset-0 rounded-full blur-[80px] transition-opacity duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] hero-breath"
              style={{
                backgroundColor: "hsl(var(--primary) / 0.30)",
                opacity: mode === "liquido" ? 1 : 0,
              }}
            />
            <div
              className="absolute inset-0 rounded-full blur-[80px] transition-opacity duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] hero-breath"
              style={{
                backgroundColor: "hsl(var(--goal-gross) / 0.32)",
                opacity: mode === "bruto" ? 1 : 0,
              }}
            />
          </div>

          <div className="hero-float">
            <PhoneFrame>
              <HomeMockup mode={mode} />
            </PhoneFrame>
          </div>

          {/* Cards flutuantes — desktop. Cada um remete a uma seção real do app
              e fica posicionado próximo ao bloco correspondente do mockup. */}

          {/* Manutenção — encostado na borda esquerda do mockup */}
          <div
            className="hero-float absolute top-16 hidden md:block w-[130px] lg:w-[150px] md:-left-2 lg:-left-10"
            style={{ animationDelay: "0s" }}
          >
            <FeatureFloatCard
              className="hero-anim hero-anim-card-1"
              label="Manutenção"
              icon={<Wrench className="h-3.5 w-3.5 accent-text" />}
            >
              <div className="text-[11px] font-semibold text-foreground">Troca de óleo</div>
              <div className="mt-0.5 text-[10px] text-muted-foreground">em 480 km</div>
              <div className="mt-2 h-1 overflow-hidden rounded-full bg-muted">
                <div className="h-full w-[85%] rounded-full bg-warning" />
              </div>
              <div className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-warning/15 px-1.5 py-[1px] text-[8.5px] font-semibold text-warning">
                <Hourglass className="h-2.5 w-2.5" /> Próximo
              </div>
            </FeatureFloatCard>
          </div>

          {/* R$/KM Inteligente — borda direita, altura do card R$/KM */}
          <div
            className="hero-float absolute z-20 top-40 hidden md:block md:-right-2 lg:-right-10"
            style={{ animationDelay: "0.8s" }}
          >
            <FloatingCard
              className="hero-anim hero-anim-card-2 hero-glow-soft"
              label="R$/KM Inteligente"
              value="R$ 2,42"
              icon={<Gauge className="h-3.5 w-3.5" />}
              highlighted
              accent
            />
          </div>
          {/* Custos do veículo — esquerda-baixo, alinhado ao bloco de gastos */}
          <div
            className="hero-float absolute bottom-28 hidden md:block w-[140px] lg:w-[160px] md:-left-2 lg:-left-10"
            style={{ animationDelay: "1.6s" }}
          >
            <FeatureFloatCard
              className="hero-anim hero-anim-card-3"
              label="Custos do veículo"
              icon={<Wallet className="h-3.5 w-3.5 accent-text" />}
            >
              <div className="space-y-1 text-[10px]">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">IPVA (mês)</span>
                  <span className="font-semibold tabular-nums text-foreground">R$ 140</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Manutenção</span>
                  <span className="font-semibold tabular-nums text-foreground">R$ 160</span>
                </div>
              </div>
              <div className="mt-2 flex items-center justify-between border-t border-border/40 pt-1.5">
                <span className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">Total /mês</span>
                <span className="text-[12px] font-extrabold tabular-nums text-destructive">R$ 300</span>
              </div>
            </FeatureFloatCard>
          </div>

          {/* Personalização — direita-baixo, só desktop (no tablet evita sobreposição) */}
          <div
            className="hero-float absolute bottom-4 hidden lg:block w-[150px] lg:-right-10"
            style={{ animationDelay: "2.4s" }}
          >
            <FeatureFloatCard
              className="hero-anim hero-anim-card-4"
              label="Personalização"
              icon={<LayoutGrid className="h-3.5 w-3.5 accent-text" />}
            >
              <div className="text-[10px] text-muted-foreground">Tamanho do texto</div>
              <div className="mt-2 flex items-center gap-1.5">
                <span className="grid h-6 w-6 place-items-center rounded-lg border border-border/60 bg-card/60 text-[10px] font-bold text-muted-foreground">A</span>
                <span
                  className="grid h-7 w-7 place-items-center rounded-lg text-[12px] font-bold accent-text"
                  style={{
                    borderWidth: 1,
                    borderStyle: "solid",
                    borderColor: "hsl(var(--accent-now) / 0.5)",
                    backgroundColor: "hsl(var(--accent-now) / 0.15)",
                    boxShadow: "0 0 0 1px hsl(var(--accent-now) / 0.3)",
                  }}
                >
                  A
                </span>
                <span className="grid h-8 w-8 place-items-center rounded-lg border border-border/60 bg-card/60 text-[14px] font-bold text-muted-foreground">A</span>
              </div>
            </FeatureFloatCard>
          </div>


          {/* Mobile: 2 cards compactos */}
          <FloatingCard
            className="hero-anim hero-anim-card-2 absolute -right-2 top-16 md:hidden hero-glow-soft"
            label="R$/KM"
            value="R$ 2,42"
            icon={<Gauge className="h-3 w-3" />}
            highlighted
            compact
            accent
          />
        </div>
      </div>
    </section>
  );
}

/* ----- Hero: atmosfera (glow + linhas de rota) ----- */
function HeroAtmosphere({ mode }: { mode: HeroMode }) {
  const lineColor = mode === "liquido" ? "hsl(var(--primary))" : "hsl(var(--goal-gross))";
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
      {/* glow superior pulsante — cross-fade entre verde e azul */}
      <div className="absolute -top-40 left-1/2 h-[520px] w-[520px] -translate-x-1/2">
        <div
          className="absolute inset-0 rounded-full blur-[100px] transition-opacity duration-700 hero-breath"
          style={{ backgroundColor: "hsl(var(--primary) / 0.22)", opacity: mode === "liquido" ? 1 : 0 }}
        />
        <div
          className="absolute inset-0 rounded-full blur-[100px] transition-opacity duration-700 hero-breath"
          style={{ backgroundColor: "hsl(var(--goal-gross) / 0.22)", opacity: mode === "bruto" ? 1 : 0 }}
        />
      </div>
      {/* glow lateral neutro */}
      <div className="absolute right-[-10%] top-[30%] h-[360px] w-[360px] rounded-full bg-primary/10 blur-[90px]" />
      {/* linhas de rota em SVG (cor acompanha o modo) */}
      <svg
        className="absolute inset-0 h-full w-full opacity-[0.18] transition-[stroke] duration-700"
        viewBox="0 0 1200 800"
        preserveAspectRatio="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="hero-line" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor={lineColor} stopOpacity="0" />
            <stop offset="50%" stopColor={lineColor} stopOpacity="1" />
            <stop offset="100%" stopColor={lineColor} stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d="M -50 620 Q 300 540 600 600 T 1260 520" stroke="url(#hero-line)" strokeWidth="1.2" fill="none" className="hero-route hero-route-1" />
        <path d="M -50 680 Q 400 720 750 660 T 1260 700" stroke="url(#hero-line)" strokeWidth="1" fill="none" className="hero-route hero-route-2" />
        <path d="M -50 200 Q 300 260 700 220 T 1260 280" stroke="url(#hero-line)" strokeWidth="0.8" fill="none" className="hero-route hero-route-3" />
      </svg>
      {/* grade discreta */}
      <div
        className="absolute inset-0 opacity-[0.05]"
        style={{
          backgroundImage:
            "linear-gradient(hsl(var(--primary)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--primary)) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
        }}
      />
    </div>
  );
}

/* ----- Card flutuante reutilizado na Hero ----- */
function FloatingCard({
  className,
  label,
  value,
  icon,
  highlighted = false,
  compact = false,
  accent = false,
}: {
  className?: string;
  label: string;
  value: string;
  icon: React.ReactNode;
  highlighted?: boolean;
  compact?: boolean;
  accent?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border bg-card/85 backdrop-blur-md shadow-[0_18px_40px_-18px_hsl(0_0%_0%/0.7)]",
        highlighted ? "border-primary/50 ring-1 ring-primary/30" : "border-border/60",
        compact ? "px-2.5 py-1.5" : "px-3 py-2",
        className,
      )}
    >
      <div className="flex items-center gap-1.5 text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">
        <span className={accent ? "accent-text" : "text-primary"}>{icon}</span>
        {label}
      </div>
      <div
        className={cn(
          "mt-0.5 font-extrabold tabular-nums",
          compact ? "text-[13px]" : "text-base",
          highlighted ? (accent ? "accent-text" : "text-primary") : "text-foreground",
        )}
      >
        {value}
      </div>
    </div>
  );
}

/** Card flutuante "expandido" — replica visual do FloatingCard mas com corpo
    customizável (children) abaixo do label. Usado para mini-mockups que
    remetem a telas reais do app (Manutenção, Custos, Personalização). */
function FeatureFloatCard({
  className,
  label,
  icon,
  highlighted = false,
  children,
}: {
  className?: string;
  label: string;
  icon: React.ReactNode;
  highlighted?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border bg-card/85 px-3 py-2.5 backdrop-blur-md shadow-[0_18px_40px_-18px_hsl(0_0%_0%/0.7)]",
        highlighted ? "border-primary/50 ring-1 ring-primary/30" : "border-border/60",
        className,
      )}
    >
      <div className="flex items-center gap-1.5 text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">
        <span className="text-primary">{icon}</span>
        {label}
      </div>
      <div className="mt-1.5">{children}</div>
    </div>
  );
}

/* ----- Estilos locais da Hero (keyframes + reduced motion) ----- */
function HeroStyles() {
  return (
    <style>{`
      .hero-anim { opacity: 0; transform: translateY(14px); animation: heroFadeUp 0.7s cubic-bezier(0.22,1,0.36,1) forwards; }
      .hero-anim-1 { animation-delay: 0.05s; }
      .hero-anim-2 { animation-delay: 0.18s; }
      .hero-anim-3 { animation-delay: 0.32s; }
      .hero-anim-4 { animation-delay: 0.46s; }
      .hero-anim-5 { animation-delay: 0.58s; }
      .hero-anim-mockup { opacity: 0; transform: translateY(20px) scale(0.97); animation: heroMockupIn 0.9s cubic-bezier(0.22,1,0.36,1) 0.35s forwards; }
      .hero-anim-card-1 { animation-delay: 0.85s; }
      .hero-anim-card-2 { animation-delay: 1.00s; }
      .hero-anim-card-3 { animation-delay: 1.15s; }
      .hero-anim-card-4 { animation-delay: 1.30s; }

      @keyframes heroFadeUp { to { opacity: 1; transform: translateY(0); } }
      @keyframes heroMockupIn { to { opacity: 1; transform: translateY(0) scale(1); } }

      .hero-float { animation: heroFloat 6.5s ease-in-out infinite; will-change: transform; }
      @keyframes heroFloat { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-8px); } }

      .hero-breath { animation: heroBreath 5s ease-in-out infinite; }
      @keyframes heroBreath { 0%,100% { transform: scale(1); } 50% { transform: scale(1.06); } }

      .hero-glow-soft { box-shadow: 0 0 0 1px hsl(var(--primary) / 0.35), 0 0 28px -6px hsl(var(--primary) / 0.45); animation: heroGlowSoft 3.6s ease-in-out infinite; }
      @keyframes heroGlowSoft {
        0%,100% { box-shadow: 0 0 0 1px hsl(var(--primary) / 0.30), 0 0 24px -8px hsl(var(--primary) / 0.35); }
        50% { box-shadow: 0 0 0 1px hsl(var(--primary) / 0.55), 0 0 38px -4px hsl(var(--primary) / 0.6); }
      }

      /* Glow contínuo do card "R$/km mínimo agora" da seção KM Inteligente */
      .km-glow-pulse {
        box-shadow: 0 0 0 1px hsl(var(--primary) / 0.45), 0 0 28px -6px hsl(var(--primary) / 0.45);
        animation: kmGlowPulse 2.8s ease-in-out infinite;
      }
      @keyframes kmGlowPulse {
        0%,100% { box-shadow: 0 0 0 1px hsl(var(--primary) / 0.35), 0 0 22px -8px hsl(var(--primary) / 0.35); }
        50%     { box-shadow: 0 0 0 1px hsl(var(--primary) / 0.65), 0 0 44px -2px hsl(var(--primary) / 0.70); }
      }

      .hero-route { stroke-dasharray: 8 14; animation: heroRoute 8s linear infinite; }
      .hero-route-2 { animation-duration: 11s; animation-direction: reverse; }
      .hero-route-3 { animation-duration: 14s; }
      @keyframes heroRoute { to { stroke-dashoffset: -220; } }

      /* ---------- Hero mode (Líquido / Bruto) ---------- */
      .mode-toggle {
        position: relative;
        display: inline-flex;
        padding: 3px;
        border-radius: 9999px;
        background: hsl(var(--muted) / 0.5);
        border: 1px solid hsl(var(--border) / 0.6);
        font-size: 10px;
        font-weight: 700;
        letter-spacing: 0.04em;
        text-transform: uppercase;
      }
      .mode-toggle__pill {
        position: absolute;
        top: 3px;
        bottom: 3px;
        width: calc(50% - 3px);
        border-radius: 9999px;
        transition: transform 700ms cubic-bezier(0.22,1,0.36,1), background-color 700ms cubic-bezier(0.22,1,0.36,1), box-shadow 700ms;
      }
      [data-mode="liquido"] .mode-toggle__pill {
        transform: translateX(0);
        background: hsl(var(--primary));
        box-shadow: 0 4px 14px -4px hsl(var(--primary) / 0.6);
      }
      [data-mode="bruto"] .mode-toggle__pill {
        transform: translateX(100%);
        background: hsl(var(--goal-gross));
        box-shadow: 0 4px 14px -4px hsl(var(--goal-gross) / 0.6);
      }
      .mode-toggle__option {
        position: relative;
        z-index: 1;
        flex: 1;
        padding: 4px 10px;
        text-align: center;
        color: hsl(var(--muted-foreground));
        transition: color 500ms;
      }
      [data-mode="liquido"] .mode-toggle__option[data-opt="liquido"],
      [data-mode="bruto"] .mode-toggle__option[data-opt="bruto"] {
        color: hsl(var(--primary-foreground));
      }

      /* Cards do mockup que reagem ao modo */
      .mode-card {
        transition: border-color 700ms cubic-bezier(0.22,1,0.36,1), background 700ms cubic-bezier(0.22,1,0.36,1), box-shadow 700ms;
      }
      [data-mode="liquido"] .mode-card--primary {
        border-color: hsl(var(--primary) / 0.4);
        background: radial-gradient(120% 120% at 0% 0%, hsl(var(--primary) / 0.18), transparent 55%);
        box-shadow: inset 0 0 0 1px hsl(var(--primary) / 0.15);
      }
      [data-mode="bruto"] .mode-card--primary {
        border-color: hsl(var(--goal-gross) / 0.45);
        background: radial-gradient(120% 120% at 0% 0%, hsl(var(--goal-gross) / 0.20), transparent 55%);
        box-shadow: inset 0 0 0 1px hsl(var(--goal-gross) / 0.18);
      }
      .mode-text { transition: color 700ms cubic-bezier(0.22,1,0.36,1); }
      [data-mode="liquido"] .mode-text { color: hsl(var(--primary)); }
      [data-mode="bruto"] .mode-text { color: hsl(var(--goal-gross)); }

      .mode-bar { transition: background-color 700ms, width 1100ms cubic-bezier(0.22,1,0.36,1); }
      [data-mode="liquido"] .mode-bar { background-color: hsl(var(--primary)); }
      [data-mode="bruto"] .mode-bar { background-color: hsl(var(--goal-gross)); }

      .mode-icon-bg { transition: background-color 700ms, border-color 700ms, color 700ms; }
      [data-mode="liquido"] .mode-icon-bg {
        background-color: hsl(var(--primary) / 0.10);
        border-color: hsl(var(--primary) / 0.30);
        color: hsl(var(--primary));
      }
      [data-mode="bruto"] .mode-icon-bg {
        background-color: hsl(var(--goal-gross) / 0.12);
        border-color: hsl(var(--goal-gross) / 0.32);
        color: hsl(var(--goal-gross));
      }

      /* ---------- Tema global Líquido (verde) ↔ Bruto (azul) ---------- */
      [data-hero-mode] { --accent-now: var(--primary); }
      [data-hero-mode="bruto"] { --accent-now: var(--goal-gross); }

      .accent-text {
        color: hsl(var(--accent-now));
        transition: color 700ms cubic-bezier(0.22,1,0.36,1);
      }
      .accent-underline {
        background-image: linear-gradient(to right, transparent, hsl(var(--accent-now) / 0.85), transparent);
        transition: background-image 700ms cubic-bezier(0.22,1,0.36,1);
      }
      .accent-cta {
        background-color: hsl(var(--accent-now));
        box-shadow: 0 10px 40px -8px hsl(var(--accent-now) / 0.55);
        transition: background-color 700ms cubic-bezier(0.22,1,0.36,1), box-shadow 700ms cubic-bezier(0.22,1,0.36,1), filter 200ms;
      }
      .accent-badge {
        border-color: hsl(var(--accent-now) / 0.35);
        background-color: hsl(var(--accent-now) / 0.10);
        color: hsl(var(--accent-now));
        transition: color 700ms, background-color 700ms, border-color 700ms;
      }
      .accent-dot {
        background-color: hsl(var(--accent-now));
        transition: background-color 700ms;
      }
      .accent-dot-ping {
        background-color: hsl(var(--accent-now) / 0.7);
        transition: background-color 700ms;
      }

      @media (prefers-reduced-motion: reduce) {
        .hero-anim, .hero-anim-mockup { opacity: 1 !important; transform: none !important; animation: none !important; }
        .hero-float, .hero-breath, .hero-glow-soft, .hero-route, .km-glow-pulse { animation: none !important; }
        .mode-toggle__pill, .mode-card, .mode-text, .mode-bar, .mode-icon-bg,
        .accent-text, .accent-underline, .accent-cta, .accent-badge, .accent-dot, .accent-dot-ping {
          transition: none !important;
        }
      }
    `}</style>
  );
}


/* ------------------------------ pain strip -------------------------------- */
/* Seção 2 — "Faturamento não é lucro": 3 cards (bruto / custos / líquido)
   com count-up dos valores ao entrar no viewport. */

function useInViewOnce<T extends Element>(rootMargin = "-10% 0px") {
  const ref = useRef<T | null>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || inView) return;
    const obs = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            setInView(true);
            obs.disconnect();
            break;
          }
        }
      },
      { rootMargin, threshold: 0.15 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [inView, rootMargin]);
  return { ref, inView };
}

function PainStrip() {
  const { ref, inView } = useInViewOnce<HTMLDivElement>();
  const gross = useCountUp(inView ? 280 : 0, 700);
  const costs = useCountUp(inView ? 92 : 0, 800);
  const net = useCountUp(inView ? 188 : 0, 950);

  return (
    <section className="border-y border-border/40 bg-card/30 px-4 py-14 md:py-20">
      <div ref={ref} className="mx-auto max-w-5xl">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-balance text-2xl font-bold leading-tight tracking-tight md:text-4xl">
            Faturar bem não significa <span className="accent-text">lucrar bem.</span>
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground md:text-base">
            O ganho bruto da corrida não mostra sozinho o lucro real. Combustível, manutenção, pneus,
            óleo, seguro, IPVA e desgaste do carro fazem parte da conta. O Volant organiza esses
            números para mostrar quanto realmente sobra.
          </p>
        </div>

        {/* Cards */}
        <div className="mt-10 grid items-stretch gap-3 md:grid-cols-[1fr_auto_1fr_auto_1fr] md:gap-2">
          <PainCard
            tone="info"
            icon={<Wallet className="h-3.5 w-3.5" />}
            label="Ganho bruto"
            value={brl(gross)}
            subtext="Entrou no dia"
            delay={0}
            visible={inView}
          />
          <PainConnector visible={inView} delay={120} />
          <PainCard
            tone="danger"
            icon={<TrendingDown className="h-3.5 w-3.5" />}
            label="Custos do dia"
            value={`− ${brl(costs)}`}
            subtext="Combustível, veículo e gastos"
            delay={140}
            visible={inView}
          />
          <PainConnector visible={inView} delay={260} />
          <PainCard
            tone="success"
            icon={<TrendingUp className="h-3.5 w-3.5" />}
            label="Lucro líquido"
            value={brl(net)}
            subtext="Depois dos custos"
            delay={280}
            visible={inView}
            emphasize
          />
        </div>

        <p className="mx-auto mt-8 max-w-xl text-center text-xs leading-relaxed text-muted-foreground/90 md:text-sm">
          O Volant transforma registros simples em clareza para decidir melhor.
        </p>
      </div>
    </section>
  );
}

function PainCard({
  tone,
  icon,
  label,
  value,
  subtext,
  delay,
  visible,
  emphasize,
}: {
  tone: "info" | "danger" | "success";
  icon: React.ReactNode;
  label: string;
  value: string;
  subtext: string;
  delay: number;
  visible: boolean;
  emphasize?: boolean;
}) {
  const toneCfg = {
    info: {
      border: "border-sky-400/30",
      bg: "from-sky-400/[0.08] to-card/70",
      chip: "bg-sky-400/15 text-sky-300",
      value: "text-sky-300",
    },
    danger: {
      border: "border-destructive/35",
      bg: "from-destructive/[0.08] to-card/70",
      chip: "bg-destructive/15 text-destructive",
      value: "text-destructive",
    },
    success: {
      border: "border-primary/40",
      bg: "from-primary/[0.12] to-card/70",
      chip: "bg-primary/15 text-primary",
      value: "text-primary",
    },
  }[tone];

  return (
    <div
      className={cn(
        "rounded-2xl border bg-gradient-to-br p-4 transition-all duration-700 ease-[cubic-bezier(0.22,1,0.36,1)]",
        toneCfg.border,
        toneCfg.bg,
        emphasize &&
          "shadow-[0_0_0_1px_hsl(var(--primary)/0.35),0_0_30px_-6px_hsl(var(--primary)/0.45)]",
        visible ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0",
      )}
      style={{ transitionDelay: visible ? `${delay}ms` : "0ms" }}
    >
      <div className="flex items-center gap-2">
        <span className={cn("inline-flex h-6 w-6 items-center justify-center rounded-md", toneCfg.chip)}>
          {icon}
        </span>
        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          {label}
        </span>
      </div>
      <div className={cn("mt-2 text-2xl font-extrabold leading-none tabular-nums md:text-3xl", toneCfg.value)}>
        {value}
      </div>
      <div className="mt-2 text-[11px] leading-tight text-muted-foreground">{subtext}</div>
    </div>
  );
}

function PainConnector({ visible, delay }: { visible: boolean; delay: number }) {
  return (
    <div
      className={cn(
        "flex items-center justify-center transition-opacity duration-500",
        visible ? "opacity-100" : "opacity-0",
      )}
      style={{ transitionDelay: visible ? `${delay}ms` : "0ms" }}
      aria-hidden
    >
      {/* Mobile: traço vertical curto. Desktop: seta horizontal. */}
      <div className="h-4 w-px bg-gradient-to-b from-transparent via-border to-transparent md:hidden" />
      <ArrowRight className="hidden h-4 w-4 text-muted-foreground/50 md:block" />
    </div>
  );
}

/* ----------------------------- diferencial 1 ------------------------------ */
/* Seção 3 — KM Inteligente "Boom": mockup fiel + animação sequenciada
   demonstrando o R$/km recalculando após lucro e gasto registrados. */

function FeatureKmInteligente() {
  const { ref, inView } = useInViewOnce<HTMLDivElement>();
  // Fases: 0 inicial → 1 lucro entra → 2 recalcula 2,34→2,23 → 3 gasto entra
  // → 4 recalcula 2,23→2,26 → 5 estado final estabilizado.
  const [phase, setPhase] = useState(0);
  const reduced =
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

  useEffect(() => {
    if (!inView) return;
    if (reduced) {
      setPhase(5);
      return;
    }
    const timers: ReturnType<typeof setTimeout>[] = [];
    timers.push(setTimeout(() => setPhase(1), 1400));
    timers.push(setTimeout(() => setPhase(2), 2600));
    timers.push(setTimeout(() => setPhase(3), 4400));
    timers.push(setTimeout(() => setPhase(4), 5600));
    timers.push(setTimeout(() => setPhase(5), 7200));
    return () => timers.forEach(clearTimeout);
  }, [inView, reduced]);

  // R$/km e meta restante variam conforme a fase. Valores escolhidos pra
  // oscilação ser claramente perceptível (lucro alto → cai bastante; custo
  // razoável → sobe de novo, sem voltar pro patamar inicial).
  const kmValue = phase >= 4 ? 2.18 : phase >= 2 ? 2.05 : 2.34;
  const goalRemaining = phase >= 2 ? 3160 : 3480;
  const costsValue = phase >= 4 ? 575 : 480;
  const animatedKm = useCountUp(kmValue, 900);
  const animatedGoal = useCountUp(goalRemaining, 800);
  const animatedCosts = useCountUp(costsValue, 800);

  const legend =
    phase >= 4
      ? "Custo considerado. Referência recalculada."
      : phase >= 2
        ? "Meta restante menor. R$/km ajustado."
        : "Atualizado em tempo real conforme você registra.";

  return (
    <section id="km" className="px-4 py-16 md:py-24">
      <div
        ref={ref}
        className="mx-auto grid max-w-6xl items-center gap-10 md:grid-cols-2 md:gap-14"
      >
        {/* Texto + bullets + CTA */}
        <div className="order-1 md:order-1">
          <Eyebrow icon={<Gauge className="h-3 w-3" />}>Diferencial #1</Eyebrow>
          <h2 className="mt-4 text-balance text-3xl font-bold leading-tight tracking-tight md:text-4xl">
            KM Inteligente:{" "}
            <span className="accent-text">escolha melhor antes de aceitar a corrida.</span>
          </h2>
          <p className="mt-4 text-sm leading-relaxed text-muted-foreground md:text-base">
            O Volant calcula uma referência de R$/km mínimo com base na sua meta, custos do veículo,
            KM planejado e quanto ainda falta para fechar o mês.
          </p>

          <ul className="mt-6 space-y-3">
            <KmBullet title="Considera sua meta do mês">
              O cálculo parte do quanto ainda falta para você atingir seu objetivo.
            </KmBullet>
            <KmBullet title="Inclui custos reais do veículo">
              Manutenção, óleo, pneus, IPVA, seguro e outros custos entram na conta.
            </KmBullet>
            <KmBullet title="Recalcula conforme sua rotina muda">
              Registrou ganho, gasto ou rodou mais? A referência se ajusta.
            </KmBullet>
          </ul>

          <div className="mt-7">
            <Link
              to="/auth"
              className="accent-cta inline-flex h-12 items-center gap-2 rounded-full px-7 text-sm font-semibold text-primary-foreground transition hover:brightness-110"
            >
              Testar grátis por 7 dias
              <ArrowRight className="h-4 w-4" />
            </Link>
            <p className="mt-2 text-[11px] text-muted-foreground">
              ✓ Sem cartão. Sem cobrança automática.
            </p>
          </div>
        </div>

        {/* Mockup + floaters */}
        <div className="relative order-2 mx-auto w-full max-w-[340px] md:order-2">
          <div className="absolute -inset-10 -z-10 rounded-full bg-primary/15 blur-3xl hero-breath" />
          <div className="relative hero-float">
            <PhoneFrame>
              <KmBoomMockup
                kmValue={animatedKm}
                goalRemaining={animatedGoal}
                costsValue={animatedCosts}
              />
            </PhoneFrame>

            {/* Floater de lucro — entra na fase 1 e permanece visível */}
            <FloatingEntry
              tone="success"
              icon={<Plus className="h-3 w-3" strokeWidth={3} />}
              label="Lucro registrado"
              value="+ R$ 320,00"
              visible={phase >= 1}
              position="topRight"
            />
            {/* Floater de gasto — entra na fase 3 e permanece visível */}
            <FloatingEntry
              tone="danger"
              icon={<Minus className="h-3 w-3" strokeWidth={3} />}
              label="Custo registrado"
              value="− R$ 95,00"
              visible={phase >= 3}
              position="bottomLeft"
            />
          </div>

          <p
            className={cn(
              "mx-auto mt-4 max-w-[280px] text-center text-[11px] leading-snug text-muted-foreground transition-opacity duration-500",
              inView ? "opacity-100" : "opacity-0",
            )}
            aria-live="polite"
          >
            {phase >= 5 ? "O Volant ajusta a rota conforme sua rotina muda." : legend}
          </p>
        </div>
      </div>
    </section>
  );
}

function KmBullet({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-3">
      <span className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
        <Check className="h-3.5 w-3.5" />
      </span>
      <div>
        <div className="text-sm font-semibold text-foreground">{title}</div>
        <p className="text-[12.5px] leading-relaxed text-muted-foreground">{children}</p>
      </div>
    </li>
  );
}

function KmBoomMockup({
  kmValue,
  goalRemaining,
  costsValue,
}: {
  kmValue: number;
  goalRemaining: number;
  costsValue: number;
}) {
  const fmtKm = `R$ ${kmValue.toFixed(2).replace(".", ",")}`;
  return (
    <>
      <MockHeader title="KM Inteligente" subtitle="Adaptativo · hoje" />
      <div className="space-y-3 px-4 pb-20 pt-4">
        <div
          className="km-glow-pulse rounded-2xl border border-primary/40 bg-gradient-to-br from-primary/20 to-card p-4 text-center"
        >
          <div className="text-[10px] font-semibold uppercase tracking-wider text-primary">
            R$/km mínimo agora
          </div>
          <div className="mt-1 text-4xl font-extrabold tabular-nums text-foreground">{fmtKm}</div>
          <div className="mt-1 text-[10px] text-muted-foreground">
            pra bater sua meta líquida do mês
          </div>
        </div>

        <div className="rounded-xl border border-border/50 bg-card/60 p-3">
          <div className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Como o Volant calcula
          </div>
          <Row label="Meta líquida restante" value={brl(goalRemaining)} />
          <Row label="Custos do veículo" value={brl(costsValue)} />
          <Row label="KM planejado restante" value="1.690 km" />
          <div className="mt-2 border-t border-border/40 pt-2">
            <Row label="Mínimo por km" value={fmtKm} emphasize />
          </div>
        </div>

        <div className="rounded-xl border border-border/50 bg-card/60 p-3">
          <div className="flex items-center justify-between text-[10px]">
            <span className="font-semibold">Base do mês</span>
            <span className="text-muted-foreground">R$ 2,18 /km</span>
          </div>
          <div className="mt-1 text-[10px] text-muted-foreground">
            Se você rodar menos hoje, o mínimo de amanhã sobe automaticamente.
          </div>
        </div>
      </div>
      <MockBottomNav active="Mais" />
    </>
  );
}

function FloatingEntry({
  tone,
  icon,
  label,
  value,
  visible,
  position,
}: {
  tone: "success" | "danger";
  icon: React.ReactNode;
  label: string;
  value: string;
  visible: boolean;
  position: "topRight" | "bottomLeft";
}) {
  const toneCls =
    tone === "success"
      ? "border-primary/40 bg-card/95 text-primary shadow-[0_8px_24px_-8px_hsl(var(--primary)/0.55)]"
      : "border-destructive/40 bg-card/95 text-destructive shadow-[0_8px_24px_-8px_hsl(var(--destructive)/0.5)]";
  const posCls =
    position === "topRight"
      ? "top-6 -right-2 sm:-right-6 md:-right-10"
      : "bottom-24 -left-2 sm:-left-6 md:-left-10";
  return (
    <div
      className={cn(
        "absolute z-30 flex items-center gap-2 rounded-full border px-3 py-1.5 backdrop-blur transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]",
        toneCls,
        posCls,
        visible
          ? "translate-y-0 opacity-100 scale-100"
          : position === "topRight"
            ? "-translate-y-2 opacity-0 scale-95"
            : "translate-y-2 opacity-0 scale-95",
      )}
      aria-hidden={!visible}
    >
      <span
        className={cn(
          "inline-flex h-5 w-5 items-center justify-center rounded-full",
          tone === "success" ? "bg-primary/15" : "bg-destructive/15",
        )}
      >
        {icon}
      </span>
      <div className="text-left leading-tight">
        <div className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">
          {label}
        </div>
        <div className="text-[12px] font-extrabold tabular-nums">{value}</div>
      </div>
    </div>
  );
}



/* ----------------------------- diferencial 2 ------------------------------ */

function FeatureMetas() {
  return (
    <FeatureSection
      id="metas"
      tag="Diferencial #2"
      tagIcon={<Target className="h-3 w-3" />}
      title={<>Metas que <span className="accent-text">se adaptam</span> a como você roda.</>}
      description="Defina uma meta mensal e o Volant redistribui automaticamente o quanto falta a cada dia trabalhado — se você rodou bem na segunda, sua meta de terça relaxa. Se ficou pra trás, ela ajusta."
      bullets={[
        "Meta diária, semanal e mensal sempre atualizadas.",
        "Escolha entre meta bruta ou líquida.",
        "Acompanhe o progresso em tempo real direto na home.",
      ]}
      mockup={<MetasMockup />}
      reverse={true}
    />
  );
}

/* ----------------------------- diferencial 3 ------------------------------ */

function FeaturePersonalizacao() {
  return (
    <FeatureSection
      id="personalizacao"
      tag="Diferencial #3"
      tagIcon={<LayoutGrid className="h-3 w-3" />}
      title={<>Sua tela do seu jeito — <span className="accent-text">do seu jeito mesmo.</span></>}
      description="A maioria dos apps de motorista é engessada. No Volant, você reorganiza os cards da home, escolhe o cumprimento, ajusta categorias e deixa o app com a sua cara."
      bullets={[
        "Arraste e solte os cards da tela inicial.",
        "Crie suas próprias categorias de ganho e gasto.",
        "Saudação, ícones e visual personalizáveis.",
      ]}
      mockup={<PersonalizacaoMockup />}
      reverse={false}
    />
  );
}

/* --------------------------- outras funções ------------------------------- */

function SecondaryFeatures() {
  const items = [
    {
      icon: <Clock className="h-5 w-5" />,
      title: "Jornada automática",
      desc: "Inicie sua jornada de trabalho escolhendo a meta do dia, controle suas pausas e finalize registrando ganhos e gastos com as horas já preenchidas.",
    },
    {
      icon: <Wrench className="h-5 w-5" />,
      title: "Manutenção preventiva",
      desc: "Receba lembretes de troca de óleo, pneu e revisão com base nos km rodados de verdade.",
    },
    {
      icon: <TrendingUp className="h-5 w-5" />,
      title: "Relatórios claros",
      desc: "Bruto, líquido, R$/h, R$/km e médias por período em um lugar. Sem jargão financeiro. Exporte tudo em PDF, Word ou Excel quando quiser.",
    },
    {
      icon: <ShieldCheck className="h-5 w-5" />,
      title: "Seus dados, só seus",
      desc: "Armazenamento criptografado e backup automático. Você manda nos seus números.",
    },
  ];

  return (
    <section id="mais" className="px-4 py-16 md:py-24">
      <div className="mx-auto max-w-6xl">
        <div className="mx-auto max-w-2xl text-center">
          <Eyebrow icon={<Brain className="h-3 w-3" />}>Mais inteligência no seu dia</Eyebrow>
          <h2 className="mt-4 text-3xl font-bold tracking-tight md:text-4xl">
            Recursos que <span className="accent-text">trabalham por você</span>.
          </h2>
        </div>

        <div className="mt-10 grid gap-4 sm:grid-cols-2">
          {items.map((it) => (
            <div
              key={it.title}
              className="group rounded-2xl border border-border/60 bg-card/60 p-5 backdrop-blur transition hover:border-primary/40 hover:bg-card"
            >
              <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15 text-primary">
                {it.icon}
              </div>
              <h3 className="mt-4 text-base font-semibold">{it.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{it.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------- final cta -------------------------------- */

function FinalCta() {
  return (
    <section className="px-4 pb-20">
      <div className="relative mx-auto max-w-5xl overflow-hidden rounded-3xl border border-primary/30 bg-gradient-to-br from-primary/15 via-card to-card p-8 text-center md:p-14">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top,hsl(var(--primary)/0.25),transparent_60%)]" />
        <h2 className="text-balance text-3xl font-extrabold tracking-tight md:text-4xl">
          Comece a dirigir com clareza <span className="accent-text">hoje mesmo</span>.
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground md:text-base">
          Teste o Volant por 7 dias sem pagar nada. Sem cartão. Sem amarração.
        </p>
        <div className="mt-6 flex justify-center">
          <Link
            to="/auth"
            className="accent-cta inline-flex h-12 items-center gap-2 rounded-full px-8 text-sm font-semibold text-primary-foreground transition hover:brightness-110"
          >
            Criar minha conta grátis
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}

/* --------------------------------- footer --------------------------------- */

function Footer() {
  return (
    <footer className="border-t border-border/40 bg-card/40 px-4 py-10">
      <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-6 text-sm text-muted-foreground md:flex-row md:items-center">
        <div className="flex items-center gap-2">
          <img src={volantSymbol} alt="Volant" className="h-6 w-6 rounded-full" />
          <span className="font-semibold text-foreground">Volant</span>
          <span className="hidden md:inline">— feito por motoristas, para motoristas.</span>
        </div>
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
          <Link to="/auth" className="transition hover:text-foreground">Entrar</Link>
          <a href="#km" className="transition hover:text-foreground">Recursos</a>
          <span className="text-muted-foreground/60">© {new Date().getFullYear()} Volant</span>
        </div>
      </div>
    </footer>
  );
}

/* ============================== helpers =================================== */

function Eyebrow({ children, icon }: { children: React.ReactNode; icon?: React.ReactNode }) {
  return (
    <span className="accent-badge inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-wider">
      {icon}
      {children}
    </span>
  );
}

function FeatureSection({
  id,
  tag,
  tagIcon,
  title,
  description,
  bullets,
  mockup,
  reverse,
}: {
  id: string;
  tag: string;
  tagIcon?: React.ReactNode;
  title: React.ReactNode;
  description: string;
  bullets: string[];
  mockup: React.ReactNode;
  reverse?: boolean;
}) {
  return (
    <section id={id} className="px-4 py-16 md:py-24">
      <div
        className={cn(
          "mx-auto grid max-w-6xl items-center gap-12 md:grid-cols-2",
          reverse && "md:[&>div:first-child]:order-2",
        )}
      >
        <div>
          <Eyebrow icon={tagIcon}>{tag}</Eyebrow>
          <h2 className="mt-4 text-balance text-3xl font-bold leading-tight tracking-tight md:text-4xl">
            {title}
          </h2>
          <p className="mt-4 text-sm leading-relaxed text-muted-foreground md:text-base">{description}</p>
          <ul className="mt-6 space-y-2.5">
            {bullets.map((b) => (
              <li key={b} className="flex items-start gap-2.5 text-sm text-foreground/90">
                <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
                  <Check className="h-3 w-3" />
                </span>
                {b}
              </li>
            ))}
          </ul>
        </div>

        <div className="relative mx-auto w-full max-w-[320px]">
          <div className="absolute -inset-8 -z-10 rounded-full bg-primary/15 blur-3xl hero-breath" />
          <div className="hero-float">
            <PhoneFrame>{mockup}</PhoneFrame>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ============================= phone frame ================================ */

function PhoneFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative mx-auto w-[290px] rounded-[2.4rem] border border-border/60 bg-card p-2 shadow-[0_30px_80px_-20px_hsl(var(--primary)/0.35),0_10px_30px_-10px_hsl(0_0%_0%/0.45)]">
      <div className="absolute left-1/2 top-2 z-20 h-5 w-24 -translate-x-1/2 rounded-b-2xl bg-background/90" />
      <div className="overflow-hidden rounded-[1.9rem] bg-background">
        <div className="relative h-[560px] w-full overflow-hidden">{children}</div>
      </div>
    </div>
  );
}

/* ----------------------------- mockups (JSX) ------------------------------ */
/* Estes mockups são representações fiéis do app real, montadas em JSX usando
   os mesmos tokens de design — sem prints jpeg/png soltos. */

function MockHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="flex items-center gap-2 border-b border-border/40 bg-card/60 px-4 pt-7 pb-3">
      <img src={volantSymbol} alt="" className="h-7 w-7 rounded-full" />
      <div className="min-w-0">
        <div className="text-[13px] font-bold leading-tight">{title}</div>
        {subtitle && <div className="text-[10px] text-muted-foreground">{subtitle}</div>}
      </div>
    </div>
  );
}

function MockTabs({ active = "Hoje" }: { active?: string }) {
  return (
    <div className="mx-4 mt-3 flex gap-1 rounded-full border border-border/40 bg-card/40 p-1 text-[11px]">
      {["Hoje", "Semana", "Mês"].map((t) => (
        <span
          key={t}
          className={cn(
            "flex-1 rounded-full py-1.5 text-center font-semibold",
            active === t ? "bg-primary text-primary-foreground" : "text-muted-foreground",
          )}
        >
          {t}
        </span>
      ))}
    </div>
  );
}

function MockBottomNav({ active = "Início" }: { active?: string }) {
  const items = [
    { label: "Início", icon: HomeIcon },
    { label: "Histórico", icon: HistoryIcon },
    { label: "Relatórios", icon: BarChart3 },
    { label: "Ajustes", icon: SettingsIcon },
  ];
  return (
    <>
      <div className="absolute inset-x-0 bottom-0 z-10 border-t border-border/40 bg-card/90 backdrop-blur">
        <div className="grid grid-cols-5 px-1 pt-1.5 pb-2">
          {items.map((it, idx) => {
            const Icon = it.icon;
            const isActive = active === it.label;
            return (
              <div
                key={it.label}
                className={cn(
                  "flex flex-col items-center gap-0.5",
                  idx === 2 && "col-start-4",
                  idx === 3 && "col-start-5",
                )}
              >
                <Icon
                  className={cn(
                    "h-4 w-4",
                    isActive ? "text-primary" : "text-muted-foreground",
                  )}
                  strokeWidth={isActive ? 2.4 : 2}
                />
                <span
                  className={cn(
                    "text-[9px] font-medium",
                    isActive ? "text-primary" : "text-muted-foreground",
                  )}
                >
                  {it.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>
      {/* FAB central verde "+"  — replica o BottomNav do app */}
      <div
        className="absolute left-1/2 z-20 -translate-x-1/2"
        style={{ bottom: "10px" }}
        aria-hidden
      >
        <div className="grid h-10 w-10 place-items-center rounded-full text-primary-foreground bg-gradient-to-b from-success to-success/85 ring-1 ring-success/30 shadow-[0_6px_16px_-4px_hsl(var(--success)/0.55),0_2px_4px_hsl(var(--success)/0.25)]">
          <Plus className="h-4 w-4" strokeWidth={2.6} />
        </div>
      </div>
    </>
  );
}

function HomeMockup({ mode = "liquido" }: { mode?: HeroMode }) {
  const isLiq = mode === "liquido";
  // Valores reativos ao modo
  const mainValue = isLiq ? 350 : 600;
  const mainLabel = isLiq ? "Lucro Líquido" : "Faturamento Bruto";
  const mainTag = isLiq ? "LUCRO LÍQUIDO" : "FATURAMENTO BRUTO";

  const metaLabel = isLiq ? "Meta líquida do dia" : "Meta bruta do dia";
  const metaCurrent = isLiq ? 350 : 600;
  const metaTarget = isLiq ? 714 : 1000;
  const metaPct = isLiq ? 49 : 60;
  const metaRemaining = isLiq ? 364 : 400;

  const kmLabel = isLiq ? "R$/KM Inteligente" : "R$/KM Bruto";
  const kmValue = isLiq ? 2.42 : 4.15;

  return (
    <div data-mode={mode} className="contents">
      <MockHeader title="Olá, Motorista 👋" subtitle="Foco, disciplina e constância!" />

      {/* Toggle Líquido / Bruto (decorativo, alterna sozinho) */}
      <div className="px-4 pt-3">
        <div className="mode-toggle w-full">
          <span className="mode-toggle__pill" aria-hidden />
          <span className="mode-toggle__option" data-opt="liquido">Líquido</span>
          <span className="mode-toggle__option" data-opt="bruto">Bruto</span>
        </div>
      </div>

      <div className="space-y-3 px-4 pb-20 pt-3">
        {/* Card principal — alterna Líquido / Bruto */}
        <div className="mode-card mode-card--primary rounded-2xl border p-3">
          <div className="mode-text flex items-center gap-1.5 text-[9px] font-semibold uppercase tracking-wider" aria-label={mainTag}>
            <Gauge className="h-2.5 w-2.5" /> {mainLabel}
          </div>
          <div className="mt-1 text-[26px] font-extrabold leading-none tabular-nums">
            <AnimatedNumber value={mainValue} format={fmtBRL} />
          </div>
          <div className="mt-3 border-t border-current/15 pt-2 flex items-center justify-between text-[10px]" style={{ borderColor: "hsl(var(--border) / 0.6)" }}>
            <span className="flex items-center gap-1 text-muted-foreground">
              <span className="h-1.5 w-1.5 rounded-full bg-sky-400" /> Bruto
              <span className="text-foreground font-semibold">R$ 600,00</span>
            </span>
            <span className="text-border">|</span>
            <span className="flex items-center gap-1 text-muted-foreground">
              <span className="h-1.5 w-1.5 rounded-full bg-red-400" /> Gastos
              <span className="text-foreground font-semibold">R$ 250,00</span>
            </span>
          </div>
        </div>

        {/* Meta do dia */}
        <div className="rounded-2xl border border-border/50 bg-card/60 p-3">
          <div className="flex items-center justify-between text-[10px]">
            <span className="mode-text flex items-center gap-1 font-semibold">
              <Target className="h-2.5 w-2.5" /> {metaLabel}
            </span>
            <span className="text-muted-foreground tabular-nums">
              <span className="text-foreground font-semibold">
                <AnimatedNumber value={metaCurrent} format={fmtBRLInt} />
              </span>{" "}
              / <AnimatedNumber value={metaTarget} format={fmtBRLInt} />
            </span>
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
            <div
              key={mode /* força re-anim da largura na troca */}
              className="mode-bar h-full rounded-full"
              style={{ width: `${metaPct}%` }}
            />
          </div>
          <div className="mt-1.5 flex items-center justify-between text-[10px] text-muted-foreground">
            <span>
              Faltam <AnimatedNumber value={metaRemaining} format={fmtBRLInt} />
            </span>
            <span className="mode-text font-semibold">
              <AnimatedNumber value={metaPct} format={(n) => `${Math.round(n)}%`} />
            </span>
          </div>
        </div>

        {/* R$/KM Inteligente — horizontal */}
        <div className="flex items-center gap-2 rounded-2xl border border-border/50 bg-card/60 p-2.5">
          <span className="mode-icon-bg grid h-9 w-9 place-items-center rounded-xl border">
            <Gauge className="h-4 w-4" />
          </span>
          <div className="flex-1 text-center">
            <div className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">
              {kmLabel}
            </div>
            <div className="mt-0.5 text-[15px] font-extrabold tabular-nums">
              <AnimatedNumber value={kmValue} format={(n) => `R$ ${n.toFixed(2).replace(".", ",")}`} />{" "}
              <span className="text-[10px] font-medium text-muted-foreground">/ km</span>
            </div>
          </div>
        </div>

        {/* Performance (neutro) */}
        <div>
          <div className="mb-1.5 flex items-center gap-1.5 text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">
            <Gauge className="h-2.5 w-2.5" /> Performance
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-2xl border border-border/50 bg-card/60 p-2.5">
              <div className="text-[9px] font-semibold uppercase tracking-wider text-primary">
                R$ / Hora
              </div>
              <div className="mt-0.5 text-base font-extrabold tabular-nums">R$ 75,00</div>
              <div className="text-[9px] text-muted-foreground">8,0h trabalhadas</div>
            </div>
            <div className="rounded-2xl border border-border/50 bg-card/60 p-2.5">
              <div className="text-[9px] font-semibold uppercase tracking-wider text-sky-400">
                R$ / Km
              </div>
              <div className="mt-0.5 text-base font-extrabold tabular-nums">R$ 2,31</div>
              <div className="text-[9px] text-muted-foreground">260,0 km</div>
            </div>
          </div>
        </div>
      </div>
      <MockBottomNav />
    </div>
  );
}


function Row({ label, value, emphasize }: { label: string; value: string; emphasize?: boolean }) {
  return (
    <div className="flex items-center justify-between py-1 text-[11px]">
      <span className={cn("text-muted-foreground", emphasize && "font-semibold text-foreground")}>{label}</span>
      <span className={cn("font-semibold tabular-nums", emphasize && "text-primary")}>{value}</span>
    </div>
  );
}

/* 4 "estados de dia" que alternam em loop pra demonstrar dinamismo. */
const METAS_STATES = [
  {
    pct: 58,
    faltam: 3480,
    hoje: { value: 290, hint: "+ 12% vs ontem" },
    amanha: { value: 305, hint: "ajustada" },
    next: [
      { d: "Seg", v: 305, w: 75 },
      { d: "Ter", v: 310, w: 78 },
      { d: "Qua", v: 295, w: 70 },
      { d: "Qui", v: 320, w: 82 },
      { d: "Sex", v: 330, w: 88 },
    ],
  },
  {
    pct: 62,
    faltam: 3160,
    hoje: { value: 305, hint: "+ 5% vs ontem" },
    amanha: { value: 295, hint: "ajustada" },
    next: [
      { d: "Seg", v: 295, w: 72 },
      { d: "Ter", v: 305, w: 76 },
      { d: "Qua", v: 285, w: 68 },
      { d: "Qui", v: 315, w: 80 },
      { d: "Sex", v: 325, w: 86 },
    ],
  },
  {
    pct: 67,
    faltam: 2790,
    hoje: { value: 280, hint: "− 8% vs ontem" },
    amanha: { value: 320, hint: "ajustada" },
    next: [
      { d: "Seg", v: 320, w: 80 },
      { d: "Ter", v: 315, w: 78 },
      { d: "Qua", v: 305, w: 74 },
      { d: "Qui", v: 330, w: 84 },
      { d: "Sex", v: 340, w: 90 },
    ],
  },
  {
    pct: 71,
    faltam: 2440,
    hoje: { value: 315, hint: "+ 9% vs ontem" },
    amanha: { value: 310, hint: "ajustada" },
    next: [
      { d: "Seg", v: 310, w: 76 },
      { d: "Ter", v: 320, w: 80 },
      { d: "Qua", v: 300, w: 72 },
      { d: "Qui", v: 325, w: 82 },
      { d: "Sex", v: 335, w: 88 },
    ],
  },
] as const;

function MetasMockup() {
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    if (typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
      return;
    }
    const id = window.setInterval(() => {
      setIdx((i) => (i + 1) % METAS_STATES.length);
    }, 4500);
    return () => window.clearInterval(id);
  }, []);

  const s = METAS_STATES[idx];
  const animPct = useCountUp(s.pct, 800);
  const animFaltam = useCountUp(s.faltam, 800);
  const animHoje = useCountUp(s.hoje.value, 800);
  const animAmanha = useCountUp(s.amanha.value, 800);
  // 5 hooks fixos (a quantidade de dias é constante)
  const animN0 = useCountUp(s.next[0].v, 800);
  const animN1 = useCountUp(s.next[1].v, 800);
  const animN2 = useCountUp(s.next[2].v, 800);
  const animN3 = useCountUp(s.next[3].v, 800);
  const animN4 = useCountUp(s.next[4].v, 800);
  const animNext = [
    { d: s.next[0].d, v: animN0, w: s.next[0].w },
    { d: s.next[1].d, v: animN1, w: s.next[1].w },
    { d: s.next[2].d, v: animN2, w: s.next[2].w },
    { d: s.next[3].d, v: animN3, w: s.next[3].w },
    { d: s.next[4].d, v: animN4, w: s.next[4].w },
  ];

  return (
    <>
      <MockHeader title="Metas Inteligentes" subtitle="Adaptativas · novembro" />
      <div className="space-y-3 px-4 pb-20 pt-4">
        <div className="rounded-xl border border-border/50 bg-card/60 p-3">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Meta do mês — líquido
          </div>
          <div className="mt-1 flex items-end justify-between">
            <span className="text-2xl font-extrabold tabular-nums">R$ 8.400</span>
            <span className="text-[10px] text-muted-foreground tabular-nums">
              faltam R$ {Math.round(animFaltam).toLocaleString("pt-BR")}
            </span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-[width] duration-700 ease-[cubic-bezier(0.22,1,0.36,1)]"
              style={{ width: `${animPct}%` }}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <DayCard
            day="Hoje"
            value={`R$ ${Math.round(animHoje)}`}
            hint={s.hoje.hint}
            highlight
          />
          <DayCard day="Amanhã" value={`R$ ${Math.round(animAmanha)}`} hint={s.amanha.hint} />
        </div>

        <div className="rounded-xl border border-border/50 bg-card/60 p-3">
          <div className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Próximos 5 dias
          </div>
          {animNext.map((it) => (
            <div key={it.d} className="mb-1.5 flex items-center gap-2 text-[10px]">
              <span className="w-7 text-muted-foreground">{it.d}</span>
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary/70 transition-[width] duration-700 ease-[cubic-bezier(0.22,1,0.36,1)]"
                  style={{ width: `${it.w}%` }}
                />
              </div>
              <span className="w-14 text-right font-semibold tabular-nums">
                R$ {Math.round(it.v)}
              </span>
            </div>
          ))}
        </div>
      </div>
      <MockBottomNav active="Mais" />
    </>
  );
}

function DayCard({ day, value, hint, highlight }: { day: string; value: string; hint: string; highlight?: boolean }) {
  return (
    <div
      className={cn(
        "rounded-xl border p-3 transition-colors",
        highlight ? "border-primary/40 bg-primary/10" : "border-border/50 bg-card/60",
      )}
    >
      <div className="text-[9px] uppercase text-muted-foreground">{day}</div>
      <div className="mt-0.5 text-base font-extrabold tabular-nums">{value}</div>
      <div className={cn("text-[9px]", highlight ? "text-primary" : "text-muted-foreground")}>{hint}</div>
    </div>
  );
}


function PersonalizacaoMockup() {
  const baseCards = [
    { id: "fat", name: "Faturamento", icon: <TrendingUp className="h-3.5 w-3.5" /> },
    { id: "meta", name: "Meta do dia", icon: <Target className="h-3.5 w-3.5" /> },
    { id: "km", name: "KM Inteligente", icon: <Gauge className="h-3.5 w-3.5" /> },
    { id: "perf", name: "Performance", icon: <Sparkles className="h-3.5 w-3.5" /> },
    { id: "man", name: "Manutenção", icon: <Wrench className="h-3.5 w-3.5" /> },
  ];

  // 3 cenas em loop:
  //  0 = estado base
  //  1 = "KM Inteligente" sobe (swap com "Meta do dia")
  //  2 = "Manutenção" desativada (oculto) + toast "Removido da Home"
  const [scene, setScene] = useState(0);

  useEffect(() => {
    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduced) return;
    const id = window.setInterval(() => {
      setScene((s) => (s + 1) % 3);
    }, 2200);
    return () => window.clearInterval(id);
  }, []);

  // Define ordem visível e card destacado por cena.
  const order =
    scene === 1
      ? ["fat", "km", "meta", "perf", "man"]
      : ["fat", "meta", "km", "perf", "man"];
  const highlightId = scene === 1 ? "km" : "km";
  const hiddenId = scene === 2 ? "man" : null;

  const rowHeight = 56; // altura aproximada de cada card (p-3 + gap)
  const positions: Record<string, number> = {};
  order.forEach((id, idx) => {
    positions[id] = idx;
  });

  return (
    <>
      <MockHeader title="Organizar cards" subtitle="Arraste para reordenar" />
      <div className="relative px-4 pb-20 pt-4">
        <div className="mb-2.5 rounded-xl border border-primary/30 bg-primary/10 p-3 text-[11px]">
          <div className="flex items-center gap-2 font-semibold text-primary">
            <LayoutGrid className="h-3.5 w-3.5" /> Sua tela, do seu jeito
          </div>
          <div className="mt-1 text-[10px] text-muted-foreground">
            Arraste, esconda ou destaque qualquer card da home.
          </div>
        </div>

        <div
          className="relative"
          style={{ height: rowHeight * baseCards.length }}
        >
          {baseCards.map((c) => {
            const pos = positions[c.id];
            const isHighlighted = c.id === highlightId;
            const isHidden = c.id === hiddenId;
            return (
              <div
                key={c.id}
                className={cn(
                  "absolute left-0 right-0 flex items-center gap-3 rounded-xl border bg-card/60 p-3",
                  isHighlighted
                    ? "border-primary/40 shadow-[0_8px_24px_-8px_hsl(var(--primary)/0.4)]"
                    : "border-border/50",
                )}
                style={{
                  transform: `translateY(${pos * rowHeight}px)`,
                  transition:
                    "transform 600ms cubic-bezier(0.22,1,0.36,1), opacity 400ms ease",
                  opacity: isHidden ? 0.35 : 1,
                }}
              >
                <span className="text-muted-foreground">⋮⋮</span>
                <span
                  className={cn(
                    "inline-flex h-7 w-7 items-center justify-center rounded-lg",
                    isHidden
                      ? "bg-muted text-muted-foreground"
                      : "bg-primary/15 text-primary",
                  )}
                >
                  {c.icon}
                </span>
                <span className="flex-1 text-[12px] font-semibold">{c.name}</span>
                <span
                  className={cn(
                    "text-[10px]",
                    isHidden ? "text-warning" : "text-muted-foreground",
                  )}
                >
                  {isHidden ? "oculto" : "visível"}
                </span>
              </div>
            );
          })}
        </div>

        {/* Toast simulando "removido da home" quando o card de Manutenção é desativado */}
        <div
          className={cn(
            "pointer-events-none absolute left-1/2 bottom-24 -translate-x-1/2 rounded-full border border-border/60 bg-card/95 px-3 py-1.5 text-[10px] font-semibold text-foreground shadow-[0_12px_30px_-12px_hsl(0_0%_0%/0.6)]",
            "transition-opacity duration-500",
          )}
          style={{ opacity: scene === 2 ? 1 : 0 }}
        >
          <span className="inline-flex items-center gap-1.5">
            <Check className="h-3 w-3 text-warning" />
            Removido da Home
          </span>
        </div>
      </div>
      <MockBottomNav active="Mais" />
    </>
  );
}
