import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { startOfMonth } from "date-fns";
import {
  Lightbulb,
  GitCompare,
  Route,
  ArrowLeftRight,
  Target,
  Pencil,
  RotateCcw,
  CalendarDays,
  CheckCircle2,
  X,
  Loader2,
  Sparkles,
} from "lucide-react";
import { usePlanningSnapshot } from "@/lib/planningEngine";
import { getCurrentMonthRealData } from "@/lib/smartKm";
import { useData } from "@/context/DataContext";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { computePlanningInsights } from "@/lib/planningInsights";
import { cn } from "@/lib/utils";

const fmtBRL = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
const fmtBRL2 = (v: number) =>
  v.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
const fmtKm = (v: number) =>
  `${v.toLocaleString("pt-BR", { maximumFractionDigits: 0 })} km`;

interface Props {
  onAdjust: () => void;
  onRedo: () => void;
  onPlanNext: () => void;
  onCancelNext: () => void | Promise<void>;
  onReplicate: () => void;
}

export function PainelResumo({ onAdjust, onRedo, onPlanNext, onCancelNext, onReplicate }: Props) {
  const navigate = useNavigate();
  const s = usePlanningSnapshot();
  const { entries, settings, updateSettings, refreshSettings } = useData();
  const { user } = useAuth();
  const [viewLiquida, setViewLiquida] = useState(false);

  // ── Derivações de "plano futuro" / "mês virado" ──────────────────────────
  const now = useMemo(() => new Date(), []);
  const inicioDoMes = useMemo(() => startOfMonth(now), [now]);
  const proxMesData = useMemo(() => new Date(now.getFullYear(), now.getMonth() + 1, 1), [now]);
  const mesAnteriorData = useMemo(() => new Date(now.getFullYear(), now.getMonth() - 1, 1), [now]);
  const proxMes = proxMesData.toLocaleDateString("pt-BR", { month: "long" });
  const mesAtual = now.toLocaleDateString("pt-BR", { month: "long" });
  const mesAnterior = mesAnteriorData.toLocaleDateString("pt-BR", { month: "long" });
  const proxMesMM = String(proxMesData.getMonth() + 1).padStart(2, "0");

  const hasNextPlan = !!settings.nextPlanDates && settings.nextPlanDates.length > 0;

  // Plano "vencido": todas as datas selecionadas estão estritamente antes do mês atual.
  const planExpired = useMemo(() => {
    const dates = settings.planningSelectedDates;
    if (!dates || dates.length === 0) return false;
    const inicioIso = `${inicioDoMes.getFullYear()}-${String(inicioDoMes.getMonth() + 1).padStart(2, "0")}-${String(inicioDoMes.getDate()).padStart(2, "0")}`;
    return dates.every((d) => d < inicioIso);
  }, [settings.planningSelectedDates, inicioDoMes]);

  // Banner de ativação: mostra só quando next_plan_activated_at é do mês atual.
  const showActivatedBanner = useMemo(() => {
    const at = settings.nextPlanActivatedAt ? new Date(settings.nextPlanActivatedAt) : null;
    if (!at) return false;
    return at.getFullYear() === now.getFullYear() && at.getMonth() === now.getMonth();
  }, [settings.nextPlanActivatedAt, now]);

  // Guarda de ativação on-demand (plano vencido + tem next): cobre a janela
  // entre meia-noite local e o cron das 03:00 UTC. Uma única invocação por sessão.
  const activateAttemptedRef = useRef(false);
  const [activating, setActivating] = useState(false);
  useEffect(() => {
    if (!planExpired || !hasNextPlan) return;
    if (activateAttemptedRef.current) return;
    if (!user) return;
    activateAttemptedRef.current = true;
    let cancelled = false;
    (async () => {
      setActivating(true);
      try {
        await supabase.functions.invoke("activate-next-plans", {
          body: { user_id: user.id },
        });
        await refreshSettings();
      } catch (err) {
        console.warn("[activate-next-plans] invoke failed", err);
      } finally {
        if (!cancelled) setActivating(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [planExpired, hasNextPlan, user, refreshSettings]);

  const realData = useMemo(() => getCurrentMonthRealData(entries), [entries]);
  const daysWorkedThisMonth = realData.daysWorkedThisMonth;


  // Dias trabalhados apenas após a criação do plano atual (usado em timeline e insights)
  const planStartDate = s.originalCreatedAt
    ? new Date(s.originalCreatedAt)
    : startOfMonth(new Date());
  const planStartTs = planStartDate.getTime();
  const daysWorkedInPlan = useMemo(() => {
    const workedDates = new Set<string>();
    for (const e of entries) {
      if (e.type !== "earning") continue;
      const d = new Date(e.date);
      if (d.getTime() < planStartTs) continue;
      workedDates.add(`${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`);
    }
    return workedDates.size;
  }, [entries, planStartTs]);

  const planDaysTotal = s.hasOriginalPlan
    ? s.originalDaysCount
    : s.selectedWorkdaysCount;
  const timelinePct =
    planDaysTotal > 0
      ? Math.min(100, (daysWorkedInPlan / planDaysTotal) * 100)
      : 0;
  const planDate = s.originalCreatedAt ? new Date(s.originalCreatedAt) : new Date();
  const mesLabel = planDate
    .toLocaleDateString("pt-BR", { month: "long" })
    .toUpperCase();

  // Detectar se o plano foi refeito (originalCreatedAt > início do mês atual)
  const foiRefeito = s.originalCreatedAt
    ? new Date(s.originalCreatedAt) > inicioDoMes
    : false;

  const rpkAtual = s.currentKm > 0 ? s.currentGross / s.currentKm : 0;
  const rpkPct = s.requiredRpk > 0 ? rpkAtual / s.requiredRpk : 0;
  const rpkColor =
    rpkAtual === 0
      ? "text-muted-foreground"
      : rpkPct >= 1
        ? "text-emerald-300"
        : rpkPct >= 0.8
          ? "text-amber-300"
          : "text-rose-300";

  const isDesgaste = (label: string) => /óleo|oleo|pneu/i.test(label);
  const parcelasTotal = s.fixedCostItems
    .filter((i) => !isDesgaste(i.label))
    .reduce((a, b) => a + b.value, 0);
  const desgasteTotal = s.fixedCostItems
    .filter((i) => isDesgaste(i.label))
    .reduce((a, b) => a + b.value, 0);
  const fixosSoma = parcelasTotal + desgasteTotal;
  const parcelasPct = fixosSoma > 0 ? (parcelasTotal / fixosSoma) * 100 : 0;
  const desgastePct = fixosSoma > 0 ? (desgasteTotal / fixosSoma) * 100 : 0;

  const combustivelItem = s.variableCostItems.find((i) => /combust/i.test(i.label));

  const metaProgressPct =
    s.homeGrossTarget > 0
      ? Math.min(100, (s.currentGross / s.homeGrossTarget) * 100)
      : 0;

  const plannedKmProportional = s.averageKmPerDay * daysWorkedInPlan;
  const totalHoursWorked = useMemo(
    () =>
      entries.reduce((sum, e) => {
        if (e.type !== "earning") return sum;
        if (new Date(e.date).getTime() < planStartTs) return sum;
        return sum + (e.hours ?? 0);
      }, 0),
    [entries, planStartTs],
  );

  const insights = computePlanningInsights({
    rpkAtual,
    rpkMinimo: s.requiredRpk,
    homeRemainingGross: s.homeRemainingGross,
    homeDailyGross: s.homeDailyGross,
    remainingWorkdaysCount: s.remainingWorkdaysCount,
    currentGross: s.currentGross,
    homeGrossTarget: s.homeGrossTarget,
    daysWorkedThisMonth: daysWorkedInPlan,
    selectedWorkdaysCount: s.selectedWorkdaysCount,
    currentKm: s.currentKm,
    plannedKmProportional,
    totalHoursWorked,
  });

  const toneClass: Record<string, string> = {
    good: "border-primary/30 bg-primary/[0.06] text-foreground",
    warn: "border-amber-500/30 bg-amber-500/[0.06] text-foreground",
    bad: "border-rose-500/30 bg-rose-500/[0.06] text-foreground",
    info: "border-border/50 bg-card/50 text-muted-foreground",
  };

  return (
    <div className="mx-auto w-full max-w-md space-y-4 px-4 py-5 pb-28 animate-fade-in">
      {/* ============ 1. Timeline ============ */}
      <div className="flex items-center gap-2.5 px-1 text-[11.5px] text-muted-foreground">
        <span>
          <b className="font-semibold text-foreground/85">{daysWorkedInPlan}</b> de{" "}
          <b className="font-semibold text-foreground/85">{planDaysTotal}</b> dias
        </span>
        <div className="relative h-1 flex-1 overflow-hidden rounded-full bg-border/60">
          <div
            className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-primary/60 to-primary transition-all duration-500"
            style={{ width: `${timelinePct}%` }}
          >
            <span className="absolute right-0 top-1/2 h-1.5 w-1.5 -translate-y-1/2 translate-x-1/2 rounded-full bg-primary shadow-[0_0_6px_hsl(var(--primary))]" />
          </div>
        </div>
        <span>
          <b className="font-semibold text-foreground/85">{s.remainingWorkdaysCount}</b>{" "}
          {s.remainingWorkdaysCount === 1 ? "dia restante" : "dias restantes"}
        </span>
      </div>

      {/* ============ 2. Hero — Objetivos do Dia ============ */}
      <div className="relative overflow-hidden rounded-2xl border border-primary/25 bg-gradient-to-br from-primary/[0.14] via-primary/[0.04] to-transparent p-5 shadow-[0_18px_40px_-20px_hsl(var(--primary)/0.6)]">
        {/* glow radial canto superior direito */}
        <div className="pointer-events-none absolute -right-6 -top-6 h-44 w-44 rounded-full bg-primary/[0.12] blur-2xl" />
        <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-primary/85">
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inset-0 animate-ping rounded-full bg-primary/60" />
            <span className="relative h-1.5 w-1.5 rounded-full bg-primary" />
          </span>
          Objetivos do dia
        </div>

        <div className="mt-3 grid grid-cols-2 divide-x divide-border/40">
          <div className="pr-3">
            <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Meta
            </div>
            <div className="flex items-baseline gap-1">
              <span className="bg-gradient-to-b from-white to-emerald-200 bg-clip-text text-transparent text-lg font-semibold leading-none self-end mb-0.5">
                R$
              </span>
              <span className="bg-gradient-to-b from-white to-emerald-200 bg-clip-text text-transparent text-4xl font-bold tabular-nums leading-none">
                {fmtBRL(viewLiquida ? s.homeDailyNet : s.homeDailyGross)
                  .replace("R$", "")
                  .trim()}
              </span>
            </div>
            <div className="mt-1 text-[11px] text-muted-foreground">pra faturar</div>
          </div>
          <div className="pl-3">
            <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              R$/km mínimo
            </div>
            {s.homeSmartRpkGross > 0 ? (
              <div className="flex items-baseline gap-0.5">
                <span className="bg-gradient-to-b from-white to-emerald-200 bg-clip-text text-transparent text-4xl font-bold tabular-nums leading-none">
                  {fmtBRL2(s.homeSmartRpkGross).replace("R$", "").trim()}
                </span>
                <span className="text-lg font-semibold text-emerald-200/70 leading-none self-end mb-0.5">
                  /km
                </span>
              </div>
            ) : (
              <div className="bg-gradient-to-b from-white to-emerald-200 bg-clip-text text-transparent text-4xl font-bold tabular-nums leading-none">
                —
              </div>
            )}
            <div className="mt-1 text-[11px] text-muted-foreground">por corrida</div>
          </div>
        </div>

        <div className="mt-4 border-t border-primary/15 pt-2.5 text-[11px] leading-snug text-muted-foreground">
          Fixos até você lançar novos registros. Aí recalculam.
        </div>
      </div>

      {/* ============ 3. Insights inteligentes ============ */}
      <div className="mt-7">
        <div className="mb-1.5 flex items-center gap-1.5 px-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          <Lightbulb className="h-3 w-3" /> Insights inteligentes
        </div>
        {insights.length > 0 ? (
          <div className="space-y-2">
            {insights.map((insight, i) => (
              <div
                key={i}
                className={cn(
                  "flex items-start gap-2.5 rounded-2xl border p-3 text-[12.5px] leading-snug",
                  toneClass[insight.tone],
                )}
              >
                <span className="text-base leading-none mt-0.5">{insight.icon}</span>
                <span className="flex-1">{insight.text}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-border/50 bg-card/40 p-4 text-center text-[12px] text-muted-foreground">
            Registre seus primeiros dados pra ver insights do seu plano.
          </div>
        )}
      </div>

      {/* ============ 4. Plano vs Realizado ============ */}
      <div className="mt-7">
        <div className="mb-2 flex items-center gap-1.5 px-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          <GitCompare className="h-3 w-3" /> Plano vs realizado
        </div>

        <div className="grid grid-cols-2 gap-2 items-stretch">
          <div>
            <div className="rounded-2xl border border-dashed border-border/30 bg-muted/[0.06] p-3.5 h-full">
              <div className="mb-3 flex items-center gap-1.5">
                <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/50">
                  Plano de {mesLabel}
                </span>
                {foiRefeito && (
                  <span className="flex-shrink-0 rounded-full border border-amber-500/30 bg-amber-500/10 px-1 py-px text-[7px] font-semibold uppercase tracking-wide text-amber-400 leading-tight">
                    Refeito
                  </span>
                )}
              </div>
              {(() => {
                const planGoal = s.hasOriginalPlan ? s.originalGoal! : s.homeNetTarget;
                const planDays = s.hasOriginalPlan ? s.originalDaysCount : s.selectedWorkdaysCount;
                const planKmDay = s.hasOriginalPlan ? (s.originalAvgKm ?? 0) : s.averageKmPerDay;
                const planRpk = s.hasOriginalPlan && s.originalKmTotal > 0
                  ? (s.originalGoal! + s.consideredCosts) / s.originalKmTotal
                  : s.requiredRpk;
                const dimClass = "text-muted-foreground/60 font-normal";
                return (
                  <>
                    <PlanoLine label="Meta líquida" value={fmtBRL(planGoal)} valueClass={dimClass} />
                    <PlanoLine label="Dias" value={`${planDays}`} valueClass={dimClass} />
                    <PlanoLine
                      label="KM estimado"
                      value={planKmDay > 0 ? fmtKm(planKmDay * planDays) : "—"}
                      valueClass={dimClass}
                    />
                    <PlanoLine
                      label="R$/km alvo"
                      value={planRpk > 0 ? fmtBRL2(planRpk) : "—"}
                      valueClass={dimClass}
                    />
                  </>
                );
              })()}
            </div>
          </div>

          <div>
            <div className="rounded-2xl border border-primary/30 bg-primary/[0.05] p-3.5 h-full">
              <div className="flex items-center gap-1.5 mb-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-primary">
                <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                Até agora
              </div>
              <PlanoLine
                label="Já fiz"
                value={fmtBRL(s.currentGross)}
                valueClass="text-primary font-bold text-[15px]"
              />
              <PlanoLine
                label="Dias rodados"
                value={`${daysWorkedThisMonth}`}
                valueClass="text-foreground font-semibold"
              />
              <PlanoLine
                label="KM rodado"
                value={fmtKm(s.currentKm)}
                valueClass="text-foreground font-semibold"
              />
              <PlanoLine
                label="R$/km atual"
                value={rpkAtual > 0 ? fmtBRL2(rpkAtual) : "—"}
                valueClass={rpkColor}
              />
            </div>
          </div>
        </div>
      </div>

      {/* ============ 5. Meta do Mês · Composição ============ */}
      <div className="mt-7">
        <div className="mb-2 flex items-center gap-1.5 px-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          <Target className="h-3 w-3" /> Meta do mês · composição
        </div>

        {/* Card de meta clicável */}
        <button
          type="button"
          onClick={() => setViewLiquida((v) => !v)}
          className="block w-full rounded-2xl border border-border/60 bg-card/60 p-4 text-left transition-transform active:scale-[0.99]"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
                Meta {viewLiquida ? "líquida" : "bruta"} do mês
                <ArrowLeftRight className="h-3 w-3 opacity-60" />
              </div>
              <div className="mt-1 text-2xl font-bold tabular-nums leading-none text-foreground transition-colors duration-300">
                {fmtBRL(viewLiquida ? s.homeNetTarget : s.homeGrossTarget)}
              </div>
            </div>
            {!viewLiquida && s.homeRemainingGross > 0 && (
              <div className="shrink-0 text-right">
                <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Falta faturar
                </div>
                <div className="mt-0.5 text-[13px] font-bold tabular-nums text-primary">
                  {fmtBRL(s.homeRemainingGross)}
                </div>
              </div>
            )}
          </div>

          <div className="mt-2 text-[11.5px] leading-snug text-muted-foreground">
            {viewLiquida ? (
              <span className="text-primary">
                Seu lucro até agora: {fmtBRL(s.currentNet)}
              </span>
            ) : (
              <>
                {fmtBRL(s.homeNetTarget)} líquida + {fmtBRL(s.consideredCosts)} custos
              </>
            )}
          </div>

          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full bg-primary transition-all duration-500"
              style={{ width: `${metaProgressPct}%` }}
            />
          </div>
        </button>

        {/* Card de custos */}
        {(s.fixedCostItems.length > 0 || combustivelItem) && (
          <div
            className={cn(
              "mt-2 rounded-2xl border border-border/60 bg-card/60 p-4 transition-opacity duration-500",
              viewLiquida && "opacity-30",
            )}
          >
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-muted/40 text-muted-foreground">
                <Route className="h-3.5 w-3.5" />
              </span>
              <div className="min-w-0">
                <div className="text-[13px] font-semibold text-foreground/90">
                  Custos do carro na sua meta
                </div>
                <div className="text-[11px] text-muted-foreground transition-colors duration-300">
                  {viewLiquida
                    ? "zerados nesta visão, esse dinheiro é só seu"
                    : `${fmtBRL(s.consideredCosts)} empurraram seu bruto pra cima`}
                </div>
              </div>
            </div>

            {fixosSoma > 0 && (
              <>
                <div className="mt-3 flex h-2 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full bg-sky-500/70 transition-[width] duration-500"
                    style={{ width: viewLiquida ? "0%" : `${parcelasPct}%` }}
                  />
                  <div
                    className="h-full bg-primary/70 transition-[width] duration-500"
                    style={{ width: viewLiquida ? "0%" : `${desgastePct}%` }}
                  />
                </div>
                <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10.5px] text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-sky-500/70" />
                    Financiamento {Math.round(parcelasPct)}%
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-primary/70" />
                    Desgaste {Math.round(desgastePct)}%
                  </span>
                </div>
              </>
            )}

            {s.fixedCostItems.length > 0 && (
              <ul className="mt-3 space-y-1.5">
                {s.fixedCostItems.map((it, i) => (
                  <li
                    key={`f-${i}`}
                    className="flex items-center justify-between text-[12px] text-muted-foreground"
                  >
                    <span>{it.label}</span>
                    <span className="font-medium tabular-nums text-foreground/85 transition-colors duration-300">
                      {fmtBRL(viewLiquida ? 0 : it.value)}
                    </span>
                  </li>
                ))}
              </ul>
            )}

            {combustivelItem && (
              <div className="mt-3 border-t border-border/40 pt-2.5">
                <div className="flex items-center justify-between text-[12px] text-muted-foreground">
                  <span>{combustivelItem.label}</span>
                  <span className="font-medium tabular-nums text-foreground/70">
                    {fmtBRL(combustivelItem.value)}
                  </span>
                </div>
                <div className="mt-0.5 text-[10.5px] text-muted-foreground/80">
                  fora da meta, só referência
                </div>
              </div>
            )}

            <button
              type="button"
              onClick={() =>
                navigate("/ajustes/veiculos/custos", {
                  state: { returnTo: "/ajustes/planejamento" },
                })
              }
              className="mt-3 inline-flex items-center gap-1.5 text-[11.5px] font-semibold text-primary hover:underline"
            >
              <Pencil className="h-3 w-3" /> Editar custos
            </button>
          </div>
        )}
      </div>

      {/* ============ 6. Botões ============ */}
      <div className="grid grid-cols-2 gap-2.5 pt-1 mt-7">
        <button
          type="button"
          onClick={onAdjust}
          className="flex items-center justify-center gap-2 rounded-xl border border-border/60 bg-card/60 px-3 py-3 text-[13px] font-semibold transition-all active:scale-[0.98] hover:bg-muted/40"
        >
          <Pencil className="h-4 w-4" /> Ajustar
        </button>
        <button
          type="button"
          onClick={onRedo}
          className="flex items-center justify-center gap-2 rounded-xl border border-border/60 bg-card/60 px-3 py-3 text-[13px] font-semibold transition-all active:scale-[0.98] hover:bg-muted/40"
        >
          <RotateCcw className="h-4 w-4" /> Refazer
        </button>
      </div>

      {/* ============ 7. Nota rodapé ============ */}
      <div className="px-4 text-center text-[11px] text-muted-foreground leading-snug space-y-1">
        <p>
          <span className="font-semibold text-foreground/70">Ajustar</span>{" "}
          muda só o que você tocar e guarda seu plano original.
        </p>
        <p>
          <span className="font-semibold text-foreground/70">Refazer</span>{" "}
          começa um plano novo e substitui o atual.
        </p>
      </div>
    </div>
  );
}

function PlanoLine({
  label,
  value,
  valueClass,
}: {
  label: string;
  value: string;
  valueClass?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-2 py-1 first:pt-0 last:pb-0">
      <span className="text-[11.5px] text-muted-foreground">{label}</span>
      <span
        className={cn(
          "tabular-nums text-[12px] font-semibold text-foreground/90",
          valueClass,
        )}
      >
        {value}
      </span>
    </div>
  );
}
