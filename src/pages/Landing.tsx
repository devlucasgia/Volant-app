import { useEffect } from "react";
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
  Wrench,
  Clock,
  ShieldCheck,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import volantSymbol from "@/assets/volant-symbol-header.png";
import { cn } from "@/lib/utils";

/* -------------------------------------------------------------------------- */
/*  Landing page (pública). Sprint 1 — hero + 3 diferenciais + footer base.   */
/*  Mobile-first. Tema escuro fixo (independente da preferência do usuário)   */
/*  para refletir o visual da identidade Volant na página de vendas.          */
/* -------------------------------------------------------------------------- */

export default function Landing() {
  const { user, loading } = useAuth();

  // Força o tema escuro só enquanto a landing está montada.
  useEffect(() => {
    const root = document.documentElement;
    const had = root.classList.contains("dark");
    root.classList.add("dark");
    return () => {
      if (!had) root.classList.remove("dark");
    };
  }, []);

  // Usuário logado pula direto pro app.
  if (!loading && user) return <Navigate to="/app" replace />;

  return (
    <div className="min-h-screen bg-background text-foreground antialiased">
      <BackgroundGlow />
      <Header />
      <main className="relative">
        <Hero />
        <PainStrip />
        <FeatureKmInteligente />
        <FeatureMetas />
        <FeaturePersonalizacao />
        <SecondaryFeatures />
        <FinalCta />
      </main>
      <Footer />
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
          className="inline-flex h-9 items-center gap-1.5 rounded-full bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-[var(--shadow-fab)] transition hover:brightness-110"
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

function Hero() {
  return (
    <section id="top" className="relative px-4 pt-10 pb-16 md:pt-20 md:pb-24">
      <div className="mx-auto grid max-w-6xl items-center gap-12 md:grid-cols-2">
        <div className="text-center md:text-left">
          <Eyebrow icon={<Sparkles className="h-3 w-3" />}>Inteligência para quem vive da rua</Eyebrow>

          <h1 className="mt-4 text-balance text-4xl font-extrabold leading-[1.05] tracking-tight md:text-6xl">
            O app que <span className="text-primary">pensa com você</span> ao volante.
          </h1>

          <p className="mx-auto mt-5 max-w-xl text-base leading-relaxed text-muted-foreground md:mx-0 md:text-lg">
            Volant calcula o R$/km mínimo de cada corrida, adapta suas metas conforme você roda e
            mostra o seu lucro real — automático, todos os dias.
          </p>

          <div className="mt-7 flex flex-col items-center gap-3 sm:flex-row md:items-start md:justify-start">
            <Link
              to="/auth"
              className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-primary px-7 text-sm font-semibold text-primary-foreground shadow-[var(--shadow-fab)] transition hover:brightness-110 sm:w-auto"
            >
              Testar 7 dias grátis
              <ArrowRight className="h-4 w-4" />
            </Link>
            <a
              href="#km"
              className="inline-flex h-12 w-full items-center justify-center rounded-full border border-border bg-card px-7 text-sm font-semibold text-foreground transition hover:bg-accent sm:w-auto"
            >
              Ver como funciona
            </a>
          </div>

          <ul className="mt-6 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs text-muted-foreground md:justify-start">
            <li className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-primary" /> Sem cartão pra testar</li>
            <li className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-primary" /> Cancela quando quiser</li>
            <li className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-primary" /> Dados 100% privados</li>
          </ul>
        </div>

        <div className="relative mx-auto w-full max-w-[320px] md:max-w-none">
          <div className="absolute -inset-10 -z-10 rounded-full bg-primary/20 blur-3xl" />
          <PhoneFrame>
            <HomeMockup />
          </PhoneFrame>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------ pain strip -------------------------------- */

function PainStrip() {
  return (
    <section className="border-y border-border/40 bg-card/30 px-4 py-10 md:py-14">
      <div className="mx-auto max-w-3xl text-center">
        <h2 className="text-2xl font-bold leading-tight tracking-tight md:text-3xl">
          Você sabe quanto <span className="text-primary">sobra de verdade</span> no fim do dia?
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground md:text-base">
          Faturar bem é fácil. Difícil é saber o lucro real depois da gasolina, manutenção, IPVA e
          desgaste do carro. O Volant calcula isso por você — sem planilha, sem caderno, sem chute.
        </p>
      </div>
    </section>
  );
}

/* ----------------------------- diferencial 1 ------------------------------ */

function FeatureKmInteligente() {
  return (
    <FeatureSection
      id="km"
      tag="Diferencial #1"
      tagIcon={<Gauge className="h-3 w-3" />}
      title={<>KM Inteligente: <span className="text-primary">nunca mais aceite corrida no prejuízo.</span></>}
      description="Volant calcula em tempo real o R$/km mínimo que cada corrida precisa pagar pra você bater sua meta — considerando gasolina, custos do veículo e quantos dias você ainda vai rodar."
      bullets={[
        "Cálculo adaptativo: se você rodou mais hoje, o mínimo de amanhã cai.",
        "Considera custos reais do veículo (financiamento, IPVA, óleo, pneu).",
        "Mostra o R$/km de cada corrida na hora de aceitar.",
      ]}
      mockup={<KmMockup />}
      reverse={false}
    />
  );
}

/* ----------------------------- diferencial 2 ------------------------------ */

function FeatureMetas() {
  return (
    <FeatureSection
      id="metas"
      tag="Diferencial #2"
      tagIcon={<Target className="h-3 w-3" />}
      title={<>Metas que <span className="text-primary">se adaptam</span> a como você roda.</>}
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
      title={<>Sua tela do seu jeito — <span className="text-primary">do seu jeito mesmo.</span></>}
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
      desc: "Inicie a jornada e o Volant cronometra suas horas trabalhadas sozinho — pra calcular R$/h sem você anotar nada.",
    },
    {
      icon: <Wrench className="h-5 w-5" />,
      title: "Manutenção preventiva",
      desc: "Receba lembretes de troca de óleo, pneu e revisão com base nos km rodados de verdade.",
    },
    {
      icon: <TrendingUp className="h-5 w-5" />,
      title: "Relatórios claros",
      desc: "Bruto, líquido, R$/h, R$/km e médias por período em um lugar. Sem jargão financeiro.",
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
          <Eyebrow icon={<Sparkles className="h-3 w-3" />}>Mais inteligência no seu dia</Eyebrow>
          <h2 className="mt-4 text-3xl font-bold tracking-tight md:text-4xl">
            Recursos que <span className="text-primary">trabalham por você</span>.
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
          Comece a dirigir com clareza <span className="text-primary">hoje mesmo</span>.
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground md:text-base">
          Teste o Volant por 7 dias sem pagar nada. Sem cartão. Sem amarração.
        </p>
        <div className="mt-6 flex justify-center">
          <Link
            to="/auth"
            className="inline-flex h-12 items-center gap-2 rounded-full bg-primary px-8 text-sm font-semibold text-primary-foreground shadow-[var(--shadow-fab)] transition hover:brightness-110"
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
    <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-primary">
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
          <div className="absolute -inset-8 -z-10 rounded-full bg-primary/15 blur-3xl" />
          <PhoneFrame>{mockup}</PhoneFrame>
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
  const items = ["Início", "Ganhos", "Despesas", "Mais"];
  return (
    <div className="absolute inset-x-0 bottom-0 flex justify-around border-t border-border/40 bg-card/80 px-2 py-2 backdrop-blur">
      {items.map((i) => (
        <span
          key={i}
          className={cn(
            "text-[10px] font-medium",
            active === i ? "text-primary" : "text-muted-foreground",
          )}
        >
          {i}
        </span>
      ))}
    </div>
  );
}

function HomeMockup() {
  return (
    <>
      <MockHeader title="Olá, Lucas 👋" subtitle="Seja bem-vindo(a) de volta!" />
      <MockTabs />
      <div className="space-y-3 px-4 pb-20 pt-3">
        <div className="rounded-xl border border-border/50 bg-card/60 p-3">
          <div className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">
            Faturamento de hoje
          </div>
          <div className="mt-1 text-2xl font-extrabold tabular-nums">R$ 464,00</div>
          <div className="mt-1 flex gap-3 text-[10px] text-muted-foreground">
            <span><span className="text-primary">+ R$ 46,00</span> (11,0%)</span>
            <span>Gasolina <span className="text-foreground">R$ 18,00</span></span>
          </div>
        </div>

        <div className="rounded-xl border border-border/50 bg-card/60 p-3">
          <div className="flex items-center justify-between text-[10px]">
            <span className="font-semibold text-foreground/80">Meta líquida do dia</span>
            <span className="text-muted-foreground">R$ 464,00 / R$ 714,00</span>
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
            <div className="h-full w-[65%] rounded-full bg-primary" />
          </div>
          <div className="mt-1.5 flex items-center justify-between text-[10px] text-muted-foreground">
            <span>Faltam R$ 250,00</span>
            <span className="font-semibold text-primary">65%</span>
          </div>
        </div>

        <div className="rounded-xl border border-primary/30 bg-primary/5 p-3">
          <div className="text-[9px] font-semibold uppercase tracking-wider text-primary">
            Lucro líquido estimado
          </div>
          <div className="mt-1 text-xl font-extrabold tabular-nums">R$ 2,34 <span className="text-xs text-muted-foreground">/km</span></div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-xl border border-border/50 bg-card/60 p-3">
            <div className="text-[9px] uppercase text-muted-foreground">R$/hora líq.</div>
            <div className="mt-0.5 text-base font-bold tabular-nums">R$ 75,00</div>
            <div className="text-[9px] text-primary">+ 8,2%</div>
          </div>
          <div className="rounded-xl border border-border/50 bg-card/60 p-3">
            <div className="text-[9px] uppercase text-muted-foreground">R$/km</div>
            <div className="mt-0.5 text-base font-bold tabular-nums">R$ 2,31</div>
            <div className="text-[9px] text-primary">+ 5,1%</div>
          </div>
        </div>
      </div>
      <MockBottomNav />
    </>
  );
}

function KmMockup() {
  return (
    <>
      <MockHeader title="KM Inteligente" subtitle="Adaptativo · hoje" />
      <div className="space-y-3 px-4 pb-20 pt-4">
        <div className="rounded-xl border border-primary/40 bg-gradient-to-br from-primary/20 to-card p-4 text-center">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-primary">
            R$/km mínimo agora
          </div>
          <div className="mt-1 text-4xl font-extrabold tabular-nums">R$ 2,34</div>
          <div className="mt-1 text-[10px] text-muted-foreground">pra bater sua meta líquida do mês</div>
        </div>

        <div className="rounded-xl border border-border/50 bg-card/60 p-3">
          <div className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Como o Volant calcula
          </div>
          <Row label="Meta líquida restante" value="R$ 3.480,00" />
          <Row label="Custos do veículo (12 dias)" value="R$ 480,00" />
          <Row label="KM que você ainda planeja rodar" value="1.690 km" />
          <div className="mt-2 border-t border-border/40 pt-2">
            <Row label="Mínimo por km" value="R$ 2,34" emphasize />
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

function Row({ label, value, emphasize }: { label: string; value: string; emphasize?: boolean }) {
  return (
    <div className="flex items-center justify-between py-1 text-[11px]">
      <span className={cn("text-muted-foreground", emphasize && "font-semibold text-foreground")}>{label}</span>
      <span className={cn("font-semibold tabular-nums", emphasize && "text-primary")}>{value}</span>
    </div>
  );
}

function MetasMockup() {
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
            <span className="text-[10px] text-muted-foreground">faltam R$ 3.480</span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
            <div className="h-full w-[58%] rounded-full bg-primary" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <DayCard day="Hoje" value="R$ 290" hint="+ 12% vs ontem" highlight />
          <DayCard day="Amanhã" value="R$ 305" hint="ajustada" />
        </div>

        <div className="rounded-xl border border-border/50 bg-card/60 p-3">
          <div className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Próximos 5 dias
          </div>
          {[
            { d: "Seg", v: "R$ 305", w: "75%" },
            { d: "Ter", v: "R$ 310", w: "78%" },
            { d: "Qua", v: "R$ 295", w: "70%" },
            { d: "Qui", v: "R$ 320", w: "82%" },
            { d: "Sex", v: "R$ 330", w: "88%" },
          ].map((it) => (
            <div key={it.d} className="mb-1.5 flex items-center gap-2 text-[10px]">
              <span className="w-7 text-muted-foreground">{it.d}</span>
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full bg-primary/70" style={{ width: it.w }} />
              </div>
              <span className="w-12 text-right font-semibold tabular-nums">{it.v}</span>
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
        "rounded-xl border p-3",
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
  const cards = [
    { name: "Faturamento", icon: <TrendingUp className="h-3.5 w-3.5" /> },
    { name: "Meta do dia", icon: <Target className="h-3.5 w-3.5" /> },
    { name: "KM Inteligente", icon: <Gauge className="h-3.5 w-3.5" /> },
    { name: "Performance", icon: <Sparkles className="h-3.5 w-3.5" /> },
    { name: "Manutenção", icon: <Wrench className="h-3.5 w-3.5" /> },
  ];
  return (
    <>
      <MockHeader title="Organizar cards" subtitle="Arraste para reordenar" />
      <div className="space-y-2.5 px-4 pb-20 pt-4">
        <div className="rounded-xl border border-primary/30 bg-primary/10 p-3 text-[11px]">
          <div className="flex items-center gap-2 font-semibold text-primary">
            <LayoutGrid className="h-3.5 w-3.5" /> Sua tela, do seu jeito
          </div>
          <div className="mt-1 text-[10px] text-muted-foreground">
            Arraste, esconda ou destaque qualquer card da home.
          </div>
        </div>

        {cards.map((c, i) => (
          <div
            key={c.name}
            className={cn(
              "flex items-center gap-3 rounded-xl border bg-card/60 p-3",
              i === 2 ? "border-primary/40 shadow-[0_8px_24px_-8px_hsl(var(--primary)/0.4)]" : "border-border/50",
            )}
          >
            <span className="text-muted-foreground">⋮⋮</span>
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-primary/15 text-primary">
              {c.icon}
            </span>
            <span className="flex-1 text-[12px] font-semibold">{c.name}</span>
            <span className="text-[10px] text-muted-foreground">visível</span>
          </div>
        ))}

        <div className="rounded-xl border border-dashed border-border/60 p-3 text-center text-[10px] text-muted-foreground">
          + adicionar card personalizado
        </div>
      </div>
      <MockBottomNav active="Mais" />
    </>
  );
}
