import { useMemo, useState } from "react";
import { PageHeader, StatCard } from "@/components/ui-bits";
import { useData } from "@/context/DataContext";
import { useUI } from "@/context/UIContext";
import { byApp, byExpenseCategory, filterByPeriod, Period, summarize, totalKmAllTime } from "@/lib/stats";
import { brl, num } from "@/lib/format";
import { APP_META, AppName } from "@/types";
import { cn } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";
import { Wrench, Target, Clock, Route, CalendarDays } from "lucide-react";
import { format, startOfDay, startOfMonth, startOfWeek, endOfMonth, endOfWeek } from "date-fns";
import { ptBR } from "date-fns/locale";

const PERIODS: { key: Period; label: string }[] = [
  { key: "day", label: "Hoje" },
  { key: "week", label: "Semana" },
  { key: "month", label: "Mês" },
];

export default function Dashboard() {
  const { entries, settings, carInitialKm, expenseMetaFor } = useData();
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
  const kmSinceMaint = realCurrentKm - lastMaint;
  const kmToNext = settings.maintenanceIntervalKm - kmSinceMaint;
  const showMaintAlert = kmToNext <= 1000;

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
        <div className="flex rounded-xl bg-muted p-1">
          {PERIODS.map((p) => (
            <button
              key={p.key}
              onClick={() => setPeriod(p.key)}
              className={cn(
                "flex-1 rounded-lg py-2 text-sm font-medium transition-all",
                period === p.key ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"
              )}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Net highlight */}
        <div className="overflow-hidden rounded-2xl gradient-success p-5 text-primary-foreground shadow-elevated">
          <div className="text-xs font-medium uppercase tracking-wider opacity-90">Lucro líquido</div>
          <div className="mt-1 text-4xl font-bold tabular-nums">{brl(s.net)}</div>
          <div className="mt-3 flex justify-between text-xs opacity-90">
            <span>Bruto: {brl(s.gross)}</span>
            <span>Gastos: {brl(s.totalExpenses)}</span>
          </div>
        </div>

        {/* Goal */}
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

        {/* Maintenance alert */}
        {showMaintAlert && (
          <button
            type="button"
            onClick={() => navigate("/ajustes")}
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

        {/* Stats grid */}
        <div className="grid grid-cols-2 gap-3">
          <StatCard label="R$ / hora" value={brl(s.perHour)} hint={<><Clock className="mr-1 inline h-3 w-3" />{num(s.totalHours, 1)}h</>} accent="success" />
          <StatCard label="R$ / km" value={brl(s.perKm)} hint={<><Route className="mr-1 inline h-3 w-3" />{num(s.totalKm, 1)} km</>} accent="info" />
          <StatCard label="Bruto" value={brl(s.gross)} hint={`${s.count} corrida${s.count === 1 ? "" : "s"}`} />
          <StatCard label="Gastos" value={brl(s.totalExpenses)} accent="destructive" />
        </div>

        {/* By app */}
        <div className="rounded-2xl border border-border bg-card p-4">
          <div className="mb-3 text-sm font-semibold">Por aplicativo</div>
          <div className="space-y-2">
            {(Object.keys(apps) as AppName[]).map((k) => {
              const v = apps[k];
              const pct = s.gross > 0 ? (v / s.gross) * 100 : 0;
              return (
                <div key={k} className="flex items-center gap-3">
                  <span className={cn("inline-flex h-7 min-w-[68px] items-center justify-center rounded-md px-2 text-xs font-bold", APP_META[k].badgeClass)}>
                    {APP_META[k].label}
                  </span>
                  <div className="relative h-2 flex-1 overflow-hidden rounded-full bg-muted">
                    <div className={cn("absolute inset-y-0 left-0 rounded-full", APP_META[k].badgeClass)} style={{ width: `${pct}%` }} />
                  </div>
                  <span className="w-20 text-right text-sm font-semibold tabular-nums">{brl(v)}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* By expense category */}
        <div className="rounded-2xl border border-border bg-card p-4">
          <div className="mb-3 text-sm font-semibold">Por gastos</div>
          <div className="space-y-2">
            {(Object.keys(expCats) as ExpenseCategory[]).map((k) => {
              const v = expCats[k];
              const pct = s.totalExpenses > 0 ? (v / s.totalExpenses) * 100 : 0;
              const Meta = EXPENSE_META[k];
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
                    <div
                      className="absolute inset-y-0 left-0 rounded-full"
                      style={{ width: `${pct}%`, backgroundColor: Meta.hex }}
                    />
                  </div>
                  <span className="w-20 text-right text-sm font-semibold tabular-nums">{brl(v)}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
}
