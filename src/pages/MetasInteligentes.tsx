import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Target, Flag, CalendarDays, CalendarClock, Loader2, Gauge, ChevronRight } from "lucide-react";
import { useData } from "@/context/DataContext";
import { NumberField } from "@/components/NumberField";
import { Button } from "@/components/ui/button";
import { deriveGoals } from "@/lib/stats";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface GoalsDraft {
  monthlyGoal: number;
  goalType: "liquido" | "bruto";
  workingDaysPerMonth: number | null;
  remainingWorkingDays: number | null;
}

function buildDraft(s: {
  monthlyGoal: number;
  goalType: "liquido" | "bruto";
  workingDaysPerMonth: number | null;
  remainingWorkingDays: number | null;
}): GoalsDraft {
  return {
    monthlyGoal: s.monthlyGoal,
    goalType: s.goalType,
    workingDaysPerMonth: s.workingDaysPerMonth,
    remainingWorkingDays: s.remainingWorkingDays,
  };
}

function ScreenHeader({ onBack, title, subtitle }: { onBack: () => void; title: string; subtitle: string }) {
  return (
    <header className="sticky top-0 z-20 border-b border-border bg-background/85 backdrop-blur-lg">
      <div className="flex items-center gap-3 px-3 py-3">
        <button
          type="button"
          onClick={onBack}
          aria-label="Voltar"
          className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-card transition-colors hover:bg-muted/50 active:scale-[0.96]"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div className="min-w-0">
          <h1 className="truncate text-[17px] font-bold leading-tight tracking-tight text-foreground">{title}</h1>
          <p className="text-[11px] leading-tight text-muted-foreground/80">{subtitle}</p>
        </div>
      </div>
    </header>
  );
}

export default function MetasInteligentes() {
  const navigate = useNavigate();
  const { settings, updateSettings } = useData();

  // Reset scroll on mount so the screen always opens at the top.
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, []);

  const [draft, setDraft] = useState<GoalsDraft>(() => buildDraft(settings));
  useEffect(() => setDraft(buildDraft(settings)), [settings]);

  const now = new Date();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const availableRemainingDays = daysInMonth - now.getDate() + 1;

  const plannedInvalid =
    draft.workingDaysPerMonth != null &&
    (draft.workingDaysPerMonth < 1 || draft.workingDaysPerMonth > daysInMonth);
  const remainingInvalid =
    draft.remainingWorkingDays != null &&
    (draft.remainingWorkingDays < 1 || draft.remainingWorkingDays > availableRemainingDays);

  const dirty =
    draft.monthlyGoal !== settings.monthlyGoal ||
    draft.goalType !== settings.goalType ||
    draft.workingDaysPerMonth !== settings.workingDaysPerMonth ||
    draft.remainingWorkingDays !== settings.remainingWorkingDays;

  const [saving, setSaving] = useState(false);
  const save = async () => {
    if (plannedInvalid || remainingInvalid) return;
    setSaving(true);
    try {
      await updateSettings({
        monthlyGoal: draft.monthlyGoal,
        goalType: draft.goalType,
        workingDaysPerMonth: draft.workingDaysPerMonth,
        remainingWorkingDays: draft.remainingWorkingDays,
      });
      toast.success("Metas atualizadas");
    } catch {
      toast.error("Não foi possível salvar");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen">
      <ScreenHeader
        onBack={() => navigate("/ajustes/planejamento")}
        title="Metas Inteligentes"
        subtitle="Planeje sua meta e seus dias de trabalho."
      />

      <div className="space-y-3 px-4 py-5 animate-fade-in">
        {/* Tipo de meta */}
        <div className="rounded-2xl border border-border/60 bg-card/60 p-4">
          <div className="mb-3 flex items-start gap-2.5">
            <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Flag className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <div className="text-[14px] font-semibold leading-tight">Tipo de meta</div>
              <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">
                Escolha se sua meta será líquida ou bruta.
              </p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {([
              { key: "liquido", title: "Meta líquida", desc: "Depois dos gastos." },
              { key: "bruto", title: "Meta bruta", desc: "Antes dos gastos." },
            ] as const).map((opt) => {
              const active = draft.goalType === opt.key;
              return (
                <button
                  key={opt.key}
                  type="button"
                  onClick={() => setDraft((d) => ({ ...d, goalType: opt.key }))}
                  className={cn(
                    "rounded-xl border p-3 text-left transition-all duration-200 active:scale-[0.98]",
                    active
                      ? "border-primary/45 bg-primary/[0.08] shadow-[0_0_0_1px_hsl(var(--primary)/0.12),0_4px_14px_-10px_hsl(var(--primary)/0.5)]"
                      : "border-border/60 bg-muted/25 hover:bg-muted/40",
                  )}
                >
                  <div className={cn("text-[13px] font-semibold", active ? "text-foreground" : "text-foreground/90")}>
                    {opt.title}
                  </div>
                  <div className="mt-0.5 text-[11px] leading-snug text-muted-foreground">{opt.desc}</div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Meta mensal */}
        <div className="rounded-2xl border border-border/60 bg-card/60 p-4">
          <div className="mb-3 flex items-start gap-2.5">
            <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Target className="h-4 w-4" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline justify-between gap-2">
                <div className="text-[14px] font-semibold leading-tight">Meta mensal</div>
                <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/80">
                  {now.toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}
                </span>
              </div>
              <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">Sua meta principal do mês.</p>
            </div>
          </div>
          <NumberField
            currency
            value={draft.monthlyGoal || null}
            onChange={(v) => setDraft((d) => ({ ...d, monthlyGoal: v ?? 0 }))}
          />
        </div>

        {/* Dias planejados */}
        <div className="rounded-2xl border border-border/60 bg-card/60 p-4">
          <div className="mb-3 flex items-start gap-2.5">
            <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <CalendarDays className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <div className="text-[14px] font-semibold leading-tight">Dias planejados no mês</div>
              <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">Base do seu planejamento mensal.</p>
            </div>
          </div>
          <NumberField
            value={draft.workingDaysPerMonth}
            decimal={false}
            inputMode="numeric"
            placeholder="Ex: 22"
            className={cn(plannedInvalid && "border-destructive focus-visible:ring-destructive")}
            onChange={(v) => {
              if (v == null) return setDraft((d) => ({ ...d, workingDaysPerMonth: null }));
              const n = Math.max(1, Math.min(daysInMonth, Math.floor(v)));
              setDraft((d) => ({ ...d, workingDaysPerMonth: n }));
            }}
          />
          <div className="mt-1.5 min-h-[16px] text-[11px] leading-none">
            {plannedInvalid ? (
              <span className="font-medium text-destructive/90">Apenas {daysInMonth} dias disponíveis no mês</span>
            ) : (
              <span className="text-muted-foreground">Dias disponíveis: {daysInMonth}</span>
            )}
          </div>
        </div>

        {/* Ajuste do mês atual — bloco secundário, claramente opcional */}
        <section className="space-y-2 pt-2">
          <div className="flex items-center gap-2 px-1">
            <span className="h-px flex-1 bg-border/50" />
            <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/80">
              Ajuste do mês atual
            </span>
            <span className="h-px flex-1 bg-border/50" />
          </div>

          <div className="rounded-2xl border border-dashed border-border/50 bg-muted/15 p-4">
            <div className="mb-3 flex items-start gap-2.5">
              <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-muted/60 text-muted-foreground">
                <CalendarClock className="h-4 w-4" />
              </span>
              <div className="min-w-0">
                <div className="text-[13px] font-semibold leading-tight text-foreground/90">
                  Dias restantes de trabalho
                </div>
                <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">
                  Use se seu planejamento mudou.
                </p>
                <p className="mt-0.5 text-[10.5px] leading-snug text-muted-foreground/80">
                  Informe quantos dias ainda pretende trabalhar até o fim do mês.
                </p>
              </div>
            </div>
            <NumberField
              value={draft.remainingWorkingDays}
              decimal={false}
              inputMode="numeric"
              placeholder={`Ex: ${Math.min(availableRemainingDays, 7)}`}
              className={cn(remainingInvalid && "border-destructive focus-visible:ring-destructive")}
              onChange={(v) => {
                if (v == null) return setDraft((d) => ({ ...d, remainingWorkingDays: null }));
                const n = Math.max(1, Math.min(availableRemainingDays, Math.floor(v)));
                setDraft((d) => ({ ...d, remainingWorkingDays: n }));
              }}
            />
            <div className="mt-1.5 min-h-[16px] text-[11px] leading-none">
              {remainingInvalid ? (
                <span className="font-medium text-destructive/90">
                  Apenas {availableRemainingDays} dias disponíveis no mês
                </span>
              ) : (
                <span className="text-muted-foreground">Dias disponíveis: {availableRemainingDays}</span>
              )}
            </div>
          </div>
        </section>

        <Button
          onClick={save}
          disabled={saving || !dirty || plannedInvalid || remainingInvalid}
          className="w-full"
        >
          {saving ? (
            <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Salvando...</>
          ) : (
            "Salvar"
          )}
        </Button>

        <DerivedGoalsPreview
          monthlyGoal={settings.monthlyGoal}
          goalType={settings.goalType}
          workingDays={settings.workingDaysPerMonth}
          remainingWorkingDays={settings.remainingWorkingDays}
        />

        {/* Shortcut to KM */}
        <button
          type="button"
          onClick={() => navigate("/ajustes/planejamento/km")}
          className="group mt-3 flex w-full items-center gap-3 rounded-2xl border border-teal-500/25 bg-gradient-to-br from-teal-500/[0.07] via-teal-500/[0.03] to-transparent p-3.5 text-left transition-all duration-300 active:scale-[0.985] hover:border-teal-500/40"
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-teal-500/15 text-teal-300">
            <Gauge className="h-4 w-4" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="text-[13px] font-semibold leading-tight">Calcular KM Inteligente</div>
            <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">
              Use sua meta para descobrir o R$/km ideal.
            </p>
          </div>
          <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
        </button>
      </div>
    </div>
  );
}

function DerivedGoalsPreview({
  monthlyGoal,
  goalType,
  workingDays,
  remainingWorkingDays,
}: {
  monthlyGoal: number;
  goalType: "liquido" | "bruto";
  workingDays: number | null;
  remainingWorkingDays: number | null;
}) {
  const { entries } = useData();
  const g = useMemo(
    () => deriveGoals(monthlyGoal, entries, new Date(), { goalType, workingDays, remainingWorkingDays }),
    [monthlyGoal, entries, goalType, workingDays, remainingWorkingDays],
  );
  const goalReached = monthlyGoal > 0 && g.remaining <= 0;
  return (
    <div className="grid grid-cols-2 gap-2.5 pt-1">
      <div className="rounded-2xl border border-primary/25 bg-gradient-to-br from-primary/[0.08] via-primary/[0.03] to-transparent p-3.5 shadow-[0_0_0_1px_hsl(var(--primary)/0.08),0_8px_22px_-16px_hsl(var(--primary)/0.45)]">
        <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-primary/90">
          {remainingWorkingDays ? "Meta diária restante" : "Meta diária sugerida"}
        </div>
        <div className="mt-1.5 text-2xl font-bold tabular-nums text-foreground leading-none">
          {goalReached
            ? <span className="text-base text-success">Meta atingida</span>
            : g.daily > 0
              ? `R$ ${g.daily.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}`
              : "—"}
        </div>
      </div>
      <div className="rounded-2xl border border-border/60 bg-card/70 p-3.5">
        <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
          Meta semanal estimada
        </div>
        <div className="mt-1.5 text-2xl font-bold tabular-nums text-foreground/90 leading-none">
          {g.weekly > 0 ? `R$ ${g.weekly.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}` : "—"}
        </div>
      </div>
    </div>
  );
}
