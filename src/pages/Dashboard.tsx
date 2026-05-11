import { useMemo, useState } from "react";
import { PageHeader } from "@/components/ui-bits";
import { Segmented } from "@/components/Segmented";
import { useData } from "@/context/DataContext";
import { useUI } from "@/context/UIContext";
import { byApp, byExpenseCategory, filterByPeriod, Period, summarize, totalKmAllTime } from "@/lib/stats";
import { brl, num } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";
import { Wrench, Target, Clock, Route, CalendarDays, Gauge } from "lucide-react";
import { format, startOfDay, startOfMonth, startOfWeek, endOfMonth, endOfWeek } from "date-fns";
import { ptBR } from "date-fns/locale";
import { PlatformLogo } from "@/components/PlatformLogo";

const PERIODS: { key: Period; label: string }[] = [
  { key: "day", label: "Hoje" },
  { key: "week", label: "Semana" },
  { key: "month", label: "Mês" },
];

export default function Dashboard() {
  const { entries, settings, carInitialKm, expenseMetaFor, platformMetaFor } = useData();
  const { openDrawer } = useUI();
  const [period, setPeriod] = useState<Period>("day");
  const widgets = settings.dashboardWidgets;

  const periodRangeLabel = useMemo(() => {
    const now = new Date();
    if (period === "day") return format(startOfDay(now), "d 'de' MMMM", { locale: ptBR });
    if (period === "week") {
      const s = startOfWeek(now, { weekStartsOn: 1 });
      const e = endOfWeek(now, { weekStartsOn: 1 });
      return `${format(s, "d MMM", { locale: ptBR })} – ${format(e, "d MMM", { locale: ptBR })}`;
    }
    return format(now, "MMMM 'de' yyyy", { locale: ptBR });
  }, [period]);

  const filtered = useMemo(() => filterByPeriod(entries, period), [entries, period]);
  const s = useMemo(() => summarize(filtered), [filtered]);
  const apps = useMemo(() => byApp(filtered), [filtered]);
  const expCats = useMemo(() => byExpenseCategory(filtered), [filtered]);

  const dayEarnings = useMemo(() => summarize(filterByPeriod(entries, "day")).gross, [entries]);
  const goalPct = settings.dailyGoal > 0 ? Math.min(100, (dayEarnings / settings.dailyGoal) * 100) : 0;

  const totalKmDriven = totalKmAllTime(entries);
  const realCurrentKm = carInitialKm + totalKmDriven;
  const lastMaint = settings.lastMaintenanceKm > 0 ? settings.lastMaintenanceKm : carInitialKm;
  const kmSinceMaint = Math.max(0, realCurrentKm - lastMaint);
  const interval = settings.maintenanceIntervalKm || 0;
  const kmToNext = interval - kmSinceMaint;
  // Show alert when within 10% of the interval (or at least 500 km), or already due/overdue.
  const threshold = interval > 0 ? Math.max(500, Math.round(interval * 0.1)) : 0;
  const showMaintAlert = interval > 0 && kmToNext <= threshold;

  const activeApps = Object.keys(apps)
    .filter((k) => apps[k] > 0)
    .sort((a, b) => apps[b] - apps[a]);
  const activeExp = Object.keys(expCats)
    .filter((k) => expCats[k] > 0)
    .sort((a, b) => expCats[b] - expCats[a]);

  return (
    <>
      <PageHeader
        title="Volant"
        subtitle="Seu controle financeiro"
        right={
          <div className="flex items-center gap-1.5 rounded-full border border-border bg-muted/40 px-3 py-1.5 text-xs font-medium text-muted-foreground">
            <CalendarDays className="h-3.5 w-3.5" />
            <span className="capitalize">{periodRangeLabel}</span>
          </div>
        }
      />
      <div className="space-y-5 px-4 pt-4">
        {/* Period switcher */}
        <Segmented options={PERIODS} value={period} onChange={setPeriod} />

        {/* Net highlight — refined premium card */}
        <div className="relative overflow-hidden rounded-2xl border border-success/30 bg-gradient-to-br from-success/25 via-success/12 to-success/5 p-5 shadow-elevated">
          <div className="absolute -right-12 -top-16 h-44 w-44 rounded-full bg-success/25 blur-3xl" />
          <div className="absolute -left-10 bottom-0 h-32 w-32 rounded-full bg-primary-glow/15 blur-3xl" />
          <div className="relative">
            <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-success">
              <Gauge className="h-3.5 w-3.5" /> Lucro líquido
            </div>
            <div className="mt-1.5 text-[2.5rem] font-bold leading-tight tabular-nums text-foreground">
              {brl(s.net)}
            </div>
            <div className="mt-4 flex items-center gap-4 text-xs">
              <div className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-success/70" />
                <span className="text-muted-foreground">Bruto</span>
                <span className="font-semibold tabular-nums text-foreground/90">{brl(s.gross)}</span>
              </div>
              <div className="h-3 w-px bg-border" />
              <div className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-destructive/70" />
                <span className="text-muted-foreground">Gastos</span>
                <span className="font-semibold tabular-nums text-foreground/90">{brl(s.totalExpenses)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Goal */}
        {widgets.goal && (
          <div className="rounded-2xl border border-border bg-card p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <Target className="h-4 w-4 text-primary" /> Meta diária
              </div>
              <div className="text-sm tabular-nums text-muted-foreground">
                {brl(dayEarnings)} / {brl(settings.dailyGoal)}
              </div>
            </div>
            <Progress value={goalPct} className="mt-3 h-2" />
            <div className="mt-1 text-right text-xs text-muted-foreground">{num(goalPct, 0)}%</div>
          </div>
        )}

        {/* Maintenance alert */}
        {showMaintAlert && (
          <button
            type="button"
            onClick={() => openDrawer({ tab: "expense", category: "manutencao" })}
            className={cn(
              "flex w-full items-start gap-3 rounded-2xl border p-4 text-left transition-colors hover:bg-muted/30",
              kmToNext <= 0 ? "border-destructive/40 bg-destructive/10" : "border-warning/40 bg-warning/10"
            )}
          >
            <Wrench className={cn("mt-0.5 h-5 w-5", kmToNext <= 0 ? "text-destructive" : "text-warning")} />
            <div className="text-sm flex-1">
              <div className="font-semibold">
                {kmToNext <= 0 ? "Manutenção atrasada!" : "Manutenção próxima"}
              </div>
              <div className="text-muted-foreground">
                {kmToNext <= 0
                  ? `Você ultrapassou em ${num(Math.abs(kmToNext), 0)} km`
                  : `Faltam ${num(kmToNext, 0)} km para a próxima revisão`}
              </div>
              <div className="mt-1 text-[11px] font-medium text-primary">Toque para registrar →</div>
            </div>
          </button>
        )}

        {/* Performance — uniform dual indicator */}
        {widgets.stats && (
          <section>
            <div className="mb-2 flex items-center gap-2 px-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              <Gauge className="h-3.5 w-3.5" /> Performance
            </div>
            <div className="grid grid-cols-2 divide-x divide-border rounded-2xl border border-border bg-card p-1 shadow-sm">
              <div className="flex flex-col items-center justify-center gap-1 px-3 py-3.5">
                <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-success">
                  <Clock className="h-3 w-3" /> R$ / hora
                </div>
                <div className="text-2xl font-bold tabular-nums text-foreground leading-none">{brl(s.perHour)}</div>
                <div className="text-[11px] text-muted-foreground tabular-nums">{num(s.totalHours, 1)}h trabalhadas</div>
              </div>
              <div className="flex flex-col items-center justify-center gap-1 px-3 py-3.5">
                <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-info">
                  <Route className="h-3 w-3" /> R$ / km
                </div>
                <div className="text-2xl font-bold tabular-nums text-foreground leading-none">{brl(s.perKm)}</div>
                <div className="text-[11px] text-muted-foreground tabular-nums">{num(s.totalKm, 1)} km rodados</div>
              </div>
            </div>
          </section>
        )}

        {/* By app — dynamic + empty state */}
        {widgets.byApp && (
          <div className="rounded-2xl border border-border bg-card p-4">
            <div className="mb-3 text-sm font-semibold">Por aplicativo</div>
            {activeApps.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border/60 p-4 text-center text-xs text-muted-foreground">
                Nenhum ganho registrado neste período.
              </div>
            ) : (
              <div className="space-y-2">
                {activeApps.map((k) => {
                  const v = apps[k];
                  const pct = s.gross > 0 ? (v / s.gross) * 100 : 0;
                  const meta = platformMetaFor(k);
                  return (
                    <div key={k} className="flex items-center gap-3">
                      <div className="flex min-w-[120px] items-center gap-2">
                        <PlatformLogo platformKey={k} label={meta.label} hex={meta.hex} size="sm" />
                        <span className="truncate text-xs font-semibold text-foreground">{meta.label}</span>
                      </div>
                      <div className="relative h-2 flex-1 overflow-hidden rounded-full bg-muted">
                        <div className="absolute inset-y-0 left-0 rounded-full" style={{ width: `${pct}%`, backgroundColor: meta.hex }} />
                      </div>
                      <span className="w-20 text-right text-sm font-semibold tabular-nums">{brl(v)}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* By expense category */}
        {widgets.byExpense && (
          <div className="rounded-2xl border border-border bg-card p-4">
            <div className="mb-3 text-sm font-semibold">Por gastos</div>
            {activeExp.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border/60 p-4 text-center text-xs text-muted-foreground">
                Nenhum gasto registrado neste período.
              </div>
            ) : (
              <div className="space-y-2">
                {activeExp.map((k) => {
                  const v = expCats[k];
                  const pct = s.totalExpenses > 0 ? (v / s.totalExpenses) * 100 : 0;
                  const Meta = expenseMetaFor(k);
                  return (
                    <div key={k} className="flex items-center gap-3">
                      <span
                        className="inline-flex h-7 min-w-[120px] items-center gap-1.5 rounded-md px-2 text-xs font-bold text-white"
                        style={{ backgroundColor: Meta.hex }}
                      >
                        <span className="text-base leading-none">{Meta.emoji}</span>
                        {Meta.label}
                      </span>
                      <div className="relative h-2 flex-1 overflow-hidden rounded-full bg-muted">
                        <div className="absolute inset-y-0 left-0 rounded-full" style={{ width: `${pct}%`, backgroundColor: Meta.hex }} />
                      </div>
                      <span className="w-20 text-right text-sm font-semibold tabular-nums">{brl(v)}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}
