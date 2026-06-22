import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Lightbulb,
  ArrowRight,
  BookMarked,
  Route,
  ArrowLeftRight,
  Target,
  Pencil,
  RotateCcw,
} from "lucide-react";
import { usePlanningSnapshot } from "@/lib/planningEngine";
import { getCurrentMonthRealData } from "@/lib/smartKm";
import { useData } from "@/context/DataContext";
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
}

export function PainelResumo({ onAdjust, onRedo }: Props) {
  const navigate = useNavigate();
  const s = usePlanningSnapshot();
  const { entries } = useData();
  const [viewLiquida, setViewLiquida] = useState(false);

  const realData = useMemo(() => getCurrentMonthRealData(entries), [entries]);
  const daysWorkedThisMonth = realData.daysWorkedThisMonth;

  const hoje = new Date();
  const diaAtual = hoje.getDate();
  const diasNoMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0).getDate();
  const timelinePct = Math.min(100, Math.max(0, ((diaAtual - 1) / diasNoMes) * 100));
  const mesLabel = hoje
    .toLocaleDateString("pt-BR", { month: "long" })
    .toUpperCase();

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

  return (
    <div className="mx-auto w-full max-w-md space-y-4 px-4 py-5 pb-28 animate-fade-in">
      {/* ============ 1. Timeline ============ */}
      <div className="flex items-center gap-2.5 px-1 text-[11.5px] text-muted-foreground">
        <span>
          Dia <b className="font-semibold text-foreground/85">{diaAtual}</b>
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
      <div className="relative overflow-hidden rounded-2xl border border-primary/25 bg-gradient-to-br from-primary/[0.10] via-primary/[0.02] to-transparent p-5 shadow-[0_18px_40px_-20px_hsl(var(--primary)/0.55)]">
        {/* glow radial canto superior direito */}
        <div className="pointer-events-none absolute -right-8 -top-8 h-40 w-40 rounded-full bg-primary/[0.08] blur-2xl" />
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
            <div className="bg-gradient-to-b from-white to-emerald-200 bg-clip-text text-transparent text-3xl font-bold tabular-nums leading-none">
              {fmtBRL(viewLiquida ? s.homeDailyNet : s.homeDailyGross)}
            </div>
            <div className="mt-1 text-[11px] text-muted-foreground">pra faturar</div>
          </div>
          <div className="pl-3">
            <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              R$/km mínimo
            </div>
            <div className="bg-gradient-to-b from-white to-emerald-200 bg-clip-text text-transparent text-3xl font-bold tabular-nums leading-none">
              {s.homeSmartRpkGross > 0 ? `${fmtBRL2(s.homeSmartRpkGross)}/km` : "—"}
            </div>
            <div className="mt-1 text-[11px] text-muted-foreground">por corrida</div>
          </div>
        </div>

        <div className="mt-4 border-t border-primary/15 pt-2.5 text-[11px] leading-snug text-muted-foreground">
          Fixos até você lançar novos registros — aí recalculam.
        </div>
      </div>

      {/* ============ 3. Insights placeholder ============ */}
      <div className="mt-7">
        <div className="mb-1.5 flex items-center gap-1.5 px-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          <Lightbulb className="h-3 w-3" /> Insights inteligentes
        </div>
        <div className="rounded-2xl border border-dashed border-border/50 bg-card/40 p-4 text-center text-[12px] text-muted-foreground">
          Insights do seu plano chegam em breve.
        </div>
      </div>

      {/* ============ 4. Plano vs Realizado ============ */}
      <div className="mt-7">
        <div className="mb-2 flex items-center gap-1.5 px-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          <ArrowRight className="h-3 w-3" /> Plano vs realizado
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <div className="mb-1 flex items-center gap-1 px-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground opacity-60">
              <BookMarked className="h-3 w-3" /> Plano de {mesLabel}
            </div>
            <div className="rounded-2xl border border-dashed border-border/60 bg-muted/15 p-3">
              <PlanoLine label="Meta líquida" value={fmtBRL(s.homeNetTarget)} />
              <PlanoLine label="Dias" value={`${s.selectedWorkdaysCount}`} />
              <PlanoLine
                label="KM/dia"
                value={s.averageKmPerDay > 0 ? fmtKm(s.averageKmPerDay) : "—"}
              />
              <PlanoLine
                label="R$/km alvo"
                value={s.requiredRpk > 0 ? fmtBRL2(s.requiredRpk) : "—"}
              />
            </div>
          </div>

          <div>
            <div className="mb-1 flex items-center gap-1 pl-1 text-[10px] font-semibold uppercase tracking-wider text-primary">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inset-0 animate-ping rounded-full bg-primary/60" />
                <span className="relative h-1.5 w-1.5 rounded-full bg-primary" />
              </span>
              Até agora
            </div>
            <div className="rounded-2xl border border-border/60 bg-card/60 p-3">
              <PlanoLine
                label="Já fiz"
                value={fmtBRL(s.currentGross)}
                valueClass="text-primary"
              />
              <PlanoLine label="Dias rodados" value={`${daysWorkedThisMonth}`} />
              <PlanoLine label="KM rodado" value={fmtKm(s.currentKm)} />
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
                    ? "zerados nesta visão — esse dinheiro é só seu"
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
                  fora da meta — só referência
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
