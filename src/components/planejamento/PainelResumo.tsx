import { useNavigate } from "react-router-dom";
import {
  Target,
  CalendarDays,
  Route,
  Car as CarIcon,
  TrendingUp,
  Pencil,
  RotateCcw,
  Wallet,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  Gauge,
} from "lucide-react";
import { usePlanningSnapshot, type PlanningSnapshot } from "@/lib/planningEngine";
import { cn } from "@/lib/utils";

const fmtBRL = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
const fmtBRL2 = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtKm = (v: number) =>
  `${v.toLocaleString("pt-BR", { maximumFractionDigits: 0 })} km`;

interface Props {
  onAdjust: () => void;
  onRedo: () => void;
}

export function PainelResumo({ onAdjust, onRedo }: Props) {
  const navigate = useNavigate();
  const s = usePlanningSnapshot();
  const isLiquido = s.mainGoalType === "liquido";

  return (
    <div className="mx-auto w-full max-w-md space-y-3 px-4 py-5 pb-28 animate-fade-in">
      {/* Hero — meta principal */}
      <div className="rounded-3xl border border-primary/30 bg-gradient-to-br from-primary/[0.1] via-primary/[0.04] to-transparent p-5 shadow-[0_0_0_1px_hsl(var(--primary)/0.1),0_18px_42px_-26px_hsl(var(--primary)/0.6)]">
        <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-primary/90">
          <Target className="h-3.5 w-3.5" /> Sua meta de {isLiquido ? "lucro líquido" : "ganho bruto"}
        </div>
        <div className="mt-2 text-3xl font-bold tabular-nums leading-none text-foreground">
          {fmtBRL(isLiquido ? s.netTarget : s.grossTarget)}
        </div>
        {isLiquido && s.requiredGrossRevenue > 0 && (
          <div className="mt-1.5 text-[12px] text-muted-foreground">
            Faturamento necessário:{" "}
            <span className="font-semibold tabular-nums text-foreground/90">
              {fmtBRL(s.requiredGrossRevenue)}
            </span>
          </div>
        )}
        {!isLiquido && s.consideredCosts > 0 && (
          <div className="mt-1.5 text-[12px] text-muted-foreground">
            Lucro estimado:{" "}
            <span className="font-semibold tabular-nums text-foreground/90">
              {fmtBRL(s.estimatedNetProfit)}
            </span>
          </div>
        )}
      </div>

      {/* Status / mensagem quando relevante */}
      {(s.status === "completed" ||
        s.status === "no_workdays" ||
        s.status === "invalid_avg_km" ||
        s.status === "needs_adjustment" ||
        s.status === "behind" ||
        s.status === "ahead") && (
        <StatusBanner status={s.status} message={s.message} />
      )}

      {/* Resumo do plano — substitui o antigo "Progresso do mês" */}
      <div className="rounded-2xl border border-border/60 bg-card/60 p-4">
        <div className="mb-3 flex items-center justify-between">
          <div className="text-[12px] font-semibold text-foreground/90">Resumo do plano</div>
          <div className="text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
            {isLiquido ? "Meta líquida" : "Meta bruta"}
          </div>
        </div>
        <ul className="space-y-2 text-[12.5px]">
          <Row label="Faturamento necessário" value={fmtBRL(s.requiredGrossRevenue)} />
          <Row
            label="Dias planejados"
            value={`${s.selectedWorkdaysCount} ${s.selectedWorkdaysCount === 1 ? "dia" : "dias"}`}
          />
          <Row
            label="KM médio por dia"
            value={s.averageKmPerDay > 0 ? fmtKm(s.averageKmPerDay) : "—"}
          />
          <Row
            label="KM planejado no período"
            value={s.plannedKmTotal > 0 ? fmtKm(s.plannedKmTotal) : "—"}
          />
          <Row
            label="R$/KM mínimo necessário"
            value={s.requiredRpk > 0 ? `${fmtBRL2(s.requiredRpk)}/km` : "—"}
            strong
          />
          <Row
            label="Custos do veículo"
            value={s.consideredCosts > 0 ? `${fmtBRL(s.consideredCosts)}/mês` : "Não informado"}
          />
        </ul>
      </div>

      {/* Cards principais */}
      <div className="grid grid-cols-2 gap-2.5">
        <Card
          icon={CalendarDays}
          label="Dias restantes"
          value={`${s.remainingWorkdaysCount}`}
          hint={`de ${s.selectedWorkdaysCount} planejados`}
        />
        <Card
          icon={Wallet}
          label="Falta para a meta"
          value={fmtBRL(s.activeRemainingAmount)}
        />
        <Card
          icon={TrendingUp}
          label={isLiquido ? "Meta diária de faturamento" : "Meta diária"}
          value={
            isLiquido
              ? s.dailyGrossNeeded > 0
                ? `${fmtBRL(s.dailyGrossNeeded)}/dia`
                : "—"
              : s.activeSuggestedDailyGoal > 0
                ? `${fmtBRL(s.activeSuggestedDailyGoal)}/dia`
                : "—"
          }
          hint={
            isLiquido && s.activeSuggestedDailyGoal > 0
              ? `~${fmtBRL(s.activeSuggestedDailyGoal)}/dia de líquido`
              : undefined
          }
        />
        <Card
          icon={Gauge}
          label="Gastos registrados"
          value={fmtBRL(s.currentExpenses)}
          hint="No mês corrente"
        />
      </div>

      {/* Bloco KM Inteligente */}
      <div className="rounded-2xl border border-teal-500/25 bg-gradient-to-br from-teal-500/[0.07] via-teal-500/[0.03] to-transparent p-4">
        <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-teal-300">
          <Route className="h-3 w-3" /> KM Inteligente
        </div>
        <div className="mt-3 grid grid-cols-3 gap-2">
          <Mini
            label="KM planejado"
            value={s.plannedKmTotal > 0 ? fmtKm(s.plannedKmTotal) : "—"}
          />
          <Mini
            label="KM restante planejado"
            value={s.plannedKmTotal > 0 ? fmtKm(s.remainingPlannedKm) : "—"}
          />
          <Mini
            label="KM por dia restante"
            value={s.averageKmPerWorkday > 0 ? fmtKm(s.averageKmPerWorkday) : "—"}
          />
        </div>
        <div className="mt-3 flex items-center justify-between rounded-xl border border-teal-500/20 bg-teal-500/[0.05] px-3 py-2.5">
          <div className="flex items-center gap-1.5 text-[11px] font-medium text-teal-200">
            <Sparkles className="h-3.5 w-3.5" /> R$/KM inteligente
          </div>
          <div className="text-[14px] font-bold tabular-nums text-foreground">
            {s.smartRpk > 0 ? `${fmtBRL2(s.smartRpk)}/km` : "—"}
          </div>
        </div>
        <p className="mt-2 text-[10.5px] leading-snug text-muted-foreground">
          Esse valor mostra quanto cada KM restante precisa render para sua meta fazer sentido.
        </p>
      </div>

      {/* Custos detalhados */}
      {s.costItems.length > 0 && (
        <div className="rounded-2xl border border-border/60 bg-card/60 p-4">
          <div className="mb-2 flex items-center justify-between">
            <div className="text-[12px] font-semibold text-foreground/90">Custos considerados</div>
            <button
              type="button"
              onClick={() =>
                navigate("/ajustes/veiculos/custos", {
                  state: { returnTo: "/ajustes/planejamento" },
                })
              }
              className="text-[11px] font-medium text-primary hover:underline"
            >
              Editar
            </button>
          </div>
          <ul className="space-y-1.5">
            {s.costItems.map((it, i) => (
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

      {/* Ações */}
      <div className="grid grid-cols-2 gap-2.5 pt-1">
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
    </div>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <li className="flex items-center justify-between gap-2">
      <span className="text-muted-foreground">{label}</span>
      <span
        className={cn(
          "tabular-nums",
          strong ? "font-bold text-primary" : "font-semibold text-foreground/90",
        )}
      >
        {value}
      </span>
    </li>
  );
}

function StatusBanner({
  status,
  message,
}: {
  status: PlanningSnapshot["status"];
  message: string;
}) {
  const tone =
    status === "completed"
      ? "border-primary/30 bg-primary/[0.07] text-primary"
      : status === "ahead"
      ? "border-teal-500/30 bg-teal-500/[0.07] text-teal-200"
      : status === "behind" || status === "needs_adjustment"
      ? "border-amber-500/30 bg-amber-500/[0.07] text-amber-200"
      : "border-border/60 bg-card/60 text-muted-foreground";
  const Icon =
    status === "completed" ? CheckCircle2 : status === "ahead" ? TrendingUp : AlertCircle;
  return (
    <div className={cn("flex items-start gap-2 rounded-2xl border px-3.5 py-2.5", tone)}>
      <Icon className="mt-0.5 h-4 w-4 shrink-0" />
      <p className="text-[12px] leading-snug">{message}</p>
    </div>
  );
}

function Card({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-2xl border border-border/60 bg-card/60 p-3.5">
      <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
        <Icon className="h-3 w-3" /> {label}
      </div>
      <div className="mt-1.5 text-[15px] font-bold tabular-nums leading-tight text-foreground">
        {value}
      </div>
      {hint && <div className="mt-0.5 text-[10.5px] text-muted-foreground">{hint}</div>}
    </div>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-teal-500/15 bg-background/40 p-2.5">
      <div className="text-[9.5px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
        {label}
      </div>
      <div className="mt-1 text-[13px] font-bold tabular-nums leading-tight text-foreground">
        {value}
      </div>
    </div>
  );
}
