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
import {
  format, startOfMonth, endOfMonth, isWithinInterval, eachDayOfInterval,
  startOfDay, endOfDay, subMonths, addMonths,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { toast } from "sonner";

type RangeMode = "range" | "month";
type ChartKey = "net" | "expenses" | "km" | "hours";

const CHARTS: { key: ChartKey; label: string; color: string }[] = [
  { key: "net",      label: "Lucro líquido",      color: "hsl(var(--success))" },
  { key: "expenses", label: "Gastos",             color: "hsl(var(--destructive))" },
  { key: "km",       label: "KM rodados",         color: "hsl(var(--info))" },
  { key: "hours",    label: "Horas trabalhadas",  color: "hsl(var(--success))" },
];

export default function Reports() {
  const { entries, expenseMetaFor, platformMetaFor } = useData();
  const [mode, setMode] = useState<RangeMode>("month");
  const [monthRef, setMonthRef] = useState<Date>(startOfMonth(new Date()));
  const [from, setFrom] = useState<Date>(startOfMonth(new Date()));
  const [to, setTo] = useState<Date>(endOfMonth(new Date()));
  const [chart, setChart] = useState<ChartKey>("net");

  const interval = useMemo(() => {
    if (mode === "month") return { start: startOfDay(startOfMonth(monthRef)), end: endOfDay(endOfMonth(monthRef)) };
    return { start: startOfDay(from), end: endOfDay(to) };
  }, [mode, monthRef, from, to]);

  const filtered = useMemo<Entry[]>(
    () => entries.filter((e) => isWithinInterval(new Date(e.date), interval)),
    [entries, interval]
  );

  const s = useMemo(() => summarize(filtered), [filtered]);

  // Per-day series (also adapts grouping if too long → weekly buckets)
  const days = useMemo(() => eachDayOfInterval(interval), [interval]);
  const useWeekly = days.length > 35;

  const dailySeries = useMemo(() => {
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
  }, [days, filtered, useWeekly]);

  const periodLabel = mode === "month"
    ? format(monthRef, "MMMM 'de' yyyy", { locale: ptBR })
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
    const tooltipStyle = { background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 12, fontSize: 12 };
    const fmt = (v: number) => isMoney ? brl(v) : num(v, chart === "hours" ? 1 : 0);
    return (
      <BarChart data={dailySeries} margin={{ top: 24, right: 8, bottom: 0, left: -16 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
        <XAxis dataKey="name" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} interval="preserveStartEnd" />
        <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
        <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => fmt(v)} />
        <Bar dataKey={dataKey} fill={chartMeta.color} radius={[8, 8, 0, 0]}>
          <LabelList dataKey={dataKey} position="top" formatter={(v: number) => v ? fmt(v) : ""} style={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
        </Bar>
      </BarChart>
    );
  };

  return (
    <>
      <PageHeader
        title="Relatórios"
        subtitle={periodLabel}
        right={
          <Popover>
            <PopoverTrigger asChild>
              <Button size="icon" variant="outline" className="h-9 w-9 rounded-xl" aria-label="Selecionar período">
                <CalendarIcon className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar mode="single" selected={mode === "month" ? monthRef : from}
                onSelect={(d) => { if (!d) return; if (mode === "month") setMonthRef(startOfMonth(d)); else setFrom(d); }}
                disabled={(d) => d > new Date()}
                initialFocus locale={ptBR}
                className={cn("p-3 pointer-events-auto")} />
            </PopoverContent>
          </Popover>
        }
      />
      <div className="space-y-5 px-4 pt-4">
        {/* Mode switch */}
        <Segmented<RangeMode>
          options={[{ key: "month", label: "Por mês" }, { key: "range", label: "Período personalizado" }]}
          value={mode}
          onChange={setMode}
          size="sm"
        />

        {mode === "month" ? (
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={() => setMonthRef(subMonths(monthRef, 1))}>‹</Button>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="flex-1 justify-start font-normal">
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

        {/* Main cards: Lucro líquido (large) + Bruto + Gastos */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-5">
          <div className="sm:col-span-3 relative overflow-hidden rounded-2xl border border-success/40 bg-gradient-to-br from-success/30 via-success/12 to-success/5 p-4 shadow-[0_10px_40px_-12px_hsl(var(--success)/0.55)]">
            <div className="pointer-events-none absolute -right-12 -top-16 h-44 w-44 rounded-full bg-success/30 blur-3xl" />
            <div className="pointer-events-none absolute -left-10 -bottom-16 h-36 w-36 rounded-full bg-success/20 blur-3xl" />
            <div className="relative">
              <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-success">Lucro líquido</div>
              <div className="mt-1 text-[clamp(22px,5vw,30px)] font-bold leading-tight tabular-nums text-foreground drop-shadow-[0_0_18px_hsl(var(--success)/0.35)]">{brl(s.net)}</div>
              <div className="mt-3 h-16">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={dailySeries} margin={{ top: 4, right: 2, bottom: 0, left: 0 }}>
                    <defs>
                      <linearGradient id="netGlow" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="hsl(var(--success))" stopOpacity={0.55} />
                        <stop offset="100%" stopColor="hsl(var(--success))" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <Area type="monotone" dataKey="net" stroke="hsl(var(--success))" strokeWidth={2.2} fill="url(#netGlow)" dot={false} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:col-span-2 sm:grid-cols-1">
            <SideStatCard label="Bruto" value={brl(s.gross)} icon={<Wallet className="h-5 w-5" />} tone="info" />
            <SideStatCard label="Gastos" value={brl(s.totalExpenses)} icon={<Receipt className="h-5 w-5" />} tone="destructive" />
          </div>
        </div>

        {/* Performance: paired totals/averages with subtle connector + Média por hora */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
          <div className="grid grid-cols-1 gap-3 sm:col-span-3 sm:grid-cols-3">
            <PairCard
              totalIcon={<CalendarDays className="h-3.5 w-3.5" />}
              totalLabel="Dias trabalhados"
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
              totalLabel="Corridas total"
              totalValue={String(s.totalRides)}
              avgIcon={<Flag className="h-3.5 w-3.5" />}
              avgLabel="Média / corrida"
              avgValue={brl(s.perRide)}
              accent="purple"
            />
          </div>
          <div className="relative sm:col-span-1 overflow-hidden rounded-2xl border border-success/50 bg-gradient-to-br from-success/25 via-success/12 to-success/5 p-4 shadow-[0_10px_30px_-12px_hsl(var(--success)/0.55)] flex flex-col">
            <div className="pointer-events-none absolute -right-8 -top-10 h-24 w-24 rounded-full bg-success/30 blur-2xl" />
            <div className="relative flex items-center gap-2">
              <Gauge className="h-4 w-4 text-success" />
              <div className="text-[10px] font-semibold uppercase tracking-wider text-success">Média / hora</div>
            </div>
            <div className="relative mt-2 text-2xl font-bold tabular-nums text-foreground leading-none">{brl(s.perHour)}</div>
            <div className="relative mt-2 text-[11px] leading-snug text-muted-foreground">
              com {num(s.totalHours, 1)}h trabalhadas
            </div>
          </div>
        </div>

        {/* Chart selector + chart */}
        <div className="rounded-2xl border border-border bg-card/80 p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Visualização</div>
            <div className="min-w-[160px]">
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
          <div className="mb-1 text-sm font-semibold" style={{ color: chartMeta.color }}>{chartMeta.label}</div>
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

function MiniCard({
  icon, label, value, accent,
}: { icon: React.ReactNode; label: string; value: string; accent?: "muted" | "success" | "info" | "purple" }) {
  const accentMap: Record<string, string> = {
    muted: "text-muted-foreground",
    success: "text-success",
    info: "text-info",
    purple: "text-[hsl(265_85%_70%)]",
  };
  const borderMap: Record<string, string> = {
    muted: "border-border",
    success: "border-success/30",
    info: "border-info/30",
    purple: "border-[hsl(265_85%_70%/0.3)]",
  };
  return (
    <div className={cn("rounded-2xl border bg-card p-3 flex flex-col justify-center min-h-[64px]", borderMap[accent || "muted"])}>
      <div className={cn("flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider", accentMap[accent || "muted"])}>
        {icon}{label}
      </div>
      <div className="mt-1 text-base font-bold tabular-nums text-foreground">{value}</div>
    </div>
  );
}
