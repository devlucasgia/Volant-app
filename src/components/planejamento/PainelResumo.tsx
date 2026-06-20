import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Target,
  TrendingUp,
  Pencil,
  RotateCcw,
  Coins,
  AlertCircle,
  CheckCircle2,
  Gauge,
  ChevronDown,
  ArrowDownCircle,
  ArrowUpCircle,
} from "lucide-react";
import { usePlanningSnapshot, type PlanningSnapshot } from "@/lib/planningEngine";
import { useHeroMetric } from "@/lib/heroMetric";
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
  const [heroMetric, setHeroMetric] = useHeroMetric();
  const isGross = heroMetric === "gross";
  const [costsOpen, setCostsOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);

  // Valores ativos pela lente
  const activeTarget = isGross ? s.homeGrossTarget : s.homeNetTarget;
  const activeRemaining = isGross ? s.homeRemainingGross : s.homeRemainingNet;
  const activeDaily = isGross ? s.homeDailyGross : s.homeDailyNet;
  const activeSmartRpk = isGross ? s.homeSmartRpkGross : s.homeSmartRpkNet;

  const rpkTone: "ok" | "ahead" | "behind" =
    activeSmartRpk > 0 && s.requiredRpk > 0
      ? activeSmartRpk > s.requiredRpk * 1.1
        ? "behind"
        : activeSmartRpk < s.requiredRpk * 0.9
          ? "ahead"
          : "ok"
      : "ok";

  const toggleLens = () => setHeroMetric(isGross ? "net" : "gross");

  return (
    <div className="mx-auto w-full max-w-md space-y-3 px-4 py-5 pb-28 animate-fade-in">
      {/* ============ Toggle Bruto / Líquido ============ */}
      <div className="flex items-center justify-center">
        <div className="inline-flex rounded-full border border-border/60 bg-card/60 p-0.5">
          <button
            type="button"
            onClick={() => setHeroMetric("net")}
            className={cn(
              "rounded-full px-3.5 py-1.5 text-[11.5px] font-semibold transition-all",
              !isGross
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            Líquido
          </button>
          <button
            type="button"
            onClick={() => setHeroMetric("gross")}
            className={cn(
              "rounded-full px-3.5 py-1.5 text-[11.5px] font-semibold transition-all",
              isGross
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            Bruto
          </button>
        </div>
      </div>

      {/* ============ Hero 1 — Meta principal (clicável) ============ */}
      <button
        type="button"
        onClick={toggleLens}
        className="block w-full text-left rounded-3xl border border-primary/25 bg-gradient-to-br from-primary/[0.08] via-primary/[0.02] to-transparent p-5 shadow-[0_1px_0_0_hsl(var(--primary)/0.08),0_18px_42px_-32px_hsl(var(--primary)/0.55)] transition-transform active:scale-[0.99]"
      >
        <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-primary/85">
          <Target className="h-3 w-3" /> {isGross ? "Meta bruta (faturamento)" : "Meta líquida (sobra)"}
        </div>
        <div className="mt-2 text-3xl font-bold tabular-nums leading-none text-foreground">
          {fmtBRL(activeTarget)}
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          {activeRemaining > 0 && (
            <Chip label="Falta" value={fmtBRL(activeRemaining)} />
          )}
          {activeDaily > 0 && (
            <Chip label="Por dia" value={fmtBRL(activeDaily)} />
          )}
          <span className="ml-auto text-[10px] text-muted-foreground/70">toque p/ trocar</span>
        </div>
      </button>

      {/* ============ Status banner ============ */}
      {(s.status === "completed" ||
        s.status === "no_workdays" ||
        s.status === "invalid_avg_km" ||
        s.status === "needs_adjustment" ||
        s.status === "behind" ||
        s.status === "ahead") && (
        <StatusBanner status={s.status} message={s.message} />
      )}

      {/* ============ Hero 2 — R$/KM Inteligente ============ */}
      <div
        className={cn(
          "rounded-2xl border p-4 transition-colors",
          rpkTone === "behind" &&
            "border-amber-500/35 bg-gradient-to-br from-amber-500/[0.07] via-amber-500/[0.02] to-transparent",
          rpkTone === "ahead" &&
            "border-emerald-500/30 bg-gradient-to-br from-emerald-500/[0.07] via-emerald-500/[0.02] to-transparent",
          rpkTone === "ok" &&
            "border-border/60 bg-card/60",
        )}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              <TrendingUp className="h-3 w-3" /> R$/KM Inteligente · {isGross ? "Bruto" : "Líquido"}
            </div>
            <div className="mt-2 text-[26px] font-bold tabular-nums leading-none text-foreground">
              {activeSmartRpk > 0 ? `${fmtBRL2(activeSmartRpk)}/km` : "—"}
            </div>
          </div>

          {rpkTone !== "ok" && activeSmartRpk > 0 && (
            <span
              className={cn(
                "shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider",
                rpkTone === "behind"
                  ? "border-amber-500/40 bg-amber-500/10 text-amber-300"
                  : "border-emerald-500/40 bg-emerald-500/10 text-emerald-300",
              )}
            >
              {rpkTone === "behind" ? "↑ acima do plano" : "↓ folga"}
            </span>
          )}
        </div>

        {s.plannedKmTotal > 0 ? (
          <div className="mt-3 grid grid-cols-2 gap-2">
            <MiniStat
              label="KM a alcançar"
              value={fmtKm(s.remainingPlannedKm)}
              tone={rpkTone}
            />
            <MiniStat
              label="Dias para meta"
              value={`${s.remainingWorkdaysCount} ${s.remainingWorkdaysCount === 1 ? "dia" : "dias"}`}
              tone={rpkTone}
            />
          </div>
        ) : (
          <p className="mt-3 text-[11px] leading-snug text-muted-foreground">
            Defina seus dias e KM médio para calcular.
          </p>
        )}
      </div>

      {/* ============ Composição (lente ativa) ============ */}
      <CompositionCard snapshot={s} isGross={isGross} />

      {/* ============ Detalhes do plano (accordion) ============ */}
      <button
        type="button"
        onClick={() => setDetailsOpen((v) => !v)}
        className="flex w-full items-center justify-between rounded-2xl border border-border/60 bg-card/60 px-4 py-3 text-left transition-colors hover:bg-muted/30"
      >
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-muted/40 text-muted-foreground">
            <Gauge className="h-3.5 w-3.5" />
          </span>
          <span className="text-[13px] font-semibold text-foreground/90">Detalhes do plano</span>
        </div>
        <ChevronDown
          className={cn(
            "h-4 w-4 text-muted-foreground transition-transform",
            detailsOpen && "rotate-180",
          )}
        />
      </button>
      {detailsOpen && (
        <div className="rounded-2xl border border-border/60 bg-card/60 p-4 animate-fade-in">
          <ul className="divide-y divide-border/40">
            <Row
              label="R$/km mínimo necessário"
              value={s.requiredRpk > 0 ? `${fmtBRL2(s.requiredRpk)}/km` : "—"}
              strong
            />
            <Row
              label="KM planejado no período"
              value={s.plannedKmTotal > 0 ? fmtKm(s.plannedKmTotal) : "—"}
            />
            <Row
              label="KM médio por dia"
              value={s.averageKmPerDay > 0 ? fmtKm(s.averageKmPerDay) : "—"}
            />
            <Row
              label="Dias planejados"
              value={`${s.selectedWorkdaysCount} ${s.selectedWorkdaysCount === 1 ? "dia" : "dias"}`}
            />
            <Row label="Dias restantes" value={`${s.remainingWorkdaysCount}`} />
            <Row
              label="Faturamento necessário"
              value={s.homeGrossTarget > 0 ? fmtBRL(s.homeGrossTarget) : "—"}
            />
            <Row
              label="Gastos registrados"
              value={`${fmtBRL(s.currentExpenses)} (mês)`}
            />
          </ul>
        </div>
      )}

      {/* ============ Custos considerados ============ */}
      {(s.costItems.length > 0 || s.variableCostItems.length > 0) && (
        <div className="rounded-2xl border border-border/60 bg-card/60 overflow-hidden">
          <button
            type="button"
            onClick={() => setCostsOpen((v) => !v)}
            className="flex w-full items-center justify-between px-4 py-3 text-left transition-colors hover:bg-muted/30"
          >
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-muted/40 text-muted-foreground">
                <Coins className="h-3.5 w-3.5" />
              </span>
              <div className="min-w-0">
                <div className="text-[13px] font-semibold text-foreground/90">
                  Custos considerados
                </div>
                <div className="text-[11px] text-muted-foreground">
                  {fmtBRL(s.consideredCosts)}/mês na meta
                </div>
              </div>
            </div>
            <ChevronDown
              className={cn(
                "h-4 w-4 text-muted-foreground transition-transform",
                costsOpen && "rotate-180",
              )}
            />
          </button>
          {costsOpen && (
            <div className="border-t border-border/40 px-4 py-3 animate-fade-in space-y-3">
              {s.costItems.length > 0 && (
                <div>
                  <div className="mb-1.5 text-[10.5px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/80">
                    Fixos
                  </div>
                  <ul className="space-y-1.5">
                    {s.costItems.map((it, i) => (
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
                </div>
              )}
              {s.variableCostItems.length > 0 && (
                <div className="border-t border-border/40 pt-3">
                  <div className="mb-1.5 text-[10.5px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/80">
                    Variáveis (estimados)
                  </div>
                  <ul className="space-y-1.5">
                    {s.variableCostItems.map((it, i) => (
                      <li
                        key={`v-${i}`}
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
              <button
                type="button"
                onClick={() =>
                  navigate("/ajustes/veiculos/custos", {
                    state: { returnTo: "/ajustes/planejamento" },
                  })
                }
                className="mt-1 inline-flex items-center gap-1.5 text-[11.5px] font-semibold text-primary hover:underline"
              >
                <Pencil className="h-3 w-3" /> Editar custos
              </button>
            </div>
          )}
        </div>
      )}

      {/* ============ Ações ============ */}
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

/* ===================== Composition Card ===================== */

function CompositionCard({
  snapshot: s,
  isGross,
}: {
  snapshot: PlanningSnapshot;
  isGross: boolean;
}) {
  const liquido = s.homeNetTarget;
  const fixos = s.consideredCosts;
  const variaveis = s.variableCosts;
  const bruto = s.homeGrossTarget;

  if (bruto <= 0 && liquido <= 0) return null;

  return (
    <div className="rounded-2xl border border-border/60 bg-card/60 p-4">
      <div className="mb-2.5 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
        <Coins className="h-3 w-3" />
        {isGross ? "Como chega no bruto" : "Como chega no líquido"}
      </div>

      {isGross ? (
        <>
          <ul className="space-y-1.5">
            <CompLine label="Meta líquida (sobra)" value={fmtBRL(liquido)} />
            <CompLine
              label="Custos fixos"
              value={fmtBRL(fixos)}
              sign="+"
              muted
            />
            <li className="mt-1.5 flex items-center justify-between border-t border-border/40 pt-2.5">
              <span className="text-[12px] font-semibold text-foreground/90">
                = Faturamento bruto necessário
              </span>
              <span className="text-[14px] font-bold tabular-nums text-primary">
                {fmtBRL(bruto)}
              </span>
            </li>
          </ul>
          {variaveis > 0 && (
            <div className="mt-2.5 rounded-lg border border-dashed border-border/50 bg-muted/20 px-2.5 py-2 text-[11.5px] leading-snug text-muted-foreground">
              Combustível e alimentação (estimativa, não entra na meta):{" "}
              <span className="font-semibold tabular-nums text-foreground/80">{fmtBRL(variaveis)}</span>
            </div>
          )}
        </>
      ) : (
        <>
          <ul className="space-y-1.5">
            <CompLine label="Faturamento bruto previsto" value={fmtBRL(bruto)} />
            <CompLine
              label="Custos fixos"
              value={fmtBRL(fixos)}
              sign="-"
              muted
              negative
            />
            <li className="mt-1.5 flex items-center justify-between border-t border-border/40 pt-2.5">
              <span className="text-[12px] font-semibold text-foreground/90">
                = Sobra líquida
              </span>
              <span className="text-[14px] font-bold tabular-nums text-primary">
                {fmtBRL(liquido)}
              </span>
            </li>
          </ul>
          {variaveis > 0 && (
            <div className="mt-2.5 rounded-lg border border-dashed border-border/50 bg-muted/20 px-2.5 py-2 text-[11.5px] leading-snug text-muted-foreground">
              Combustível e alimentação (estimativa, não entra na meta):{" "}
              <span className="font-semibold tabular-nums text-foreground/80">{fmtBRL(variaveis)}</span>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function CompLine({
  label,
  value,
  sign,
  muted,
  negative,
}: {
  label: string;
  value: string;
  sign?: "+" | "-";
  muted?: boolean;
  negative?: boolean;
}) {
  const Icon = sign === "+" ? ArrowUpCircle : sign === "-" ? ArrowDownCircle : null;
  return (
    <li className="flex items-center justify-between gap-2">
      <span
        className={cn(
          "flex items-center gap-1.5 text-[12.5px]",
          muted ? "text-muted-foreground" : "text-foreground/90",
        )}
      >
        {Icon && (
          <Icon
            className={cn(
              "h-3 w-3",
              negative ? "text-rose-400/70" : "text-emerald-400/70",
            )}
          />
        )}
        {label}
      </span>
      <span
        className={cn(
          "tabular-nums text-[12.5px] font-semibold",
          muted ? "text-foreground/80" : "text-foreground/95",
        )}
      >
        {sign && <span className="mr-0.5 text-muted-foreground">{sign}</span>}
        {value}
      </span>
    </li>
  );
}

/* ===================== Bits ===================== */

function Chip({ label, value }: { label: string; value: string }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-border/50 bg-background/40 px-2.5 py-1 text-[11px] text-muted-foreground">
      {label}
      <span className="ml-0.5 font-semibold tabular-nums text-foreground/90">{value}</span>
    </span>
  );
}

function MiniStat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "ok" | "ahead" | "behind";
}) {
  const toneClass =
    tone === "behind"
      ? "border-amber-500/40 bg-amber-500/[0.08]"
      : tone === "ahead"
        ? "border-emerald-500/35 bg-emerald-500/[0.07]"
        : "border-border/60 bg-card/70";
  const valueClass =
    tone === "behind"
      ? "text-amber-200"
      : tone === "ahead"
        ? "text-emerald-200"
        : "text-foreground/95";
  return (
    <div className={cn("rounded-xl border px-2.5 py-1.5 transition-colors", toneClass)}>
      <div className="text-[9.5px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/85">
        {label}
      </div>
      <div className={cn("mt-0.5 text-[13.5px] font-bold tabular-nums leading-tight", valueClass)}>
        {value}
      </div>
    </div>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <li className="flex items-center justify-between gap-2 py-2 first:pt-0 last:pb-0">
      <span className="text-[12.5px] text-muted-foreground">{label}</span>
      <span
        className={cn(
          "tabular-nums text-[12.5px]",
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
