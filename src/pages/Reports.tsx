import { useMemo, useState } from "react";
import { PageHeader } from "@/components/ui-bits";
import { Segmented } from "@/components/Segmented";
import { useData } from "@/context/DataContext";
import { Entry, EarningEntry } from "@/types";
import { summarize } from "@/lib/stats";
import { brl, num } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, LabelList,
  Area, AreaChart,
} from "recharts";
import {
  CalendarIcon,
  Wallet, Receipt, CalendarDays, Route, Flag, Clock, Gauge,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useReportWidgets } from "@/lib/reportWidgets";
import {
  format, startOfMonth, endOfMonth, isWithinInterval, eachDayOfInterval,
  startOfDay, endOfDay, subMonths, addMonths,
  startOfYear, endOfYear, eachMonthOfInterval, subYears, addYears, getYear,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { toast } from "sonner";

type RangeMode = "range" | "month" | "year";
type ChartKey = "net" | "expenses" | "km" | "hours";

const CHARTS: { key: ChartKey; label: string; color: string }[] = [
  { key: "net",      label: "Lucro líquido",      color: "hsl(var(--success))" },
  { key: "expenses", label: "Gastos",             color: "hsl(var(--destructive))" },
  { key: "km",       label: "KM rodados",         color: "hsl(var(--info))" },
  { key: "hours",    label: "Horas trabalhadas",  color: "hsl(var(--success))" },
];

export default function Reports() {
  const { entries, expenseMetaFor, platformMetaFor, isSimplePlatform } = useData();
  const [widgets] = useReportWidgets();
  const [mode, setMode] = useState<RangeMode>("month");
  const [monthRef, setMonthRef] = useState<Date>(startOfMonth(new Date()));
  const [yearRef, setYearRef] = useState<Date>(startOfYear(new Date()));
  const [from, setFrom] = useState<Date>(startOfMonth(new Date()));
  const [to, setTo] = useState<Date>(endOfMonth(new Date()));
  const [chart, setChart] = useState<ChartKey>("net");

  const interval = useMemo(() => {
    if (mode === "month") return { start: startOfDay(startOfMonth(monthRef)), end: endOfDay(endOfMonth(monthRef)) };
    if (mode === "year") return { start: startOfDay(startOfYear(yearRef)), end: endOfDay(endOfYear(yearRef)) };
    return { start: startOfDay(from), end: endOfDay(to) };
  }, [mode, monthRef, yearRef, from, to]);

  const filtered = useMemo<Entry[]>(
    () => entries.filter((e) => isWithinInterval(new Date(e.date), interval)),
    [entries, interval]
  );

  const s = useMemo(() => summarize(filtered, isSimplePlatform), [filtered, isSimplePlatform]);

  // Per-day series (also adapts grouping if too long → weekly buckets, or monthly when in year mode)
  const days = useMemo(() => eachDayOfInterval(interval), [interval]);
  const useWeekly = mode !== "year" && days.length > 35;
  const useMonthly = mode === "year";

  const dailySeries = useMemo(() => {
    if (useMonthly) {
      const months = eachMonthOfInterval(interval);
      return months.map((m) => {
        const monthStart = startOfMonth(m);
        const monthEnd = endOfMonth(m);
        const monthEntries = filtered.filter((e) => {
          const d = new Date(e.date);
          return d >= monthStart && d <= monthEnd;
        });
        const earns = monthEntries.filter((e): e is EarningEntry => e.type === "earning");
        const exps = monthEntries.filter((e) => e.type === "expense");
        const km = earns.reduce((a, e) => a + e.km, 0);
        const hours = earns.reduce((a, e) => a + e.hours, 0);
        const gross = earns.reduce((a, e) => a + e.gross, 0);
        const expense = exps.reduce((a, e: any) => a + (e.expense?.amount || 0), 0);
        return { d: m, name: format(m, "MMM", { locale: ptBR }), km, hours, gross, expense, net: gross - expense };
      });
    }
    const buckets = days.map((d) => {
      const dayEntries = filtered.filter((e) => format(new Date(e.date), "yyyy-MM-dd") === format(d, "yyyy-MM-dd"));
      const earns = dayEntries.filter((e): e is EarningEntry => e.type === "earning");
      const exps = dayEntries.filter((e) => e.type === "expense");
      const km = earns.reduce((a, e) => a + e.km, 0);
      const hours = earns.reduce((a, e) => a + e.hours, 0);
      const gross = earns.reduce((a, e) => a + e.gross, 0);
      const expense = exps.reduce((a, e: any) => a + (e.expense?.amount || 0), 0);
      return { d, name: format(d, "dd/MM"), km, hours, gross, expense, net: gross - expense };
    });
    if (!useWeekly) return buckets;
    // Group by week
    const weekly: typeof buckets = [];
    for (let i = 0; i < buckets.length; i += 7) {
      const slice = buckets.slice(i, i + 7);
      const sum = slice.reduce(
        (a, b) => ({ km: a.km + b.km, hours: a.hours + b.hours, gross: a.gross + b.gross, expense: a.expense + b.expense, net: a.net + b.net }),
        { km: 0, hours: 0, gross: 0, expense: 0, net: 0 }
      );
      weekly.push({
        d: slice[0].d, name: `${format(slice[0].d, "dd/MM")}–${format(slice[slice.length - 1].d, "dd/MM")}`,
        ...sum,
      });
    }
    return weekly;
  }, [days, filtered, useWeekly, useMonthly, interval]);

  const periodLabel = mode === "month"
    ? format(monthRef, "MMMM 'de' yyyy", { locale: ptBR })
    : mode === "year"
      ? format(yearRef, "yyyy")
      : `${format(from, "dd/MM/yy")} – ${format(to, "dd/MM/yy")}`;


  // Worked days (days with at least one earning)
  const workedDays = useMemo(() => {
    const set = new Set<string>();
    filtered.forEach((e) => {
      if (e.type === "earning") set.add(format(new Date(e.date), "yyyy-MM-dd"));
    });
    return set.size;
  }, [filtered]);

  const avgPerDay = workedDays > 0 ? s.net / workedDays : 0;

  const exportCSV = () => {
    const rows = [
      ["Data", "Tipo", "App/Categoria", "Km", "Horas", "Corridas", "Valor", "Observações"],
      ...filtered.map((e) =>
        e.type === "earning"
          ? [format(new Date(e.date), "yyyy-MM-dd HH:mm"), "Ganho", platformMetaFor(e.app).label, String(e.km), String(e.hours), String(e.rides ?? ""), e.gross.toFixed(2), e.notes || ""]
          : [format(new Date(e.date), "yyyy-MM-dd HH:mm"), "Gasto", expenseMetaFor(e.expense.category).label, "", "", "", e.expense.amount.toFixed(2), e.expense.description || ""]
      ),
    ];
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `volant-${format(new Date(), "yyyyMMdd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV exportado!");
  };

  const exportPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text("Volant · Relatório", 14, 18);
    doc.setFontSize(10);
    doc.text(`Período: ${periodLabel} · Gerado em ${format(new Date(), "dd/MM/yyyy HH:mm")}`, 14, 25);
    autoTable(doc, {
      startY: 32,
      head: [["Indicador", "Valor"]],
      body: [
        ["Lucro líquido", brl(s.net)],
        ["Bruto", brl(s.gross)],
        ["Gastos", brl(s.totalExpenses)],
        ["Dias trabalhados", String(workedDays)],
        ["KM total", s.totalKm.toFixed(1)],
        ["Corridas total", String(s.totalRides)],
        ["R$ / hora", brl(s.perHour)],
        ["R$ / dia", brl(avgPerDay)],
        ["R$ / km", brl(s.perKm)],
        ["R$ / corrida", brl(s.perRide)],
      ],
      theme: "striped",
    });
    autoTable(doc, {
      head: [["Data", "Tipo", "App/Categoria", "Km", "Horas", "Valor"]],
      body: filtered.map((e) =>
        e.type === "earning"
          ? [format(new Date(e.date), "dd/MM HH:mm"), "Ganho", platformMetaFor(e.app).label, String(e.km), String(e.hours), brl(e.gross)]
          : [format(new Date(e.date), "dd/MM HH:mm"), "Gasto", expenseMetaFor(e.expense.category).label, "-", "-", brl(e.expense.amount)]
      ),
      theme: "grid",
      styles: { fontSize: 9 },
    });
    doc.save(`volant-${format(new Date(), "yyyyMMdd")}.pdf`);
    toast.success("PDF exportado!");
  };

  const chartMeta = CHARTS.find((c) => c.key === chart)!;
  const dataKey = chart === "net" ? "net" : chart === "expenses" ? "expense" : chart === "km" ? "km" : "hours";
  const isMoney = chart === "net" || chart === "expenses";

  const renderChart = () => {
    const tooltipStyle = {
      background: "hsl(var(--card))",
      border: "1px solid hsl(var(--border))",
      borderRadius: 12,
      fontSize: 12,
      boxShadow: "0 10px 30px -12px hsl(var(--background) / 0.6)",
      padding: "8px 12px",
    };
    const fmt = (v: number) => isMoney ? brl(v) : num(v, chart === "hours" ? 1 : 0);
    const count = dailySeries.length;
    // Adaptive bar sizing: fewer points → wider, more points → slimmer
    const barSize = Math.max(10, Math.min(46, Math.round(220 / Math.max(count, 1))));
    const showLabels = count <= 12;
    const tickInterval = count > 24 ? Math.ceil(count / 12) : "preserveStartEnd";
    return (
      <BarChart data={dailySeries} margin={{ top: 24, right: 12, bottom: 4, left: -12 }} barCategoryGap="22%">
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
        <XAxis
          dataKey="name"
          tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
          interval={tickInterval as any}
          tickMargin={6}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
          axisLine={false}
          tickLine={false}
          width={42}
        />
        <Tooltip cursor={{ fill: "hsl(var(--muted) / 0.3)" }} contentStyle={tooltipStyle} formatter={(v: number) => fmt(v)} />
        <Bar dataKey={dataKey} fill={chartMeta.color} radius={[8, 8, 0, 0]} maxBarSize={barSize}>
          {showLabels && (
            <LabelList dataKey={dataKey} position="top" formatter={(v: number) => v ? fmt(v) : ""} style={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
          )}
        </Bar>
      </BarChart>
    );
  };

  return (
    <>
      <PageHeader
        title="Relatórios"
        subtitle={periodLabel}
      />
      <div className="mx-auto w-full max-w-5xl space-y-5 px-4 pt-4 pb-6">
        {/* Mode switch */}
        <Segmented<RangeMode>
          options={[
            { key: "month", label: "Por mês" },
            { key: "year", label: "Por ano" },
            { key: "range", label: "Personalizado" },
          ]}
          value={mode}
          onChange={setMode}
          size="sm"
        />

        {mode === "month" ? (
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={() => setMonthRef(subMonths(monthRef, 1))}>‹</Button>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="flex-1 justify-center font-normal">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  <span className="capitalize">{format(monthRef, "MMMM 'de' yyyy", { locale: ptBR })}</span>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="single" selected={monthRef}
                  onSelect={(d) => d && setMonthRef(startOfMonth(d))}
                  disabled={(d) => d > new Date()}
                  initialFocus locale={ptBR}
                  className={cn("p-3 pointer-events-auto")} />
              </PopoverContent>
            </Popover>
            <Button variant="outline" size="icon"
              disabled={endOfMonth(monthRef) >= endOfMonth(new Date())}
              onClick={() => setMonthRef(addMonths(monthRef, 1))}>›</Button>
          </div>
        ) : mode === "year" ? (
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={() => setYearRef(subYears(yearRef, 1))}>‹</Button>
            <Select
              value={String(getYear(yearRef))}
              onValueChange={(v) => setYearRef(startOfYear(new Date(Number(v), 0, 1)))}
            >
              <SelectTrigger className="flex-1 justify-center font-normal [&>span]:flex [&>span]:items-center [&>span]:justify-center [&>span]:gap-2 [&>span]:flex-1">
                <SelectValue>
                  <CalendarIcon className="h-4 w-4" />
                  <span>{format(yearRef, "yyyy")}</span>
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {Array.from({ length: 8 }, (_, i) => getYear(new Date()) - i).map((y) => (
                  <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" size="icon"
              disabled={getYear(yearRef) >= getYear(new Date())}
              onClick={() => setYearRef(addYears(yearRef, 1))}>›</Button>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="justify-start font-normal">
                  <CalendarIcon className="mr-2 h-4 w-4" /> {format(from, "dd/MM/yy")}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="single" selected={from} onSelect={(d) => d && setFrom(d)}
                  disabled={(d) => d > new Date() || d > to} initialFocus locale={ptBR}
                  className={cn("p-3 pointer-events-auto")} />
              </PopoverContent>
            </Popover>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="justify-start font-normal">
                  <CalendarIcon className="mr-2 h-4 w-4" /> {format(to, "dd/MM/yy")}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="single" selected={to} onSelect={(d) => d && setTo(d)}
                  disabled={(d) => d > new Date() || d < from} initialFocus locale={ptBR}
                  className={cn("p-3 pointer-events-auto")} />
              </PopoverContent>
            </Popover>
          </div>
        )}

        {/* Top hierarchy: Lucro líquido + Média por hora */}
        {(widgets.net || widgets.perHour) && (
          <div className={cn("grid grid-cols-1 gap-3", widgets.net && widgets.perHour && "lg:grid-cols-2")}>
            {widgets.net && (
              <div className="relative overflow-hidden rounded-2xl border border-success/30 bg-gradient-to-br from-success/20 via-success/8 to-success/[0.03] p-4 shadow-[0_8px_32px_-16px_hsl(var(--success)/0.4)]">
                <div className="pointer-events-none absolute -right-16 -top-20 h-44 w-44 rounded-full bg-success/15 blur-[60px]" />
                <div className="pointer-events-none absolute -left-12 -bottom-20 h-32 w-32 rounded-full bg-success/10 blur-[60px]" />
                <div className="relative flex items-center gap-2">
                  <Wallet className="h-4 w-4 text-success" />
                  <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-success">Lucro líquido</div>
                </div>
                <div className="relative mt-2 text-[clamp(24px,5.2vw,32px)] font-bold leading-[1.05] tracking-tight tabular-nums text-foreground">
                  {brl(s.net)}
                </div>
                <div className="relative mt-3 h-14">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={dailySeries} margin={{ top: 2, right: 2, bottom: 0, left: 0 }}>
                      <defs>
                        <linearGradient id="netGlow" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="hsl(var(--success))" stopOpacity={0.4} />
                          <stop offset="100%" stopColor="hsl(var(--success))" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <Area type="monotone" dataKey="net" stroke="hsl(var(--success))" strokeWidth={2} fill="url(#netGlow)" dot={false} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {widgets.perHour && (
              <div className="relative overflow-hidden rounded-2xl border border-success/30 bg-gradient-to-br from-success/18 via-success/8 to-success/[0.03] p-4 shadow-[0_8px_32px_-16px_hsl(var(--success)/0.38)] flex flex-col">
                <div className="pointer-events-none absolute -right-12 -top-16 h-36 w-36 rounded-full bg-success/15 blur-[60px]" />
                <div className="relative flex items-center gap-2">
                  <Gauge className="h-4 w-4 text-success" />
                  <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-success">Média por hora</div>
                </div>
                <div className="relative mt-2 text-[clamp(24px,5.2vw,32px)] font-bold leading-[1.05] tracking-tight tabular-nums text-foreground">
                  {brl(s.perHour)}
                </div>
                <div className="relative mt-auto pt-3 text-[11.5px] leading-snug text-muted-foreground/90">
                  com <span className="font-medium text-foreground/80 tabular-nums">{num(s.totalHours, 1)}h</span> trabalhadas
                </div>
              </div>
            )}
          </div>
        )}

        {/* Secondary KPIs: Bruto + Gastos */}
        {(widgets.gross || widgets.expenses) && (
          <div className={cn("grid gap-3", widgets.gross && widgets.expenses ? "grid-cols-2" : "grid-cols-1")}>
            {widgets.gross && <SideStatCard label="Bruto" value={brl(s.gross)} icon={<Wallet className="h-4 w-4" />} tone="info" />}
            {widgets.expenses && <SideStatCard label="Gastos" value={brl(s.totalExpenses)} icon={<Receipt className="h-4 w-4" />} tone="destructive" />}
          </div>
        )}

        {/* Performance pairs */}
        {(widgets.activeDays || widgets.perDay || widgets.totalKm || widgets.perKm || widgets.trips || widgets.perTrip) && (
          <div className="grid grid-cols-1 gap-2.5 lg:grid-cols-2 2xl:grid-cols-3">
            {(widgets.activeDays || widgets.perDay) && (
              <PairCard
                showTotal={widgets.activeDays}
                showAvg={widgets.perDay}
                totalIcon={<CalendarDays className="h-3.5 w-3.5" />}
                totalLabel="Dias ativos"
                totalValue={`${workedDays} ${workedDays === 1 ? "dia" : "dias"}`}
                avgIcon={<Clock className="h-3.5 w-3.5" />}
                avgLabel="Média / dia"
                avgValue={brl(avgPerDay)}
                accent="success"
              />
            )}
            {(widgets.totalKm || widgets.perKm) && (
              <PairCard
                showTotal={widgets.totalKm}
                showAvg={widgets.perKm}
                totalIcon={<Route className="h-3.5 w-3.5" />}
                totalLabel="KM total"
                totalValue={`${num(s.totalKm, 0)} km`}
                avgIcon={<Route className="h-3.5 w-3.5" />}
                avgLabel="Média / km"
                avgValue={brl(s.perKm)}
                accent="info"
              />
            )}
            {(widgets.trips || widgets.perTrip) && (
              <PairCard
                showTotal={widgets.trips}
                showAvg={widgets.perTrip}
                totalIcon={<Flag className="h-3.5 w-3.5" />}
                totalLabel="Corridas"
                totalValue={String(s.totalRides)}
                avgIcon={<Flag className="h-3.5 w-3.5" />}
                avgLabel="R$ / corrida"
                avgValue={brl(s.perRide)}
                accent="purple"
              />
            )}
          </div>
        )}

        {/* Chart selector + chart */}
        {widgets.chart && (
          <div className="rounded-2xl border border-border bg-card/80 p-4 sm:p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div className="flex flex-col gap-0.5">
                <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Visualização</div>
                <div className="text-sm font-semibold" style={{ color: chartMeta.color }}>{chartMeta.label}</div>
              </div>
              <div className="min-w-[150px]">
                <Select value={chart} onValueChange={(v) => setChart(v as ChartKey)}>
                  <SelectTrigger className="h-9 rounded-xl"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CHARTS.map((c) => (
                      <SelectItem key={c.key} value={c.key}>{c.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                {renderChart()}
              </ResponsiveContainer>
            </div>
          </div>
        )}
        {/* Secondary KPIs: Bruto + Gastos */}
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-2">
          <SideStatCard label="Bruto" value={brl(s.gross)} icon={<Wallet className="h-4 w-4" />} tone="info" />
          <SideStatCard label="Gastos" value={brl(s.totalExpenses)} icon={<Receipt className="h-4 w-4" />} tone="destructive" />
        </div>

        {/* Performance: paired totals/averages with subtle connector.
            Breakpoints chosen to guarantee a safe minimum width per pair card:
            - <md (mobile/small tablet): 1 column, full-width pair per row
            - md–xl (tablet/small desktop): 2 columns, ~min 340px each
            - ≥xl (wide desktop/PWA): 3 columns */}
        <div className="grid grid-cols-1 gap-2.5 lg:grid-cols-2 2xl:grid-cols-3">
          <PairCard
            totalIcon={<CalendarDays className="h-3.5 w-3.5" />}
            totalLabel="Dias ativos"
            totalValue={`${workedDays} ${workedDays === 1 ? "dia" : "dias"}`}
            avgIcon={<Clock className="h-3.5 w-3.5" />}
            avgLabel="Média / dia"
            avgValue={brl(avgPerDay)}
            accent="success"
          />
          <PairCard
            totalIcon={<Route className="h-3.5 w-3.5" />}
            totalLabel="KM total"
            totalValue={`${num(s.totalKm, 0)} km`}
            avgIcon={<Route className="h-3.5 w-3.5" />}
            avgLabel="Média / km"
            avgValue={brl(s.perKm)}
            accent="info"
          />
          <PairCard
            totalIcon={<Flag className="h-3.5 w-3.5" />}
            totalLabel="Corridas"
            totalValue={String(s.totalRides)}
            avgIcon={<Flag className="h-3.5 w-3.5" />}
            avgLabel="R$ / corrida"
            avgValue={brl(s.perRide)}
            accent="purple"
          />
        </div>

        {/* Chart selector + chart */}
        <div className="rounded-2xl border border-border bg-card/80 p-4 sm:p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div className="flex flex-col gap-0.5">
              <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Visualização</div>
              <div className="text-sm font-semibold" style={{ color: chartMeta.color }}>{chartMeta.label}</div>
            </div>
            <div className="min-w-[150px]">
              <Select value={chart} onValueChange={(v) => setChart(v as ChartKey)}>
                <SelectTrigger className="h-9 rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CHARTS.map((c) => (
                    <SelectItem key={c.key} value={c.key}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              {renderChart()}
            </ResponsiveContainer>
          </div>
        </div>


      </div>
    </>
  );
}

function SideStatCard({
  label, value, icon, tone,
}: { label: string; value: string; icon: React.ReactNode; tone: "info" | "destructive" }) {
  const toneMap = {
    info: {
      border: "border-info/25",
      bg: "from-info/12 via-info/6 to-info/[0.03]",
      shadow: "shadow-[0_6px_24px_-14px_hsl(var(--info)/0.4)]",
      blob: "bg-info/15",
      label: "text-info",
      icon: "text-info",
    },
    destructive: {
      border: "border-destructive/25",
      bg: "from-destructive/12 via-destructive/6 to-destructive/[0.03]",
      shadow: "shadow-[0_6px_24px_-14px_hsl(var(--destructive)/0.4)]",
      blob: "bg-destructive/15",
      label: "text-destructive",
      icon: "text-destructive",
    },
  }[tone];
  return (
    <div className={cn("relative overflow-hidden rounded-2xl border bg-gradient-to-br p-3.5", toneMap.border, toneMap.bg, toneMap.shadow)}>
      <div className={cn("pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full blur-[40px]", toneMap.blob)} />
      <div className="relative flex items-center gap-2">
        <span className={cn(toneMap.icon)}>{icon}</span>
        <div className={cn("text-[10px] font-semibold uppercase tracking-[0.16em]", toneMap.label)}>{label}</div>
      </div>
      <div className="relative mt-2 text-[clamp(17px,3.8vw,21px)] font-bold tabular-nums text-foreground break-words leading-tight tracking-tight">
        {value}
      </div>
    </div>
  );
}

function PairCard({
  totalIcon, totalLabel, totalValue,
  avgIcon, avgLabel, avgValue,
  accent = "muted",
}: {
  totalIcon: React.ReactNode; totalLabel: string; totalValue: string;
  avgIcon: React.ReactNode; avgLabel: string; avgValue: string;
  accent?: "success" | "info" | "purple" | "muted";
}) {
  const accentMap: Record<string, { text: string; border: string; line: string; dot: string }> = {
    muted:   { text: "text-muted-foreground",   border: "border-border",                  line: "via-border",                       dot: "bg-muted-foreground/40" },
    success: { text: "text-success",            border: "border-success/25",              line: "via-success/35",                   dot: "bg-success/70" },
    info:    { text: "text-info",               border: "border-info/25",                 line: "via-info/35",                      dot: "bg-info/70" },
    purple:  { text: "text-[hsl(265_85%_70%)]", border: "border-[hsl(265_85%_70%/0.25)]", line: "via-[hsl(265_85%_70%/0.35)]",      dot: "bg-[hsl(265_85%_70%/0.7)]" },
  };
  const a = accentMap[accent];
  const half = "flex min-w-0 flex-col items-center justify-center gap-1 px-2.5 py-2.5 sm:px-3 sm:py-3";
  const labelCls = cn(
    "flex min-w-0 items-center justify-center gap-1 text-center text-[9px] sm:text-[10px] font-semibold uppercase tracking-[0.12em] leading-none whitespace-nowrap",
    a.text
  );
  const valueCls = "text-center text-[clamp(15px,2vw,18px)] font-bold tabular-nums leading-tight tracking-tight text-foreground whitespace-nowrap";
  return (
    <div className={cn("relative overflow-hidden rounded-2xl border bg-card", a.border)}>
      <div className="grid grid-cols-2 items-stretch">
        <div className={half}>
          <div className={labelCls}>
            <span className="shrink-0">{totalIcon}</span>
            <span className="min-w-0">{totalLabel}</span>
          </div>
          <div className={valueCls}>{totalValue}</div>
        </div>
        <div className={cn(half, "bg-muted/15")}>
          <div className={labelCls}>
            <span className="shrink-0">{avgIcon}</span>
            <span className="min-w-0">{avgLabel}</span>
          </div>
          <div className={valueCls}>{avgValue}</div>
        </div>
      </div>
      <div className={cn("pointer-events-none absolute inset-y-2 left-1/2 -translate-x-1/2 w-px bg-gradient-to-b from-transparent to-transparent", a.line)} />
      <div className={cn("pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-1 w-1 rounded-full ring-[3px] ring-card", a.dot)} />
    </div>
  );
}
