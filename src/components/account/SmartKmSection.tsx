import { useMemo, useState, useEffect } from "react";
import { Gauge, Lock, Car as CarIcon, Crown, AlertCircle, CheckCircle2, Info } from "lucide-react";
import { NumberField } from "@/components/NumberField";
import { Button } from "@/components/ui/button";
import { useData } from "@/context/DataContext";
import { useAccess } from "@/context/AccessContext";
import { computeMonthlyVehicleCosts, computeSmartKm, getCurrentMonthRealData } from "@/lib/smartKm";
import { brl } from "@/lib/format";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

/**
 * KM Inteligente — planning module that suggests a target R$/km based on the
 * user's monthly goal, vehicle costs and real progress so far in the month.
 * Limited-access users see a preview but interactions open the paywall.
 */
export function SmartKmSection() {
  const { settings, entries, activeCar, updateSettings } = useData();
  const { isFull, requirePremium } = useAccess();

  const [draftKm, setDraftKm] = useState<number | null>(settings.kmPlannedMonth);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setDraftKm(settings.kmPlannedMonth);
  }, [settings.kmPlannedMonth]);

  const dirty = draftKm !== settings.kmPlannedMonth;
  const invalid = draftKm != null && draftKm <= 0;

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
        workingDaysPerMonth: settings.workingDaysPerMonth,
      }),
    [settings.monthlyGoal, settings.goalType, settings.kmPlannedMonth, costs.total, real, settings.workingDaysPerMonth],
  );

  const handleSave = async () => {
    if (!requirePremium()) return;
    if (invalid) return;
    setSaving(true);
    try {
      await updateSettings({ kmPlannedMonth: draftKm });
      toast.success("KM planejado salvo");
    } catch {
      toast.error("Não foi possível salvar");
    } finally {
      setSaving(false);
    }
  };

  const handleKmFocus = () => {
    if (!isFull) requirePremium();
  };

  // ---------- Empty states ----------
  if (!activeCar) {
    return (
      <EmptyState
        icon={<CarIcon className="h-4 w-4" />}
        title="Cadastre um carro para usar o KM Inteligente."
      />
    );
  }

  return (
    <div className="space-y-3">
      {/* Explanation */}
      <p className="px-1 text-[12px] leading-snug text-muted-foreground">
        O Volant ajusta seu R$/km conforme sua meta, seus custos e seu ritmo no mês.
      </p>

      {/* KM planejado */}
      <div className="rounded-2xl border border-border/60 bg-card/60 p-4">
        <div className="mb-3 flex items-start gap-2.5">
          <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Gauge className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <div className="text-[14px] font-semibold leading-tight">KM planejado no mês</div>
            <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">
              Informe quantos km pretende rodar neste mês.
            </p>
          </div>
        </div>
        <NumberField
          value={draftKm}
          decimal={false}
          inputMode="numeric"
          placeholder="Ex: 4000"
          className={cn(invalid && "border-destructive focus-visible:ring-destructive")}
          onFocus={handleKmFocus}
          onChange={(v) => {
            if (!isFull) {
              requirePremium();
              return;
            }
            if (v == null) return setDraftKm(null);
            setDraftKm(Math.max(0, Math.floor(v)));
          }}
        />
        {invalid && (
          <div className="mt-1.5 text-[11px] font-medium text-destructive/90">
            Informe um valor maior que zero.
          </div>
        )}
        <Button
          onClick={handleSave}
          disabled={!isFull ? false : (saving || !dirty || invalid)}
          className="mt-3 w-full"
        >
          {!isFull ? (
            <><Lock className="mr-2 h-4 w-4" /> Disponível no Premium</>
          ) : saving ? (
            <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Salvando...</>
          ) : (
            "Salvar"
          )}
        </Button>
      </div>

      {/* Results */}
      {!isFull ? (
        <LockedPreview onUnlock={() => requirePremium()} />
      ) : (
        <ResultsBlock state={state} />
      )}

      {/* Custos considerados */}
      {isFull && (
        <div className="rounded-2xl border border-border/60 bg-card/60 p-4">
          <div className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            <Info className="h-3.5 w-3.5" /> Custos considerados
          </div>
          {costs.items.length === 0 ? (
            <p className="text-[12px] text-muted-foreground">
              Nenhum custo do veículo cadastrado.
            </p>
          ) : (
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
          )}
        </div>
      )}
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
          Atualize seu KM planejado para recalcular.
        </p>
        <BaseRow base={state.base} className="mt-3" />
      </div>
    );
  }

  // ok
  return (
    <div className="space-y-2.5">
      {/* Smart card */}
      <div className="relative overflow-hidden rounded-2xl border border-primary/35 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-4 shadow-[0_0_0_1px_hsl(var(--primary)/0.12),0_10px_30px_-18px_hsl(var(--primary)/0.55)]">
        <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">
          <Gauge className="h-3.5 w-3.5" /> R$/km inteligente
        </div>
        <div className="mt-1.5 text-3xl font-bold tabular-nums text-foreground leading-none">
          {brl(state.smart)}
        </div>
        <p className="mt-2 text-[12px] leading-snug text-muted-foreground">
          Atualizado automaticamente conforme seu desempenho mensal.
        </p>
        <p className="mt-1 text-[11px] leading-snug text-muted-foreground/80">
          Priorize corridas iguais ou acima desse valor por km para atingir seus objetivos.
        </p>
      </div>

      {/* Base card */}
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
