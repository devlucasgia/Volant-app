import { useMemo, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Gauge, Lock, Car as CarIcon, Crown, AlertCircle, CheckCircle2, Info, RotateCcw, Wallet, ChevronRight, Loader2 } from "lucide-react";
import { NumberField } from "@/components/NumberField";
import { Button } from "@/components/ui/button";
import { useData } from "@/context/DataContext";
import { useAccess } from "@/context/AccessContext";
import { computeMonthlyVehicleCosts, computeSmartKm, getCurrentMonthRealData } from "@/lib/smartKm";
import { brl } from "@/lib/format";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

/**
 * KM Inteligente — planning module that suggests a target R$/km based on the
 * user's monthly goal, vehicle costs and real progress so far in the month.
 *
 * Layout hierarchy (top → bottom):
 *  1. R$/km inteligente (primary result)
 *  2. R$/km base (reference)
 *  3. KM planejado no mês (field + estimated remaining)
 *  4. AJUSTE MANUAL — separator + optional override field
 *  5. Calcular KM button
 *  6. Custos considerados
 *  7. Empty CTA when no vehicle/costs are set
 *  8. Brief explanation
 */
export function SmartKmSection() {
  const navigate = useNavigate();
  const { settings, entries, activeCar, updateSettings } = useData();
  const { isFull, requirePremium } = useAccess();

  const [draftKm, setDraftKm] = useState<number | null>(settings.kmPlannedMonth);
  const [draftOverride, setDraftOverride] = useState<number | null>(settings.kmRemainingOverride);
  const [saving, setSaving] = useState(false);

  useEffect(() => { setDraftKm(settings.kmPlannedMonth); }, [settings.kmPlannedMonth]);
  useEffect(() => { setDraftOverride(settings.kmRemainingOverride); }, [settings.kmRemainingOverride]);

  const dirty =
    draftKm !== settings.kmPlannedMonth || draftOverride !== settings.kmRemainingOverride;
  const invalid = draftKm != null && draftKm <= 0;
  const overrideInvalid = draftOverride != null && draftOverride <= 0;

  const real = useMemo(() => getCurrentMonthRealData(entries), [entries]);
  const costs = useMemo(
    () => computeMonthlyVehicleCosts(activeCar, settings.kmPlannedMonth),
    [activeCar, settings.kmPlannedMonth],
  );
  const state = useMemo(
    () =>
      computeSmartKm({
        monthlyGoal: settings.monthlyGoal,
        goalType: settings.goalType,
        kmPlanned: settings.kmPlannedMonth,
        vehicleMonthlyCost: costs.total,
        real,
        remainingWorkingDays: settings.remainingWorkingDays,
        kmRemainingOverride: settings.kmRemainingOverride,
      }),
    [
      settings.monthlyGoal,
      settings.goalType,
      settings.kmPlannedMonth,
      settings.kmRemainingOverride,
      costs.total,
      real,
      settings.remainingWorkingDays,
    ],
  );

  // Live preview for "KM restante estimado" using the current draft of kmPlanned.
  const previewKmRemaining = useMemo(() => {
    if (!draftKm || draftKm <= 0) return null;
    return Math.max(0, draftKm - real.kmThisMonth);
  }, [draftKm, real.kmThisMonth]);

  const handleCalculate = async () => {
    if (!requirePremium()) return;
    if (invalid || overrideInvalid) return;
    setSaving(true);
    try {
      await updateSettings({
        kmPlannedMonth: draftKm,
        kmRemainingOverride: draftOverride,
      });
      toast.success("KM Inteligente recalculado");
    } catch {
      toast.error("Não foi possível salvar");
    } finally {
      setSaving(false);
    }
  };

  const handleClearOverride = async () => {
    if (!requirePremium()) return;
    setDraftOverride(null);
    try {
      await updateSettings({ kmRemainingOverride: null });
      toast.success("Voltamos para o cálculo automático");
    } catch {
      toast.error("Não foi possível limpar");
    }
  };

  const handleFocus = () => {
    if (!isFull) requirePremium();
  };

  // ---------- No vehicle: full empty state with CTA ----------
  if (!activeCar) {
    return (
      <div className="space-y-3">
        <NoVehicleCta onGo={() => navigate("/ajustes/veiculos/carros")} />
        <ExplanationCard />
      </div>
    );
  }


  const hasCosts = costs.items.length > 0;

  return (
    <div className="space-y-3">
      {/* 1 & 2 — Results */}
      {!isFull ? (
        <LockedPreview onUnlock={() => requirePremium()} />
      ) : (
        <ResultsBlock state={state} />
      )}

      {/* 3 — KM planejado no mês */}
      <div className="rounded-2xl border border-border/60 bg-card/60 p-4">
        <div className="mb-3 flex items-start gap-2.5">
          <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Gauge className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <div className="text-[14px] font-semibold leading-tight">KM planejado no mês</div>
            <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">
              Informe quantos km pretende rodar no mês.
            </p>
          </div>
        </div>
        <NumberField
          value={draftKm}
          decimal={false}
          inputMode="numeric"
          placeholder="Ex: 4000"
          className={cn(invalid && "border-destructive focus-visible:ring-destructive")}
          onFocus={handleFocus}
          onChange={(v) => {
            if (!isFull) { requirePremium(); return; }
            if (v == null) return setDraftKm(null);
            setDraftKm(Math.max(0, Math.floor(v)));
          }}
        />
        {invalid && (
          <div className="mt-1.5 text-[11px] font-medium text-destructive/90">
            Informe um valor maior que zero.
          </div>
        )}
        {isFull && draftKm != null && draftKm > 0 && (
          <div className="mt-2 flex items-center justify-between text-[12px]">
            <span className="text-muted-foreground">KM restante estimado</span>
            <span className="tabular-nums font-semibold">
              {(previewKmRemaining ?? 0).toLocaleString("pt-BR")} km
            </span>
          </div>
        )}
      </div>

      {/* 4 — AJUSTE MANUAL separator + optional override */}
      {isFull && (
        <section className="space-y-2 pt-1">
          <div className="flex items-center gap-2 px-1">
            <span className="h-px flex-1 bg-border/50" />
            <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/80">
              Ajuste manual
            </span>
            <span className="h-px flex-1 bg-border/50" />
          </div>

          <div className="rounded-2xl border border-dashed border-border/50 bg-muted/15 p-4">
            <div className="mb-2 flex items-center justify-between gap-2">
              <div className="text-[13px] font-semibold text-foreground/90">Ajustar KM restante</div>
              {draftOverride != null && (
                <button
                  type="button"
                  onClick={handleClearOverride}
                  className="inline-flex items-center gap-1 text-[11px] font-medium text-primary hover:underline"
                >
                  <RotateCcw className="h-3 w-3" /> Limpar
                </button>
              )}
            </div>
            <p className="text-[11px] leading-snug text-muted-foreground">
              Use se sua previsão mudou.
            </p>
            <p className="mt-0.5 mb-2.5 text-[10.5px] leading-snug text-muted-foreground/80">
              Informe quanto ainda pretende rodar até o fim do mês.
            </p>
            <NumberField
              value={draftOverride}
              decimal={false}
              inputMode="numeric"
              placeholder={`Ex: ${(previewKmRemaining ?? 0) || 1500}`}
              className={cn(overrideInvalid && "border-destructive focus-visible:ring-destructive")}
              onChange={(v) => {
                if (v == null) return setDraftOverride(null);
                setDraftOverride(Math.max(0, Math.floor(v)));
              }}
            />
            {overrideInvalid && (
              <div className="mt-1.5 text-[11px] font-medium text-destructive/90">
                Informe um valor maior que zero.
              </div>
            )}
          </div>
        </section>
      )}

      {/* 5 — Calcular KM button (covers both fields) */}
      <Button
        onClick={handleCalculate}
        disabled={!isFull ? false : (saving || !dirty || invalid || overrideInvalid)}
        className="w-full"
      >
        {!isFull ? (
          <><Lock className="mr-2 h-4 w-4" /> Disponível no Premium</>
        ) : saving ? (
          <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Calculando...</>
        ) : (
          "Calcular KM"
        )}
      </Button>

      {/* 6 — Custos considerados (only when has data) */}
      {isFull && hasCosts && (
        <div className="rounded-2xl border border-border/60 bg-card/60 p-4">
          <div className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            <Info className="h-3.5 w-3.5" /> Custos considerados
          </div>
          <ul className="space-y-1.5">
            {costs.items.map((c) => (
              <li key={c.label} className="flex items-center justify-between text-[12px]">
                <span className="text-muted-foreground">{c.label}</span>
                <span className="tabular-nums font-medium text-foreground/90">
                  {brl(c.value)}/mês
                </span>
              </li>
            ))}
            <li className="mt-2 flex items-center justify-between border-t border-border/60 pt-2 text-[12px]">
              <span className="font-semibold">Total mensal</span>
              <span className="tabular-nums font-bold">{brl(costs.total)}</span>
            </li>
            <li className="flex items-center justify-between text-[11px] text-muted-foreground">
              <span>Custo fixo por dia</span>
              <span className="tabular-nums font-medium">{brl(costs.dailyFixed)}/dia</span>
            </li>
          </ul>
        </div>
      )}

      {/* 7 — CTA when no vehicle costs registered */}
      {isFull && !hasCosts && (
        <NoCostsCta onGo={() => navigate("/ajustes/veiculos/custos")} />
      )}


      {/* 8 — Brief explanation */}
      <ExplanationCard />
    </div>
  );
}

function ResultsBlock({ state }: { state: ReturnType<typeof computeSmartKm> }) {
  if (state.kind === "needs-goal") {
    return <EmptyState icon={<AlertCircle className="h-4 w-4" />} title="Defina uma meta mensal para usar o KM Inteligente." />;
  }
  if (state.kind === "needs-km-planned") {
    return <EmptyState icon={<AlertCircle className="h-4 w-4" />} title="Informe o KM planejado no mês para calcular." />;
  }
  if (state.kind === "goal-reached") {
    return (
      <div className="rounded-2xl border border-success/40 bg-success/5 p-4 text-center">
        <div className="mx-auto mb-2 flex h-9 w-9 items-center justify-center rounded-full bg-success/15 text-success">
          <CheckCircle2 className="h-5 w-5" />
        </div>
        <div className="text-[14px] font-semibold text-success">Meta atingida</div>
        <p className="mt-1 text-[12px] text-muted-foreground">
          Você já atingiu sua meta neste mês.
        </p>
        <BaseRow base={state.base} className="mt-3" />
      </div>
    );
  }
  if (state.kind === "km-planned-reached") {
    return (
      <div className="rounded-2xl border border-amber-500/40 bg-amber-500/5 p-4 text-center">
        <div className="mx-auto mb-2 flex h-9 w-9 items-center justify-center rounded-full bg-amber-500/15 text-amber-500">
          <AlertCircle className="h-5 w-5" />
        </div>
        <div className="text-[14px] font-semibold text-amber-500">KM planejado atingido</div>
        <p className="mt-1 text-[12px] text-muted-foreground">
          Atualize seu KM restante para recalcular.
        </p>
        <BaseRow base={state.base} className="mt-3" />
      </div>
    );
  }
  if (state.kind === "needs-remaining-days") {
    return (
      <div className="rounded-2xl border border-amber-500/40 bg-amber-500/5 p-4 text-center">
        <div className="mx-auto mb-2 flex h-9 w-9 items-center justify-center rounded-full bg-amber-500/15 text-amber-500">
          <AlertCircle className="h-5 w-5" />
        </div>
        <div className="text-[14px] font-semibold text-amber-500">Atualize seus dias restantes</div>
        <p className="mt-1 text-[12px] text-muted-foreground">
          Informe quantos dias ainda pretende trabalhar para recalcular.
        </p>
      </div>
    );
  }

  // ok
  return (
    <div className="space-y-2.5">
      {/* Smart — primary result */}
      <div className="relative overflow-hidden rounded-2xl border border-primary/35 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-4 shadow-[0_0_0_1px_hsl(var(--primary)/0.12),0_10px_30px_-18px_hsl(var(--primary)/0.55)]">
        <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">
          <Gauge className="h-3.5 w-3.5" /> R$/km inteligente
        </div>
        <div className="mt-1.5 text-[34px] font-bold tabular-nums text-foreground leading-none">
          {brl(state.smart)}
        </div>
        <p className="mt-2 text-[12px] leading-snug text-muted-foreground">
          Atualizado conforme seu desempenho no mês.
        </p>
        <p className="mt-1 text-[11px] leading-snug text-muted-foreground/80">
          Priorize corridas a partir desse valor por km.
        </p>
        <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 border-t border-primary/15 pt-2 text-[11px]">
          <span className="text-muted-foreground">KM usado no cálculo</span>
          <span className="tabular-nums font-medium text-foreground/90">
            {state.kmUsed.toLocaleString("pt-BR")} km{" "}
            <span className="text-muted-foreground/80">
              {state.kmUsedSource === "manual" ? "ajustados manualmente" : "estimados"}
            </span>
          </span>
        </div>
      </div>

      {/* Base — reference */}
      <div className="rounded-2xl border border-border/60 bg-card/60 p-3.5">
        <div className="flex items-center justify-between">
          <div className="min-w-0">
            <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              R$/km base
            </div>
            <p className="mt-0.5 text-[11px] text-muted-foreground/80">
              Referência inicial da sua meta.
            </p>
          </div>
          <div className="text-xl font-bold tabular-nums text-foreground/90">
            {brl(state.base)}
          </div>
        </div>
      </div>
    </div>
  );
}

function BaseRow({ base, className }: { base: number; className?: string }) {
  return (
    <div className={cn("inline-flex items-center gap-2 rounded-full border border-border/60 bg-background/60 px-3 py-1 text-[11px]", className)}>
      <span className="text-muted-foreground">R$/km base</span>
      <span className="font-bold tabular-nums">{brl(base)}</span>
    </div>
  );
}

function EmptyState({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-border/60 bg-muted/20 p-4 text-center">
      <div className="mx-auto mb-2 flex h-8 w-8 items-center justify-center rounded-full bg-muted text-muted-foreground">
        {icon}
      </div>
      <p className="text-[12px] text-muted-foreground">{title}</p>
    </div>
  );
}

function NoVehicleCta({ onGo }: { onGo: () => void }) {
  return (
    <div className="rounded-2xl border border-border/60 bg-card/60 p-4">
      <div className="mb-2 flex items-start gap-2.5">
        <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <CarIcon className="h-4 w-4" />
        </span>
        <div className="min-w-0">
          <div className="text-[14px] font-semibold leading-tight">Cadastre um carro</div>
          <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">
            Precisamos do seu veículo e custos para calcular o R$/km ideal.
          </p>
        </div>
      </div>
      <Button onClick={onGo} className="w-full">
        Cadastrar veículo
        <ChevronRight className="ml-1 h-4 w-4" />
      </Button>
    </div>
  );
}

function NoCostsCta({ onGo }: { onGo: () => void }) {
  return (
    <div className="rounded-2xl border border-dashed border-border/60 bg-muted/20 p-4">
      <div className="mb-2 flex items-start gap-2.5">
        <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
          <Wallet className="h-4 w-4" />
        </span>
        <div className="min-w-0">
          <div className="text-[13px] font-semibold leading-tight">Cadastre os custos do veículo</div>
          <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">
            Com seus custos cadastrados, o cálculo fica ainda mais preciso.
          </p>
        </div>
      </div>
      <Button onClick={onGo} variant="outline" className="w-full">
        Cadastrar custos do veículo
        <ChevronRight className="ml-1 h-4 w-4" />
      </Button>
    </div>
  );
}

function ExplanationCard() {
  return (
    <div className="rounded-2xl border border-border/40 bg-muted/10 p-3.5">
      <div className="flex items-start gap-2">
        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground/80" />
        <p className="text-[11.5px] leading-snug text-muted-foreground">
          O KM Inteligente usa sua meta, seu ritmo e os custos do veículo para
          sugerir um valor mínimo por km nas corridas.
        </p>
      </div>
    </div>
  );
}

function LockedPreview({ onUnlock }: { onUnlock: () => void }) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-5 text-center">
      <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-primary/15 text-primary">
        <Crown className="h-5 w-5" />
      </div>
      <div className="text-[13px] font-semibold">Disponível no Premium</div>
      <p className="mt-1 text-[12px] text-muted-foreground">
        Descubra qual R$/km priorizar para bater suas metas no mês.
      </p>
      <Button size="sm" className="mt-3" onClick={onUnlock}>
        Desbloquear Premium
      </Button>
    </div>
  );
}
