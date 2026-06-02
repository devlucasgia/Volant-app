import { useMemo } from "react";
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
} from "lucide-react";
import { useData } from "@/context/DataContext";
import { computeFixedMonthlyCosts, computePlan } from "@/lib/planejamento";
import { cn } from "@/lib/utils";

const fmtBRL = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
const fmtKm = (v: number) =>
  `${v.toLocaleString("pt-BR", { maximumFractionDigits: 0 })} km`;

interface Props {
  onAdjust: () => void;
  onRedo: () => void;
}

export function PainelResumo({ onAdjust, onRedo }: Props) {
  const navigate = useNavigate();
  const { settings, cars } = useData();
  const activeCar = useMemo(() => cars.find((c) => c.is_active) || cars[0] || null, [cars]);
  const costs = useMemo(() => computeFixedMonthlyCosts(activeCar), [activeCar]);

  const selected = settings.planningSelectedDates ?? [];
  const plan = useMemo(
    () =>
      computePlan({
        monthlyGoal: settings.monthlyGoal,
        goalType: settings.goalType,
        diasSelecionados: selected.length,
        custosFixos: costs.total,
        rpkBase: settings.rpkBase,
      }),
    [settings.monthlyGoal, settings.goalType, selected.length, costs.total, settings.rpkBase],
  );

  return (
    <div className="mx-auto w-full max-w-md space-y-3 px-4 py-5 pb-28 animate-fade-in">
      {/* Hero */}
      <div className="rounded-3xl border border-primary/30 bg-gradient-to-br from-primary/[0.1] via-primary/[0.04] to-transparent p-5 shadow-[0_0_0_1px_hsl(var(--primary)/0.1),0_18px_42px_-26px_hsl(var(--primary)/0.6)]">
        <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-primary/90">
          <Target className="h-3.5 w-3.5" /> Sua meta de {settings.goalType === "liquido" ? "lucro líquido" : "ganho bruto"}
        </div>
        <div className="mt-2 text-3xl font-bold tabular-nums leading-none text-foreground">
          {fmtBRL(settings.monthlyGoal || 0)}
        </div>
        {plan.metaDiaria != null && plan.metaDiaria > 0 && (
          <div className="mt-2 text-[12px] text-muted-foreground">
            Meta diária:{" "}
            <span className="font-semibold text-foreground/90 tabular-nums">
              {fmtBRL(plan.metaDiaria)}
            </span>{" "}
            em {selected.length} {selected.length === 1 ? "dia" : "dias"} planejados
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2.5">
        <Card icon={CalendarDays} label="Dias planejados" value={`${selected.length}`} />
        <Card
          icon={Gauge}
          label="R$/km base"
          value={
            settings.rpkBase
              ? `R$ ${settings.rpkBase.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
              : "—"
          }
        />
        <Card
          icon={Route}
          label="KM necessário"
          value={plan.kmNecessario != null ? fmtKm(plan.kmNecessario) : "—"}
        />
        <Card
          icon={CarIcon}
          label="Custos do veículo"
          value={costs.total > 0 ? `${fmtBRL(costs.total)}/mês` : "Não informado"}
        />
      </div>

      {settings.goalType === "liquido" && plan.faturamentoNecessario != null && (
        <ResultCard
          tone="primary"
          icon={TrendingUp}
          label="Faturamento bruto necessário"
          value={fmtBRL(plan.faturamentoNecessario)}
          hint="Para sobrar sua meta líquida depois dos custos do veículo."
        />
      )}
      {settings.goalType === "bruto" && plan.lucroEstimado != null && costs.total > 0 && (
        <ResultCard
          tone="teal"
          icon={TrendingUp}
          label="Lucro estimado"
          value={fmtBRL(plan.lucroEstimado)}
          hint="Depois de descontar os custos fixos do seu veículo."
        />
      )}

      {/* Custos detalhados */}
      {costs.items.length > 0 && (
        <div className="rounded-2xl border border-border/60 bg-card/60 p-4">
          <div className="mb-2 flex items-center justify-between">
            <div className="text-[12px] font-semibold text-foreground/90">
              Custos considerados
            </div>
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
            {costs.items.map((it, i) => (
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

function Card({
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
