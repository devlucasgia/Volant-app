import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Check,
  ChevronRight,
  Flag,
  Target,
  CalendarDays,
  Car as CarIcon,
  Route,
  Gauge,
  AlertTriangle,
  Loader2,
  Pencil,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useData } from "@/context/DataContext";
import { useUI } from "@/context/UIContext";
import { NumberField } from "@/components/NumberField";
import { Button } from "@/components/ui/button";
import {
  applyShortcut,
  computeFixedMonthlyCosts,
  computeVariableMonthlyCosts,
  computePlan,
  DEFAULT_AVG_KM_PER_DAY,
  ShortcutKey,
  toIsoDate,
  startOfDay,
} from "@/lib/planejamento";
import { getCurrentMonthRealData } from "@/lib/smartKm";
import type { GoalType } from "@/types";
import { CalendarGrid } from "./CalendarGrid";
import { useDraftPersistence } from "@/hooks/useDraftPersistence";

const PLANNING_DRAFT_KEY = "volant_planning_draft_v1";
interface PlanningDraftSnapshot {
  step: number;
  draft: Draft;
}

interface Props {
  onDone: () => void;
  onCancel: () => void;
  /** Quando true, pré-popula o draft com os valores atuais (ação "Ajustar"). */
  prefill?: boolean;
  /** Quando definido, abre o fluxo nessa etapa (1..6). */
  initialStep?: number;
  /** Quando definido, sobrescreve o draft inicial (usado para restaurar contexto). */
  initialDraft?: Partial<Draft>;
  /**
   * Modo de edição parcial: limita o fluxo aos passos listados e grava só os
   * campos relacionados (sem alterar planningStatus nem campos não-editados).
   * Quando undefined → fluxo completo normal.
   */
  returnTo?: string;
  editMode?: { steps: number[] };
  /** Sinaliza fluxo "Refazer" — habilita a trava de meta igual no passo 1. */
  isRedo?: boolean;
  /**
   * Quando definido, é o "modo next": calendário/atalhos passam a operar no mês alvo
   * e o salvamento grava apenas no slot `next_plan_*` (sem tocar no plano ativo).
   */
  targetMonth?: Date;
}

interface Draft {
  goalType: GoalType;
  monthlyGoal: number;
  selectedDates: string[];
  avgKmPerDay: number;
}

const TOTAL_STEPS = 6;
const KM_QUICK_PICKS = [150, 200, 250, 300];

const fmtBRL = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
const fmtRpk = (v: number) =>
  `R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const fmtKm = (v: number) =>
  `${v.toLocaleString("pt-BR", { maximumFractionDigits: 0 })} km`;

export function GuidedFlow({
  onDone,
  onCancel,
  prefill = false,
  initialStep,
  initialDraft,
  editMode,
  isRedo = false,
  targetMonth,
}: Props) {
  const isNext = targetMonth != null;
  const navigate = useNavigate();
  const { settings, cars, updateSettings, entries } = useData();
  const { useHideChrome } = useUI();
  useHideChrome();
  const activeCar = useMemo(
    () => cars.find((c) => c.is_active) || cars[0] || null,
    [cars],
  );

  const isEdit = !!editMode;
  // Fluxo novo: a meta é sempre líquida (sobra desejada). Passo 1 (escolha
  // bruto/líquido) só aparece em editMode legado que peça explicitamente.
  const stepsList =
    editMode?.steps ?? Array.from({ length: TOTAL_STEPS - 1 }, (_, i) => i + 2);

  // ── Persistência de rascunho (apenas para o fluxo "fresh" — sem editMode/initialStep/initialDraft) ──
  // Permite voltar exatamente para o mesmo passo + valores depois de um reload
  // ou volta-de-outro-app, sem perder progresso do wizard.
  const draftPersistenceEnabled = !isEdit && !isNext && initialStep == null && !initialDraft;
  // Hidratação síncrona (no primeiro render) — evita "piscar" passo 1 antes de pular para o salvo.
  const hydratedSnapshot = useRef<PlanningDraftSnapshot | null>(null);
  if (draftPersistenceEnabled && hydratedSnapshot.current === null) {
    try {
      const raw = typeof window !== "undefined" ? window.sessionStorage.getItem(PLANNING_DRAFT_KEY) : null;
      hydratedSnapshot.current = raw ? (JSON.parse(raw) as PlanningDraftSnapshot) : null;
    } catch { hydratedSnapshot.current = null; }
  }

  const [stepIdx, setStepIdx] = useState(() => {
    if (initialStep != null) {
      const i = stepsList.indexOf(initialStep);
      return i >= 0 ? i : 0;
    }
    const savedStep = hydratedSnapshot.current?.step;
    if (typeof savedStep === "number") {
      const i = stepsList.indexOf(savedStep);
      if (i >= 0) return i;
    }
    return 0;
  });
  const step = stepsList[stepIdx];
  const isLast = stepIdx === stepsList.length - 1;

  const [draft, setDraft] = useState<Draft>(() => {
    // Modo next: sempre parte em branco (igual ao fresh). Não herda do slot ativo.
    const base: Draft = isNext
      ? {
          goalType: "liquido",
          monthlyGoal: 0,
          selectedDates: [],
          avgKmPerDay: DEFAULT_AVG_KM_PER_DAY,
          ...(initialDraft ?? {}),
        }
      : {
          // Novo modelo sempre líquido. Edit-mode legado pode sobrescrever via initialDraft.
          goalType: prefill || isEdit ? settings.goalType ?? "liquido" : "liquido",
          monthlyGoal: prefill || isEdit ? settings.monthlyGoal : 0,
          selectedDates:
            (prefill || isEdit) && settings.planningSelectedDates
              ? settings.planningSelectedDates
              : [],
          avgKmPerDay:
            (prefill || isEdit) && settings.planningAvgKmPerDay && settings.planningAvgKmPerDay > 0
              ? settings.planningAvgKmPerDay
              : DEFAULT_AVG_KM_PER_DAY,
          ...(initialDraft ?? {}),
        };
    const saved = hydratedSnapshot.current?.draft;
    return saved ? { ...base, ...saved } : base;
  });
  const [saving, setSaving] = useState(false);

  // Persiste step + draft (debounce) enquanto o wizard está aberto.
  const snapshot = useMemo<PlanningDraftSnapshot>(() => ({ step, draft }), [step, draft]);
  const planningDraft = useDraftPersistence<PlanningDraftSnapshot>(
    PLANNING_DRAFT_KEY,
    snapshot,
    { enabled: draftPersistenceEnabled, storage: "session" },
  );
  // Rascunho é restaurado silenciosamente no mount (sem toast).

  // Custos consideram óleo e pneus prorrateados pelo KM planejado do draft.
  const draftPlannedKm = useMemo(
    () => (draft.avgKmPerDay > 0 ? draft.avgKmPerDay * draft.selectedDates.length : 0),
    [draft.avgKmPerDay, draft.selectedDates.length],
  );
  const costs = useMemo(
    () => computeFixedMonthlyCosts(activeCar, draftPlannedKm),
    [activeCar, draftPlannedKm],
  );
  const variable = useMemo(
    () => computeVariableMonthlyCosts(activeCar, draft.avgKmPerDay, draft.selectedDates.length),
    [activeCar, draft.avgKmPerDay, draft.selectedDates.length],
  );

  // No modelo novo, a meta cadastrada representa o LÍQUIDO desejado (sobra).
  // Para o cálculo do faturamento necessário (BRUTO), somamos fixos + variáveis.
  const plan = useMemo(
    () =>
      computePlan({
        monthlyGoal: draft.monthlyGoal,
        goalType: draft.goalType,
        diasSelecionados: draft.selectedDates.length,
        custosFixos: costs.total,
        avgKmPerDay: draft.avgKmPerDay,
      }),
    [draft, costs.total, variable.total],
  );


  const canNext = (() => {
    if (step === 1) return true;
    if (step === 2) {
      if (draft.monthlyGoal <= 0) return false;
      if (isRedo && draft.monthlyGoal === settings.monthlyGoal) return false;
      return true;
    }
    if (step === 3) return draft.selectedDates.length > 0;
    if (step === 4) return draft.avgKmPerDay > 0;
    if (step === 5) return true;
    return true;
  })();

  const back = () => {
    if (stepIdx === 0) {
      planningDraft.clear();
      onCancel();
    } else setStepIdx((s) => s - 1);
  };

  const finish = async () => {
    setSaving(true);
    try {
      const patch: Parameters<typeof updateSettings>[0] = {};

      if (isNext) {
        // Slot do próximo mês: grava APENAS em next_plan_*. Não toca no plano ativo
        // nem no snapshot original. Entra em vigor pela edge function ao virar o mês.
        patch.nextPlanGoal = draft.monthlyGoal;
        patch.nextPlanGoalType = draft.goalType;
        patch.nextPlanAvgKm = draft.avgKmPerDay;
        patch.nextPlanDates = draft.selectedDates;
        patch.nextPlanCreatedAt = new Date().toISOString();
      } else if (isEdit) {
        if (stepsList.includes(1) || stepsList.includes(2)) {
          patch.monthlyGoal = draft.monthlyGoal;
          // Modelo atual: meta cadastrada representa SEMPRE o líquido desejado.
          patch.goalType = stepsList.includes(1) ? draft.goalType : "liquido";
        }
        if (stepsList.includes(3)) {
          patch.planningSelectedDates = draft.selectedDates;
          patch.workingDaysPerMonth = draft.selectedDates.length;
        }
        if (stepsList.includes(4)) {
          patch.planningAvgKmPerDay = draft.avgKmPerDay;
        }
        // Após qualquer edição que afete o KM planejado, sincroniza
        // kmPlannedMonth para manter telas legadas consistentes.
        if (stepsList.includes(3) || stepsList.includes(4)) {
          if (plan.plannedKmTotal > 0) {
            patch.kmPlannedMonth = Math.round(plan.plannedKmTotal);
          }
        }
      } else {
        patch.planningStatus = "configured";
        patch.planningSelectedDates = draft.selectedDates;
        patch.planningAvgKmPerDay = draft.avgKmPerDay;
        patch.monthlyGoal = draft.monthlyGoal;
        patch.goalType = draft.goalType;
        patch.workingDaysPerMonth = draft.selectedDates.length;
        // Sempre atualiza kmPlannedMonth — o Planejamento Inteligente é a
        // fonte principal do plano e telas legadas devem refletir o novo valor.
        if (plan.plannedKmTotal > 0) {
          patch.kmPlannedMonth = Math.round(plan.plannedKmTotal);
        }
        // Snapshot do plano original (Refazer/fresh) — não é tocado por Ajustes.
        patch.planningOriginalGoal = draft.monthlyGoal;
        patch.planningOriginalGoalType = draft.goalType;
        patch.planningOriginalAvgKm = draft.avgKmPerDay;
        patch.planningOriginalDates = draft.selectedDates;
        patch.planningOriginalCreatedAt = new Date().toISOString();
      }

      await updateSettings(patch);
      planningDraft.clear();
      toast.success(
        isNext
          ? "Plano do próximo mês salvo"
          : isEdit
            ? "Alteração salva"
            : "Planejamento concluído",
      );
      onDone();
    } catch {
      toast.error("Não foi possível salvar");
    } finally {
      setSaving(false);
    }
  };

  // ── Dados reais do mês atual (usados no Step6 quando há Refazer em mês em andamento) ──
  // Usa o mesmo helper do PainelResumo, com bucketing em fuso local.
  const realMes = useMemo(() => getCurrentMonthRealData(entries), [entries]);

  // ── Texto contextual do botão final ──
  const hoje = new Date();
  const mesAtualNome = hoje.toLocaleDateString("pt-BR", { month: "long" });
  const mesAlvoNome = targetMonth
    ? targetMonth.toLocaleDateString("pt-BR", { month: "long" })
    : "";
  const originalCreatedAt = settings.planningOriginalCreatedAt
    ? new Date(settings.planningOriginalCreatedAt)
    : null;
  const isPrimeiroPlano =
    !originalCreatedAt &&
    (!settings.planningStatus || settings.planningStatus === "not_configured");
  const isMesNovo = originalCreatedAt
    ? originalCreatedAt.getMonth() !== hoje.getMonth() ||
      originalCreatedAt.getFullYear() !== hoje.getFullYear()
    : false;
  const botaoTexto = isNext
    ? `Salvar plano de ${mesAlvoNome}`
    : isEdit
      ? "Salvar alteração"
      : isPrimeiroPlano
        ? "Criar meu plano"
        : isMesNovo
          ? `Planejar ${mesAtualNome}`
          : "Refazer planejamento";


  return (
    <div className="flex min-h-[100dvh] flex-col">
      <header className="sticky top-0 z-20 border-b border-border bg-background/85 backdrop-blur-lg">
        <div className="flex items-center gap-3 px-3 py-3">
          <button
            type="button"
            onClick={back}
            aria-label="Voltar"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-card transition-colors hover:bg-muted/50 active:scale-[0.96]"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div className="min-w-0 flex-1">
            {stepsList.length > 1 && (
              <>
                <div className="flex items-center gap-1.5">
                  {stepsList.map((_, i) => (
                    <span
                      key={i}
                      className={cn(
                        "h-1 flex-1 rounded-full transition-all duration-300",
                        i < stepIdx
                          ? "bg-primary"
                          : i === stepIdx
                            ? "bg-primary/90 shadow-[0_0_8px_-2px_hsl(var(--primary)/0.7)]"
                            : "bg-border/60",
                      )}
                    />
                  ))}
                </div>
                <p className="mt-1 text-[10.5px] font-medium uppercase tracking-wider text-muted-foreground/80">
                  {isEdit ? "Ajustando" : "Passo"} {stepIdx + 1} de {stepsList.length}
                </p>
              </>
            )}
            {stepsList.length === 1 && (
              <p className="text-[10.5px] font-medium uppercase tracking-wider text-muted-foreground/80">
                Ajustando planejamento
              </p>
            )}
          </div>
        </div>
      </header>

      <div
        className="mx-auto flex w-full max-w-md min-h-0 flex-1 flex-col justify-start px-4 pt-6 pb-20"
        key={`${step}-${stepIdx}`}
      >
        {step === 1 && <Step1 draft={draft} setDraft={setDraft} />}
        {step === 2 && <Step2 draft={draft} setDraft={setDraft} isRedo={isRedo} currentGoal={settings.monthlyGoal} />}
        {step === 3 && <Step3 draft={draft} setDraft={setDraft} reference={targetMonth} />}
        {step === 4 && <Step4 draft={draft} setDraft={setDraft} plan={plan} />}
        {step === 5 && (
          <Step5
            car={activeCar}
            costsTotal={costs.total}
            costsItems={costs.items}
            variableTotal={variable.total}
            variableItems={variable.items}
            onAddCar={() =>
              navigate("/ajustes/veiculos/carros", {
                state: {
                  returnTo: "/ajustes/planejamento",
                  planningResume: { variant: prefill ? "prefill" : "fresh", step: 5, draft },
                },
              })
            }
            onEditCosts={() =>
              navigate("/ajustes/veiculos/custos", {
                state: {
                  returnTo: "/ajustes/planejamento",
                  planningResume: { variant: prefill ? "prefill" : "fresh", step: 5, draft },
                },
              })
            }
          />
        )}
        {step === 6 && (
          <Step6
            draft={draft}
            plan={plan}
            costsItems={costs.items}
            variableItems={variable.items}
            variableTotal={variable.total}
            fixedTotal={costs.total}
            currentGross={realMes.grossThisMonth}
            currentKm={realMes.kmThisMonth}
            daysWorked={realMes.daysWorkedThisMonth}
            isRefazer={!isNext && !isEdit && settings.planningOriginalCreatedAt != null}
          />
        )}
      </div>

      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-background/95 backdrop-blur-lg">
        <div className="mx-auto w-full max-w-md px-4 py-2.5">
          {!isLast ? (
            <Button
              size="lg"
              disabled={!canNext}
              onClick={() => setStepIdx((s) => s + 1)}
              className="w-full"
            >
              Continuar <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          ) : (
            <Button size="lg" disabled={saving || !canNext} onClick={finish} className="w-full">
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Salvando...
                </>
              ) : (
                <>
                  <Check className="mr-2 h-4 w-4" />{" "}
                  {botaoTexto}
                </>
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ───────────────── Steps ───────────────── */

function StepHeader({
  icon: Icon,
  title,
  subtitle,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="mb-4 space-y-2">
      <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary ring-1 ring-inset ring-primary/20">
        <Icon className="h-5 w-5" />
      </span>
      <h2 className="text-[20px] font-bold leading-tight tracking-tight text-foreground">
        {title}
      </h2>
      <p className="text-[13px] leading-snug text-muted-foreground">{subtitle}</p>
    </div>
  );
}

function Step1({ draft, setDraft }: { draft: Draft; setDraft: (u: (d: Draft) => Draft) => void }) {
  return (
    <div>
      <StepHeader
        icon={Flag}
        title="Qual sua meta principal?"
        subtitle="Você pode alterar a visualização da Home entre bruto e líquido sempre que quiser."
      />
      <div className="space-y-2.5">
        {([
          { key: "liquido" as const, title: "Lucro líquido", desc: "Quanto quero que SOBRE depois dos gastos. Recomendado." },
          { key: "bruto" as const, title: "Ganho bruto", desc: "Quanto quero faturar no total, antes dos gastos." },
        ]).map((opt) => {
          const active = draft.goalType === opt.key;
          return (
            <button
              key={opt.key}
              type="button"
              onClick={() => setDraft((d) => ({ ...d, goalType: opt.key }))}
              className={cn(
                "flex w-full items-start gap-3 rounded-2xl border p-4 text-left transition-all active:scale-[0.985]",
                active
                  ? "border-primary/55 bg-primary/[0.08] shadow-[0_0_0_1px_hsl(var(--primary)/0.14),0_8px_22px_-14px_hsl(var(--primary)/0.55)]"
                  : "border-border/60 bg-card/60 hover:bg-muted/30",
              )}
            >
              <span
                className={cn(
                  "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-all",
                  active ? "border-primary bg-primary" : "border-border",
                )}
              >
                {active && <Check className="h-3 w-3 text-primary-foreground" />}
              </span>
              <div className="min-w-0 flex-1">
                <div className="text-[15px] font-semibold leading-tight">{opt.title}</div>
                <p className="mt-0.5 text-[12px] leading-snug text-muted-foreground">{opt.desc}</p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function Step2({
  draft,
  setDraft,
  isRedo,
  currentGoal,
}: {
  draft: Draft;
  setDraft: (u: (d: Draft) => Draft) => void;
  isRedo: boolean;
  currentGoal: number;
}) {
  const isLiquido = draft.goalType === "liquido";
  const metaIgual = isRedo && draft.monthlyGoal > 0 && draft.monthlyGoal === currentGoal;
  return (
    <div>
      <StepHeader
        icon={Target}
        title={isLiquido ? "Quanto quer de lucro líquido?" : "Quanto quer faturar?"}
        subtitle={
          isLiquido
            ? "Quanto você quer tirar de salário esse mês? A gente calcula o faturamento bruto necessário."
            : "Quanto você quer faturar no total esse mês, antes de descontar qualquer custo."
        }
      />
      <div className="rounded-2xl border border-border/60 bg-card/60 p-4">
        <NumberField
          currency
          value={draft.monthlyGoal || null}
          onChange={(v) => setDraft((d) => ({ ...d, monthlyGoal: v ?? 0 }))}
          autoFocus
          inputMode="decimal"
        />
        <p className="mt-2 text-[11px] font-medium text-emerald-400/80">
          {draft.monthlyGoal > 0
            ? `✓ ${isLiquido ? "Lucro líquido" : "Faturamento bruto"} de ${fmtBRL(draft.monthlyGoal)}/mês`
            : ""}
        </p>
      </div>
      {metaIgual && (
        <div className="mt-3 rounded-xl border border-amber-500/30 bg-amber-500/[0.07] p-3 text-[12px] leading-snug text-amber-300">
          Essa já é a meta do seu plano atual. Pra mudar só os dias ou o KM, use o Ajustar. Pra refazer do zero, defina uma meta diferente.
        </div>
      )}
    </div>
  );
}

function Step3({ draft, setDraft }: { draft: Draft; setDraft: (u: (d: Draft) => Draft) => void }) {
  const shortcuts: { key: ShortcutKey; label: string }[] = [
    { key: "all", label: "Todos os dias" },
    { key: "weekdays", label: "Seg a sex" },
    { key: "weekdaysWithSat", label: "Seg a sáb" },
    { key: "clear", label: "Limpar" },
  ];

  const toggle = (iso: string) => {
    setDraft((d) => {
      const has = d.selectedDates.includes(iso);
      return {
        ...d,
        selectedDates: has ? d.selectedDates.filter((x) => x !== iso) : [...d.selectedDates, iso].sort(),
      };
    });
  };

  return (
    <div>
      <StepHeader
        icon={CalendarDays}
        title="Em quais dias você vai trabalhar?"
        subtitle="Toque nos dias para selecionar. Dias passados ficam indisponíveis."
      />
      <div className="rounded-2xl border border-border/60 bg-card/60 p-4">
        <CalendarGrid selected={draft.selectedDates} onToggle={toggle} />
        <div className="mt-4 flex flex-wrap gap-1.5">
          {shortcuts.map((s) => (
            <button
              key={s.key}
              type="button"
              onClick={() => setDraft((d) => ({ ...d, selectedDates: applyShortcut(s.key) }))}
              className="rounded-full border border-border/60 bg-muted/30 px-3 py-1.5 text-[11px] font-medium text-foreground/85 transition-all active:scale-[0.97] hover:bg-muted/50"
            >
              {s.label}
            </button>
          ))}
        </div>
        <div className="mt-3 rounded-xl border border-border/40 bg-muted/20 px-3 py-2.5">
          <p className="text-[11.5px] leading-snug text-muted-foreground">
            Os dias <span className="font-medium text-foreground/80">não marcados</span> são tratados como folga. Você pode trabalhar neles se quiser, mas não entram na meta diária.
          </p>
        </div>
        <div className="mt-3 flex items-center justify-between border-t border-border/40 pt-3 text-[12px]">
          <span className="text-muted-foreground">Dias selecionados</span>
          <span className="font-semibold tabular-nums text-foreground">
            {draft.selectedDates.length}
          </span>
        </div>
      </div>
    </div>
  );
}

function Step4({
  draft,
  setDraft,
  plan,
}: {
  draft: Draft;
  setDraft: (u: (d: Draft) => Draft) => void;
  plan: ReturnType<typeof computePlan>;
}) {
  const dias = draft.selectedDates.length;

  return (
    <div>
      <StepHeader
        icon={Route}
        title="Quantos km você costuma rodar por dia?"
        subtitle="Use uma média realista dos dias em que você trabalha. O Volant usa esse número para calcular quanto cada KM precisa render para sua meta fazer sentido."
      />
      <div className="space-y-2.5">
        <div className="rounded-2xl border border-border/60 bg-card/60 p-4">
          <div className="mb-2 text-[12px] font-semibold text-foreground/90">
            KM médio por dia trabalhado
          </div>
          <NumberField
            value={draft.avgKmPerDay || null}
            onChange={(v) => setDraft((d) => ({ ...d, avgKmPerDay: v ?? 0 }))}
            inputMode="decimal"
            placeholder="Ex: 200"
          />
          <div className="mt-3 flex flex-wrap gap-1.5">
            {KM_QUICK_PICKS.map((km) => {
              const active = draft.avgKmPerDay === km;
              return (
                <button
                  key={km}
                  type="button"
                  onClick={() => setDraft((d) => ({ ...d, avgKmPerDay: km }))}
                  className={cn(
                    "rounded-full border px-3 py-1.5 text-[11.5px] font-medium transition-all active:scale-[0.97]",
                    active
                      ? "border-primary/55 bg-primary/15 text-foreground"
                      : "border-border/60 bg-muted/30 text-foreground/85 hover:bg-muted/50",
                  )}
                >
                  {km} km/dia
                </button>
              );
            })}
          </div>
          <p className="mt-3 text-[11px] leading-snug text-muted-foreground">
            Não precisa ser perfeito. Você pode ajustar esse número depois se sua rotina mudar.
          </p>
        </div>

        {/* Preview educativo */}
        <div className="rounded-2xl border border-primary/25 bg-gradient-to-br from-primary/[0.08] via-primary/[0.03] to-transparent p-4">
          <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-primary/90">
            <Route className="h-3 w-3" /> Com sua rotina planejada
          </div>
          <ul className="mt-2 space-y-1.5 text-[12.5px] leading-snug">
            <li className="flex items-center justify-between gap-2">
              <span className="text-muted-foreground">Dias selecionados</span>
              <span className="font-semibold tabular-nums text-foreground/95">
                {dias > 0 ? `${dias} ${dias === 1 ? "dia" : "dias"}` : "—"}
              </span>
            </li>
            <li className="flex items-center justify-between gap-2">
              <span className="text-muted-foreground">KM planejado no período</span>
              <span className="font-semibold tabular-nums text-foreground/95">
                {plan.plannedKmTotal > 0 ? fmtKm(plan.plannedKmTotal) : "—"}
              </span>
            </li>
            <li className="flex items-center justify-between gap-2">
              <span className="text-muted-foreground">Faturamento necessário</span>
              <span className="font-semibold tabular-nums text-blue-400">
                {plan.faturamentoNecessario > 0 ? fmtBRL(plan.faturamentoNecessario) : "—"}
              </span>
            </li>
            <li className="mt-1 flex items-center justify-between gap-2 border-t border-border/40 pt-2.5">
              <span className="text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
                R$/KM mínimo necessário
              </span>
              <span
                className={cn(
                  "text-[18px] font-bold tabular-nums",
                  plan.requiredRpk != null && plan.requiredRpk > 5
                    ? "text-rose-400"
                    : plan.requiredRpk != null && plan.requiredRpk > 3.5
                      ? "text-amber-400"
                      : "text-primary",
                )}
              >
                {plan.requiredRpk != null ? `${fmtRpk(plan.requiredRpk)}/km` : "—"}
              </span>
            </li>
          </ul>
          <p className="mt-2.5 border-t border-border/40 pt-2 text-[11px] leading-snug text-muted-foreground">
            Quanto mais km você consegue rodar, menor tende a ser o R$/KM necessário. Quanto menos km, maior precisa ser o rendimento por km.
          </p>
        </div>

        {plan.requiredRpk != null && plan.requiredRpk > 3.5 && (
          <div
            className={cn(
              "rounded-2xl border p-3 text-[12px] leading-snug",
              plan.requiredRpk > 5
                ? "border-rose-500/30 bg-rose-500/[0.07] text-rose-300"
                : "border-amber-500/30 bg-amber-500/[0.07] text-amber-300",
            )}
          >
            {plan.requiredRpk > 5
              ? `⚠️ R$ ${plan.requiredRpk.toFixed(2)}/km é muito difícil de atingir. Considere aumentar os dias de trabalho ou reduzir a meta para um plano mais realista.`
              : `💡 R$ ${plan.requiredRpk.toFixed(2)}/km é exigente. É possível, mas vai exigir corridas bem selecionadas e consistência.`}
          </div>
        )}
      </div>
    </div>
  );
}

function Step5({
  car,
  costsTotal,
  costsItems,
  variableTotal,
  variableItems,
  onAddCar,
  onEditCosts,
}: {
  car: ReturnType<typeof useData>["cars"][number] | null;
  costsTotal: number;
  costsItems: { label: string; value: number }[];
  variableTotal: number;
  variableItems: { label: string; value: number }[];
  onAddCar: () => void;
  onEditCosts: () => void;
}) {
  if (!car) {
    return (
      <div>
        <StepHeader
          icon={CarIcon}
          title="Você tem um veículo cadastrado?"
          subtitle="O veículo melhora o planejamento porque consideramos seus custos fixos. Variáveis (combustível/alimentação) viram só referência."
        />
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/[0.06] p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
            <div className="space-y-2">
              <p className="text-[13px] leading-snug text-foreground/90">
                Sem veículo cadastrado, calculamos seu planejamento sem custos. Os números ficam menos precisos.
              </p>
              <button
                type="button"
                onClick={onAddCar}
                className="text-[12.5px] font-semibold text-primary hover:underline"
              >
                Cadastrar veículo na Central de Veículos →
              </button>
            </div>
          </div>
        </div>
        <p className="mt-3 text-center text-[11.5px] text-muted-foreground">
          Você pode continuar sem veículo. Toque em "Continuar" abaixo.
        </p>
      </div>
    );
  }

  const carName = `${car.brand ?? ""} ${car.model ?? ""}`.trim() || "Veículo";

  // Split fixos: financiamento (parcelas/seguro/etc) vs desgaste (óleo/pneus)
  const isDesgaste = (label: string) => /óleo|oleo|pneu/i.test(label);
  const parcelasTotal = costsItems
    .filter((i) => !isDesgaste(i.label))
    .reduce((a, i) => a + i.value, 0);
  const desgasteTotal = costsItems
    .filter((i) => isDesgaste(i.label))
    .reduce((a, i) => a + i.value, 0);
  const fixosSoma = parcelasTotal + desgasteTotal;
  const parcelasPct = fixosSoma > 0 ? (parcelasTotal / fixosSoma) * 100 : 0;
  const desgastePct = fixosSoma > 0 ? (desgasteTotal / fixosSoma) * 100 : 0;

  const combustivelItem = variableItems.find((i) => /combust/i.test(i.label));
  const outrosVariaveis = variableItems.filter((i) => !/combust/i.test(i.label));

  return (
    <div>
      <StepHeader
        icon={CarIcon}
        title="Custos considerados"
        subtitle="Custos fixos entram na meta. Variáveis ficam apenas como referência."
      />

      {/* Chip de destaque do veículo */}
      <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/[0.08] px-3 py-1.5">
        <CarIcon className="h-3.5 w-3.5 text-primary" />
        <span className="text-[12.5px] font-semibold text-foreground/95">{carName}</span>
      </div>

      {costsItems.length === 0 && !combustivelItem && outrosVariaveis.length === 0 ? (
        <div className="rounded-2xl border border-amber-500/25 bg-amber-500/[0.05] p-4">
          <p className="text-[12.5px] leading-snug text-foreground/85">
            Nenhum custo cadastrado pra esse veículo ainda.
          </p>
          <button
            type="button"
            onClick={onEditCosts}
            className="mt-1 text-[12.5px] font-semibold text-primary hover:underline"
          >
            Cadastrar custos do veículo →
          </button>
        </div>
      ) : (
        <div className="rounded-2xl border border-border/60 bg-card/60 p-4">
          {/* Header igual ao card "Custos do carro na sua meta" do PainelResumo */}
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-muted/40 text-muted-foreground">
              <Route className="h-3.5 w-3.5" />
            </span>
            <div className="min-w-0">
              <div className="text-[13px] font-semibold text-foreground/90">
                Custos do carro na meta
              </div>
              <div className="text-[11px] text-muted-foreground">
                {costsTotal > 0
                  ? `${fmtBRL(costsTotal)} empurram seu bruto pra cima`
                  : "Sem custos fixos cadastrados"}
              </div>
            </div>
          </div>

          {/* Barra empilhada Financiamento + Desgaste */}
          {fixosSoma > 0 && (
            <>
              <div className="mt-3 flex h-2 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full bg-sky-500/70"
                  style={{ width: `${parcelasPct}%` }}
                />
                <div
                  className="h-full bg-primary/70"
                  style={{ width: `${desgastePct}%` }}
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

          {costsItems.length > 0 ? (
            <ul className="mt-3 space-y-1.5">
              {costsItems.map((it, i) => (
                <li
                  key={`f-${i}`}
                  className="flex items-center justify-between text-[12px] text-muted-foreground"
                >
                  <span>{it.label}</span>
                  <span className="font-medium tabular-nums text-foreground/85">
                    {fmtBRL(it.value)}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <div className="mt-3 rounded-xl border border-amber-500/25 bg-amber-500/[0.05] p-3">
              <p className="text-[12px] leading-snug text-foreground/85">
                Nenhum custo fixo cadastrado.
              </p>
              <button
                type="button"
                onClick={onEditCosts}
                className="mt-1 text-[12px] font-semibold text-primary hover:underline"
              >
                Cadastrar custos fixos →
              </button>
            </div>
          )}

          {(combustivelItem || outrosVariaveis.length > 0) && (
            <div className="mt-3 border-t border-border/40 pt-2.5">
              {combustivelItem && (
                <div className="flex items-center justify-between text-[12px] text-muted-foreground">
                  <span>{combustivelItem.label}</span>
                  <span className="font-medium tabular-nums text-foreground/70">
                    {fmtBRL(combustivelItem.value)}
                  </span>
                </div>
              )}
              {outrosVariaveis.map((it, i) => (
                <div
                  key={`v-${i}`}
                  className="flex items-center justify-between text-[12px] text-muted-foreground"
                >
                  <span>{it.label}</span>
                  <span className="font-medium tabular-nums text-foreground/70">
                    {fmtBRL(it.value)}
                  </span>
                </div>
              ))}
              <div className="mt-0.5 text-[10.5px] text-muted-foreground/80">
                fora da meta, só referência
              </div>
            </div>
          )}
        </div>
      )}

      <button
        type="button"
        onClick={onEditCosts}
        className="mt-3 inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-primary hover:underline"
      >
        <Pencil className="h-3.5 w-3.5" /> Editar na Central de Veículos
      </button>
    </div>
  );
}

function Step6({
  draft,
  plan,
  variableTotal,
  fixedTotal,
  currentGross,
  currentKm,
  daysWorked,
  isRefazer,
}: {
  draft: Draft;
  plan: ReturnType<typeof computePlan>;
  costsItems: { label: string; value: number }[];
  variableItems: { label: string; value: number }[];
  variableTotal: number;
  fixedTotal: number;
  currentGross: number;
  currentKm: number;
  daysWorked: number;
  isRefazer: boolean;
}) {
  const temDados = currentGross > 0 && isRefazer;

  // Dias do novo plano que ainda não passaram (>= hoje) — comparação por
  // string ISO local, igual ao engine, pra não cair em armadilha de fuso.
  const hojeIso = toIsoDate(startOfDay(new Date()));
  const diasFuturos = draft.selectedDates.filter((iso) => iso >= hojeIso);

  // Norteadores: se há dados, descontar o já feito
  const faltaFaturar = temDados
    ? Math.max(0, plan.faturamentoNecessario - currentGross)
    : plan.faturamentoNecessario;

  const diasBase = temDados && diasFuturos.length > 0 ? diasFuturos.length : draft.selectedDates.length;
  const kmBase = draft.avgKmPerDay * diasBase;

  const metaDiariaExibida = temDados && diasBase > 0 ? faltaFaturar / diasBase : plan.metaDiaria ?? null;
  const rpkExibido = temDados && kmBase > 0 ? faltaFaturar / kmBase : plan.requiredRpk ?? null;

  const metaImpossivel = rpkExibido != null && rpkExibido > 5;

  return (
    <div className="space-y-3">
      <StepHeader
        icon={Gauge}
        title="Aqui estão seus objetivos."
        subtitle={
          temDados && diasFuturos.length > 0
            ? `Esses são os seus objetivos para os próximos ${diasFuturos.length} ${diasFuturos.length === 1 ? "dia" : "dias"}.`
            : "Esses são os dois números que vão guiar seu mês."
        }
      />

      {/* Herói — espelha o PainelResumo */}
      <div className="relative overflow-hidden rounded-2xl border border-primary/25 bg-gradient-to-br from-primary/[0.14] via-primary/[0.04] to-transparent p-5 shadow-[0_18px_40px_-20px_hsl(var(--primary)/0.6)]">
        <div className="pointer-events-none absolute -right-6 -top-6 h-44 w-44 rounded-full bg-primary/[0.12] blur-2xl" />
        <div className="mb-3 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-primary/90">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary" />
          Objetivos do dia
        </div>
        <div className="grid grid-cols-2 divide-x divide-border/40">
          <div className="pr-4">
            <div className="mb-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground/70">
              Meta
            </div>
            <div className="flex items-baseline gap-0.5">
              <span className="mb-0.5 self-end text-base font-semibold text-emerald-200/70">
                R$
              </span>
              <span className="bg-gradient-to-b from-white to-emerald-200 bg-clip-text text-3xl font-bold leading-none tabular-nums text-transparent">
                {metaDiariaExibida != null && metaDiariaExibida > 0
                  ? metaDiariaExibida.toLocaleString("pt-BR", { maximumFractionDigits: 0 })
                  : "—"}
              </span>
            </div>
            <div className="mt-0.5 text-[11px] text-muted-foreground/60">pra faturar</div>
          </div>
          <div className="pl-4">
            <div className="mb-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground/70">
              R$/KM mínimo
            </div>
            <div className="flex items-baseline gap-0.5">
              <span className="bg-gradient-to-b from-white to-emerald-200 bg-clip-text text-3xl font-bold leading-none tabular-nums text-transparent">
                {rpkExibido != null && rpkExibido > 0
                  ? rpkExibido.toLocaleString("pt-BR", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })
                  : "—"}
              </span>
              <span className="mb-0.5 self-end text-base font-semibold text-emerald-200/70">
                /km
              </span>
            </div>
            <div className="mt-0.5 text-[11px] text-muted-foreground/60">por corrida</div>
          </div>
        </div>
      </div>

      {/* Já realizado este mês (apenas em Refazer com dados) */}
      {temDados && (
        <div className="rounded-2xl border border-primary/30 bg-primary/[0.05] p-4">
          <div className="flex items-center gap-1.5 mb-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-primary">
            <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
            Até agora
          </div>
          <div className="space-y-1.5 text-[13px]">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Faturamento</span>
              <span className="font-bold text-[15px] text-primary">
                {fmtBRL(currentGross)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">KM rodado</span>
              <span className="font-semibold text-foreground/90">
                {fmtKm(currentKm)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Dias trabalhados</span>
              <span className="font-semibold text-foreground/90">{daysWorked}</span>
            </div>
            <div className="flex justify-between border-t border-border/40 pt-2 mt-1">
              <span className="text-muted-foreground">Ainda falta faturar</span>
              <span className="font-bold text-blue-400">{fmtBRL(faltaFaturar)}</span>
            </div>
          </div>
        </div>
      )}

      {/* Alerta de viabilidade */}
      {rpkExibido != null && rpkExibido > 3.5 && (
        <div
          className={cn(
            "rounded-xl border px-3.5 py-2.5 text-[12px] leading-snug",
            metaImpossivel
              ? "border-rose-500/30 bg-rose-500/[0.07] text-rose-300"
              : "border-amber-500/30 bg-amber-500/[0.07] text-amber-300",
          )}
        >
          {metaImpossivel
            ? `⚠️ R$ ${rpkExibido.toFixed(2)}/km é muito difícil de atingir. Considere aumentar os dias de trabalho ou reduzir a meta para um plano mais realista.`
            : `💡 R$ ${rpkExibido.toFixed(2)}/km é exigente. É possível, mas vai exigir corridas bem selecionadas e consistência.`}
        </div>
      )}

      {/* Composição com cores semânticas */}
      <div className="space-y-2 rounded-2xl border border-border/60 bg-card/60 p-4">
        <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/70">
          Composição do plano
        </div>
        <div className="flex items-center justify-between text-[13px]">
          <span className="text-muted-foreground">Faturamento bruto necessário</span>
          <span className="font-bold tabular-nums text-blue-400">
            {fmtBRL(plan.faturamentoNecessario)}
          </span>
        </div>
        {fixedTotal > 0 && (
          <div className="flex items-center justify-between text-[13px]">
            <span className="text-muted-foreground">Custos do carro na meta</span>
            <span className="font-semibold tabular-nums text-rose-400">
              − {fmtBRL(fixedTotal)}
            </span>
          </div>
        )}
        <div className="mt-1 flex items-center justify-between border-t border-border/40 pt-2 text-[13px]">
          <span className="font-semibold text-foreground/90">
            {draft.goalType === "liquido" ? "Seu lucro líquido" : "Meta de faturamento"}
          </span>
          <span className="font-bold tabular-nums text-emerald-400">
            {fmtBRL(draft.monthlyGoal)}
          </span>
        </div>
        {variableTotal > 0 && (
          <div className="mt-0.5 flex items-center justify-between border-t border-border/30 pt-2 text-[12px]">
            <span className="text-muted-foreground/70">Combustível estimado (referência)</span>
            <span className="tabular-nums text-muted-foreground/70">
              {fmtBRL(variableTotal)}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

