import { useNavigate } from "react-router-dom";
import {
  Target,
  CalendarDays,
  Gauge,
  Route,
  Car as CarIcon,
  TrendingUp,
  Pencil,
  RotateCcw,
  Wallet,
  Sparkles,
  AlertCircle,
  CheckCircle2,
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
      {/* Hero — meta principal + meta diária ativa */}
      <div className="rounded-3xl border border-primary/30 bg-gradient-to-br from-primary/[0.1] via-primary/[0.04] to-transparent p-5 shadow-[0_0_0_1px_hsl(var(--primary)/0.1),0_18px_42px_-26px_hsl(var(--primary)/0.6)]">
        <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-primary/90">
          <Target className="h-3.5 w-3.5" /> Sua meta de {isLiquido ? "lucro líquido" : "ganho bruto"}
        </div>
        <div className="mt-2 text-3xl font-bold tabular-nums leading-none text-foreground">
          {fmtBRL(isLiquido ? s.netTarget : s.grossTarget)}
        </div>
        <DailyGoalHint snapshot={s} />
      </div>

      {/* Status / mensagem quando relevante */}
      {(s.status === "completed" ||
        s.status === "no_workdays" ||
        s.status === "invalid_rpk" ||
        s.status === "behind" ||
        s.status === "ahead") && (
        <StatusBanner status={s.status} message={s.message} />
      )}

      {/* Progresso */}
      <div className="rounded-2xl border border-border/60 bg-card/60 p-4">
        <div className="mb-2.5 flex items-center justify-between">
          <div className="text-[12px] font-semibold text-foreground/90">Progresso do mês</div>
          <div className="text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
            {isLiquido ? "Líquido" : "Bruto"} principal
          </div>
        </div>
        <ProgressRow
          label={isLiquido ? "Líquido atingido" : "Bruto atingido"}
          value={isLiquido ? s.currentNet : s.currentGross}
          target={isLiquido ? s.netTarget : s.grossTarget}
          primary
        />
        <div className="mt-3">
          <ProgressRow
            label={isLiquido ? "Bruto atingido" : "Líquido atingido"}
            value={isLiquido ? s.currentGross : s.currentNet}
            target={isLiquido ? s.requiredGrossRevenue : s.netTarget}
          />
        </div>
        <div className="mt-3 flex items-center justify-between text-[11px] text-muted-foreground">
          <span>Gastos registrados no mês</span>
          <span className="font-medium tabular-nums text-foreground/85">
            {fmtBRL(s.currentExpenses)}
          </span>
        </div>
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
          icon={Gauge}
          label="R$/km base"
          value={s.baseRpk > 0 ? `R$ ${s.baseRpk.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "—"}
        />
        <Card
          icon={CarIcon}
          label="Custos do veículo"
          value={s.consideredCosts > 0 ? `${fmtBRL(s.consideredCosts)}/mês` : "Não informado"}
        />
      </div>

      {/* Bloco KM Inteligente */}
      <div className="rounded-2xl border border-teal-500/25 bg-gradient-to-br from-teal-500/[0.07] via-teal-500/[0.03] to-transparent p-4">
        <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-teal-300">
          <Route className="h-3 w-3" /> KM Inteligente
        </div>
        <div className="mt-3 grid grid-cols-3 gap-2">
          <Mini label="KM necessário" value={s.requiredKm > 0 ? fmtKm(s.requiredKm) : "—"} />
          <Mini label="KM restante" value={s.requiredKm > 0 ? fmtKm(s.remainingKm) : "—"} />
          <Mini
            label="KM por dia"
            value={s.averageKmPerWorkday > 0 ? fmtKm(s.averageKmPerWorkday) : "—"}
          />
        </div>
        <div className="mt-3 flex items-center justify-between rounded-xl border border-teal-500/20 bg-teal-500/[0.05] px-3 py-2.5">
          <div className="flex items-center gap-1.5 text-[11px] font-medium text-teal-200">
            <Sparkles className="h-3.5 w-3.5" /> R$/km inteligente
          </div>
          <div className="text-[14px] font-bold tabular-nums text-foreground">
            {s.smartRpk > 0 ? fmtBRL2(s.smartRpk) : "—"}
          </div>
        </div>
        <p className="mt-2 text-[10.5px] leading-snug text-muted-foreground">
          Quanto cada KM restante precisa render para atingir sua meta.
        </p>
      </div>

      {/* Card de resultado complementar */}
      {isLiquido && s.requiredGrossRevenue > 0 && (
        <ResultCard
          tone="primary"
          icon={TrendingUp}
          label="Faturamento bruto necessário"
          value={fmtBRL(s.requiredGrossRevenue)}
          hint="Para sobrar sua meta líquida depois dos custos do veículo."
        />
      )}
      {!isLiquido && s.consideredCosts > 0 && (
        <ResultCard
          tone="teal"
          icon={TrendingUp}
          label="Lucro estimado"
          value={fmtBRL(s.estimatedNetProfit)}
          hint="Depois de descontar os custos fixos do seu veículo."
        />
      )}

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

function DailyGoalHint({ snapshot: s }: { snapshot: PlanningSnapshot }) {
  if (s.status === "completed") {
    return (
      <div className="mt-2 text-[12px] text-muted-foreground">
        Meta atingida 🎉 Você pode seguir registrando ou refazer o planejamento.
      </div>
    );
  }
  if (s.status === "no_workdays") {
    return (
      <div className="mt-2 text-[12px] text-muted-foreground">
        Sem dias planejados restantes. Ajuste o planejamento para recalcular.
      </div>
    );
  }
  if (s.activeSuggestedDailyGoal <= 0) return null;
  return (
    <div className="mt-2 text-[12px] text-muted-foreground">
      Meta diária:{" "}
      <span className="font-semibold text-foreground/90 tabular-nums">
        {fmtBRL(s.activeSuggestedDailyGoal)}
      </span>{" "}
      em {s.remainingWorkdaysCount}{" "}
      {s.remainingWorkdaysCount === 1 ? "dia restante" : "dias restantes"}
    </div>
  );
}

function ProgressRow({
  label,
  value,
  target,
  primary,
}: {
  label: string;
  value: number;
  target: number;
  primary?: boolean;
}) {
  const pct = target > 0 ? Math.min(100, Math.max(0, (value / target) * 100)) : 0;
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-[11.5px]">
        <span className={cn("text-muted-foreground", primary && "text-foreground/90 font-medium")}>
          {label}
        </span>
        <span className="font-semibold tabular-nums text-foreground/90">
          {fmtBRL(value)}{" "}
          <span className="text-muted-foreground font-normal">/ {fmtBRL(target)}</span>
        </span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted/40">
        <div
          className={cn(
            "h-full rounded-full transition-all",
            primary ? "bg-primary" : "bg-teal-400/70",
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
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
      : status === "behind"
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

function ResultCard({
  tone,
  icon: Icon,
  label,
  value,
  hint,
}: {
  tone: "primary" | "teal";
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border p-4",
        tone === "primary"
          ? "border-primary/30 bg-gradient-to-br from-primary/[0.08] via-primary/[0.03] to-transparent"
          : "border-teal-500/25 bg-gradient-to-br from-teal-500/[0.08] via-teal-500/[0.03] to-transparent",
      )}
    >
      <div
        className={cn(
          "flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.12em]",
          tone === "primary" ? "text-primary/90" : "text-teal-300",
        )}
      >
        <Icon className="h-3 w-3" /> {label}
      </div>
      <div className="mt-1.5 text-xl font-bold tabular-nums leading-tight text-foreground">
        {value}
      </div>
      <p className="mt-1 text-[11px] leading-snug text-muted-foreground">{hint}</p>
    </div>
  );
}
