import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Check,
  ChevronRight,
  Flag,
  Target,
  CalendarDays,
  Car as CarIcon,
  TrendingUp,
  Route,
  Gauge,
  AlertTriangle,
  Loader2,
  Pencil,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useData } from "@/context/DataContext";
import { NumberField } from "@/components/NumberField";
import { Button } from "@/components/ui/button";
import {
  applyShortcut,
  computeFixedMonthlyCosts,
  computePlan,
  DEFAULT_AVG_KM_PER_DAY,
  ShortcutKey,
} from "@/lib/planejamento";
import type { GoalType } from "@/types";
import { CalendarGrid } from "./CalendarGrid";

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
  editMode?: { steps: number[] };
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
}: Props) {
  const navigate = useNavigate();
  const { settings, cars, updateSettings } = useData();
  const activeCar = useMemo(
    () => cars.find((c) => c.is_active) || cars[0] || null,
    [cars],
  );

  const isEdit = !!editMode;
  const stepsList = editMode?.steps ?? Array.from({ length: TOTAL_STEPS }, (_, i) => i + 1);
  const [stepIdx, setStepIdx] = useState(() => {
    if (initialStep != null) {
      const i = stepsList.indexOf(initialStep);
      return i >= 0 ? i : 0;
    }
    return 0;
  });
  const step = stepsList[stepIdx];
  const isLast = stepIdx === stepsList.length - 1;

  const [draft, setDraft] = useState<Draft>(() => ({
    goalType: prefill || isEdit ? settings.goalType : "bruto",
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
  }));
  const [saving, setSaving] = useState(false);

  // Custos consideram óleo e pneus prorrateados pelo KM planejado do draft.
  const draftPlannedKm = useMemo(
    () => (draft.avgKmPerDay > 0 ? draft.avgKmPerDay * draft.selectedDates.length : 0),
    [draft.avgKmPerDay, draft.selectedDates.length],
  );
  const costs = useMemo(
    () => computeFixedMonthlyCosts(activeCar, draftPlannedKm),
    [activeCar, draftPlannedKm],
  );

  const plan = useMemo(
    () =>
      computePlan({
        monthlyGoal: draft.monthlyGoal,
        goalType: draft.goalType,
        diasSelecionados: draft.selectedDates.length,
        custosFixos: costs.total,
        avgKmPerDay: draft.avgKmPerDay,
      }),
    [draft, costs.total],
  );


  const canNext = (() => {
    if (step === 1) return true;
    if (step === 2) return draft.monthlyGoal > 0;
    if (step === 3) return draft.selectedDates.length > 0;
    if (step === 4) return draft.avgKmPerDay > 0;
    if (step === 5) return true;
    return true;
  })();

  const back = () => {
    if (stepIdx === 0) onCancel();
    else setStepIdx((s) => s - 1);
  };

  const finish = async () => {
    setSaving(true);
    try {
      const patch: Parameters<typeof updateSettings>[0] = {};

      if (isEdit) {
        if (stepsList.includes(1) || stepsList.includes(2)) {
          patch.monthlyGoal = draft.monthlyGoal;
          patch.goalType = draft.goalType;
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
      }

      await updateSettings(patch);
      toast.success(isEdit ? "Alteração salva" : "Planejamento concluído");
      onDone();
    } catch {
      toast.error("Não foi possível salvar");
    } finally {
      setSaving(false);
    }
  };

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
        className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-4 pb-28 animate-fade-in"
        key={`${step}-${stepIdx}`}
      >
        {step === 1 && <Step1 draft={draft} setDraft={setDraft} />}
        {step === 2 && <Step2 draft={draft} setDraft={setDraft} />}
        {step === 3 && <Step3 draft={draft} setDraft={setDraft} />}
        {step === 4 && <Step4 draft={draft} setDraft={setDraft} plan={plan} />}
        {step === 5 && (
          <Step5
            car={activeCar}
            costsTotal={costs.total}
            costsItems={costs.items}
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
          />
        )}
      </div>

      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-background/95 backdrop-blur-lg">
        <div className="mx-auto w-full max-w-md px-4 py-3">
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
                  {isEdit ? "Salvar alteração" : "Concluir planejamento"}
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
          { key: "bruto" as const, title: "Ganho bruto", desc: "Quanto quero faturar no total, antes dos gastos." },
          { key: "liquido" as const, title: "Lucro líquido", desc: "Quanto quero que sobre depois dos gastos." },
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

function Step2({ draft, setDraft }: { draft: Draft; setDraft: (u: (d: Draft) => Draft) => void }) {
  return (
    <div>
      <StepHeader
        icon={Target}
        title={draft.goalType === "liquido" ? "Quanto quer de lucro líquido?" : "Quanto quer faturar?"}
        subtitle={
          draft.goalType === "liquido"
            ? "O valor que você quer ter sobrando depois dos gastos."
            : "Seu objetivo total de faturamento no mês."
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
        <p className="mt-2 text-[11px] leading-snug text-muted-foreground">
          Exemplo: 6.000 para R$ 6.000,00 no mês.
        </p>
      </div>
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
            <Sparkles className="h-3 w-3" /> Com sua rotina planejada
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
              <span className="font-semibold tabular-nums text-foreground/95">
                {plan.faturamentoNecessario > 0 ? fmtBRL(plan.faturamentoNecessario) : "—"}
              </span>
            </li>
            <li className="flex items-center justify-between gap-2 border-t border-border/40 pt-1.5">
              <span className="text-muted-foreground">R$/KM mínimo necessário</span>
              <span className="font-bold tabular-nums text-primary">
                {plan.requiredRpk != null ? `${fmtRpk(plan.requiredRpk)}/km` : "—"}
              </span>
            </li>
          </ul>
          <p className="mt-2.5 border-t border-border/40 pt-2 text-[11px] leading-snug text-muted-foreground">
            Quanto mais km você consegue rodar, menor tende a ser o R$/KM necessário. Quanto menos km, maior precisa ser o rendimento por km.
          </p>
        </div>

        <p className="px-1 text-[10.5px] leading-snug text-muted-foreground/75">
          Com o tempo, seus registros de ganhos, gastos e KM ajudam o Volant a mostrar referências mais próximas da sua realidade.
        </p>
      </div>
    </div>
  );
}

function Step5({
  car,
  costsTotal,
  costsItems,
  onAddCar,
  onEditCosts,
}: {
  car: ReturnType<typeof useData>["cars"][number] | null;
  costsTotal: number;
  costsItems: { label: string; value: number }[];
  onAddCar: () => void;
  onEditCosts: () => void;
}) {
  if (!car) {
    return (
      <div>
        <StepHeader
          icon={CarIcon}
          title="Você tem um veículo cadastrado?"
          subtitle="O veículo melhora o planejamento porque consideramos seus custos fixos."
        />
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/[0.06] p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
            <div className="space-y-2">
              <p className="text-[13px] leading-snug text-foreground/90">
                Sem veículo cadastrado, calculamos seu planejamento sem custos fixos. Os números ficam menos precisos.
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

  if (costsItems.length === 0) {
    return (
      <div>
        <StepHeader
          icon={CarIcon}
          title="Seu veículo está sem custos cadastrados"
          subtitle="Sem custos, calculamos seu planejamento como se você não tivesse gastos fixos."
        />
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/[0.06] p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
            <div className="space-y-2">
              <p className="text-[13px] leading-snug text-foreground/90">
                Cadastrar financiamento, aluguel, IPVA, seguro e outros custos torna o cálculo bem mais preciso.
              </p>
              <button
                type="button"
                onClick={onEditCosts}
                className="text-[12.5px] font-semibold text-primary hover:underline"
              >
                Cadastrar custos do veículo →
              </button>
            </div>
          </div>
        </div>
        <p className="mt-3 text-center text-[11.5px] text-muted-foreground">
          Você pode continuar sem custos cadastrados.
        </p>
      </div>
    );
  }

  return (
    <div>
      <StepHeader
        icon={CarIcon}
        title="Custos considerados"
        subtitle={`${car.brand ?? "Veículo"} ${car.model ?? ""}`.trim()}
      />
      <div className="rounded-2xl border border-border/60 bg-card/60 p-4">
        <ul className="space-y-2">
          {costsItems.map((it, i) => (
            <li key={i} className="flex items-center justify-between text-[13px]">
              <span className="text-muted-foreground">{it.label}</span>
              <span className="font-semibold tabular-nums text-foreground">{fmtBRL(it.value)}</span>
            </li>
          ))}
        </ul>
        <div className="mt-3 flex items-center justify-between border-t border-border/40 pt-3">
          <span className="text-[12px] font-semibold uppercase tracking-wider text-muted-foreground/90">
            Total mensal
          </span>
          <span className="text-[16px] font-bold tabular-nums text-foreground">
            {fmtBRL(costsTotal)}
          </span>
        </div>
      </div>
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
  costsItems,
}: {
  draft: Draft;
  plan: ReturnType<typeof computePlan>;
  costsItems: { label: string; value: number }[];
}) {
  return (
    <div>
      <StepHeader
        icon={Sparkles}
        title="Tudo pronto. Aqui está seu plano."
        subtitle="Confira o resumo antes de concluir."
      />

      <div className="rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/[0.1] via-primary/[0.04] to-transparent p-4">
        <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-primary/90">
          Sua meta de {draft.goalType === "liquido" ? "lucro líquido" : "ganho bruto"}
        </div>
        <div className="mt-1 text-2xl font-bold tabular-nums text-foreground">
          {fmtBRL(draft.monthlyGoal)}
        </div>
        {plan.metaDiaria != null && (
          <div className="mt-1 text-[12px] text-muted-foreground">
            Meta diária:{" "}
            <span className="font-semibold tabular-nums text-foreground/90">
              {fmtBRL(plan.metaDiaria)}
            </span>{" "}
            em {draft.selectedDates.length} dias
          </div>
        )}
      </div>

      <div className="mt-2.5 grid grid-cols-2 gap-2.5">
        <Stat
          icon={Route}
          label="KM planejado no período"
          value={plan.plannedKmTotal > 0 ? fmtKm(plan.plannedKmTotal) : "—"}
        />
        <Stat
          icon={Sparkles}
          label="R$/KM mínimo necessário"
          value={plan.requiredRpk != null ? `${fmtRpk(plan.requiredRpk)}/km` : "—"}
        />
        <Stat
          icon={CarIcon}
          label="Custos do veículo"
          value={plan.custosFixos > 0 ? `${fmtBRL(plan.custosFixos)}/mês` : "—"}
        />
        <Stat
          icon={TrendingUp}
          label={draft.goalType === "liquido" ? "Faturamento bruto" : "Lucro estimado"}
          value={
            draft.goalType === "liquido"
              ? fmtBRL(plan.faturamentoNecessario)
              : plan.lucroEstimado != null
                ? fmtBRL(plan.lucroEstimado)
                : "—"
          }
        />
      </div>

      {costsItems.length > 0 && (
        <div className="mt-3 rounded-2xl border border-border/60 bg-card/60 p-4">
          <div className="mb-2 text-[12px] font-semibold text-foreground/90">
            Custos considerados
          </div>
          <ul className="space-y-1.5">
            {costsItems.map((it, i) => (
              <li
                key={i}
                className="flex items-center justify-between text-[12px] text-muted-foreground"
              >
                <span>{it.label}</span>
                <span className="font-medium tabular-nums text-foreground/85">
                  {fmtBRL(it.value)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-border/60 bg-card/60 p-3.5">
      <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
        <Icon className="h-3 w-3" /> {label}
      </div>
      <div className="mt-1.5 text-[15px] font-bold tabular-nums leading-tight text-foreground">
        {value}
      </div>
    </div>
  );
}
