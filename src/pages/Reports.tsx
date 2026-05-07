import { useMemo, useState } from "react";
import { PageHeader, StatCard } from "@/components/ui-bits";
import { useData } from "@/context/DataContext";
import { byApp, byExpenseCategory, summarize } from "@/lib/stats";
import { APP_META, AppName, Entry, EarningEntry } from "@/types";
import { brl, num } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis,
  Line, LineChart, PieChart, Pie, Cell, Legend,
} from "recharts";
import { Download, FileText, CalendarIcon, TrendingUp, TrendingDown, Clock, Route } from "lucide-react";
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
type ChartKey = "apps" | "expenses" | "perHour" | "perKm" | "kmTotal" | "hoursTotal" | "netDaily";

const APP_HEX: Record<AppName, string> = {
  uber: "#000000", "99": "#FFCC00", indriver: "#A4E333", particular: "#3B82F6",
};

const CHARTS: { key: ChartKey; label: string }[] = [
  { key: "netDaily", label: "Lucro líquido por dia" },
  { key: "apps", label: "Comparativo entre apps (pizza)" },
  { key: "expenses", label: "Distribuição de gastos (pizza)" },
  { key: "perHour", label: "R$ por hora (linha)" },
  { key: "perKm", label: "R$ por km (linha)" },
  { key: "kmTotal", label: "Km rodados por dia (barras)" },
  { key: "hoursTotal", label: "Horas trabalhadas por dia (barras)" },
];

export default function Reports() {
  const { entries, expenseMetaFor } = useData();
  const [mode, setMode] = useState<RangeMode>("month");
  const [monthRef, setMonthRef] = useState<Date>(startOfMonth(new Date()));
  const [from, setFrom] = useState<Date>(startOfMonth(new Date()));
  const [to, setTo] = useState<Date>(endOfMonth(new Date()));
  const [chart, setChart] = useState<ChartKey>("netDaily");

  const interval = useMemo(() => {
    if (mode === "month") return { start: startOfDay(startOfMonth(monthRef)), end: endOfDay(endOfMonth(monthRef)) };
    return { start: startOfDay(from), end: endOfDay(to) };
  }, [mode, monthRef, from, to]);

  const filtered = useMemo<Entry[]>(
    () => entries.filter((e) => isWithinInterval(new Date(e.date), interval)),
    [entries, interval]
  );

  const s = useMemo(() => summarize(filtered), [filtered]);
  const apps = useMemo(() => byApp(filtered), [filtered]);
  const expCats = useMemo(() => byExpenseCategory(filtered), [filtered]);

  // Per-day series
  const days = useMemo(() => eachDayOfInterval(interval), [interval]);
  const dailySeries = useMemo(() => {
    return days.map((d) => {
      const dayEntries = filtered.filter((e) => format(new Date(e.date), "yyyy-MM-dd") === format(d, "yyyy-MM-dd"));
      const earns = dayEntries.filter((e): e is EarningEntry => e.type === "earning");
      const exps = dayEntries.filter((e) => e.type === "expense");
      const km = earns.reduce((a, e) => a + e.km, 0);
      const hours = earns.reduce((a, e) => a + e.hours, 0);
      const gross = earns.reduce((a, e) => a + e.gross, 0);
      const expense = exps.reduce((a, e: any) => a + (e.expense?.amount || 0), 0);
      return {
        name: format(d, "dd/MM"),
        km, hours, gross, expense, net: gross - expense,
        perHour: hours > 0 ? Math.round((gross / hours) * 100) / 100 : 0,
        perKm: km > 0 ? Math.round((gross / km) * 100) / 100 : 0,
      };
    });
  }, [days, filtered]);

  const appsChartData = (Object.keys(apps) as AppName[])
    .filter((k) => apps[k] > 0)
    .map((k) => ({ name: APP_META[k].label, value: Math.round(apps[k] * 100) / 100, fill: APP_HEX[k] }));

  const expensesChartData = Object.keys(expCats)
    .filter((k) => expCats[k] > 0)
    .map((k) => {
      const m = expenseMetaFor(k);
      return { name: `${m.emoji} ${m.label}`, value: Math.round(expCats[k] * 100) / 100, fill: m.hex };
    });

  const periodLabel = mode === "month"
    ? format(monthRef, "MMMM 'de' yyyy", { locale: ptBR })
    : `${format(from, "dd/MM/yy")} – ${format(to, "dd/MM/yy")}`;

  const exportCSV = () => {
    const rows = [
      ["Data", "Tipo", "App/Categoria", "Km", "Horas", "Valor", "Observações"],
      ...filtered.map((e) =>
        e.type === "earning"
          ? [format(new Date(e.date), "yyyy-MM-dd HH:mm"), "Ganho", APP_META[e.app].label, String(e.km), String(e.hours), e.gross.toFixed(2), e.notes || ""]
          : [format(new Date(e.date), "yyyy-MM-dd HH:mm"), "Gasto", expenseMetaFor(e.expense.category).label, "", "", e.expense.amount.toFixed(2), e.expense.description || ""]
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
        ["Bruto", brl(s.gross)],
        ["Gastos", brl(s.totalExpenses)],
        ["Lucro líquido", brl(s.net)],
        ["Km total", s.totalKm.toFixed(1)],
        ["Horas", s.totalHours.toFixed(1)],
        ["R$ / hora", brl(s.perHour)],
        ["R$ / km", brl(s.perKm)],
      ],
      theme: "striped",
    });
    autoTable(doc, {
      head: [["Data", "Tipo", "App/Categoria", "Km", "Horas", "Valor"]],
      body: filtered.map((e) =>
        e.type === "earning"
          ? [format(new Date(e.date), "dd/MM HH:mm"), "Ganho", APP_META[e.app].label, String(e.km), String(e.hours), brl(e.gross)]
          : [format(new Date(e.date), "dd/MM HH:mm"), "Gasto", expenseMetaFor(e.expense.category).label, "-", "-", brl(e.expense.amount)]
      ),
      theme: "grid",
      styles: { fontSize: 9 },
    });
    doc.save(`volant-${format(new Date(), "yyyyMMdd")}.pdf`);
    toast.success("PDF exportado!");
  };

  const chartTitle = CHARTS.find((c) => c.key === chart)?.label || "";

  const renderChart = () => {
    const tooltipStyle = { background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 12, fontSize: 12 };

    if (chart === "apps" || chart === "expenses") {
      const data = chart === "apps" ? appsChartData : expensesChartData;
      if (data.length === 0) {
        return (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
            Sem dados no período
          </div>
        );
      }
      return (
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="name" outerRadius={80} innerRadius={40} paddingAngle={2}>
            {data.map((d, i) => <Cell key={i} fill={d.fill} />)}
          </Pie>
          <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => brl(v)} />
          <Legend wrapperStyle={{ fontSize: 11 }} />
        </PieChart>
      );
    }
    if (chart === "netDaily") {
      return (
        <BarChart data={dailySeries} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis dataKey="name" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
          <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
          <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => brl(v)} />
          <Bar dataKey="net" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
        </BarChart>
      );
    }
    const dataKey = chart === "perHour" ? "perHour" : chart === "perKm" ? "perKm" : chart === "kmTotal" ? "km" : "hours";
    const isMoney = chart === "perHour" || chart === "perKm";
    const useLine = chart === "perHour" || chart === "perKm";
    if (useLine) {
      return (
        <LineChart data={dailySeries} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis dataKey="name" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
          <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
          <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => isMoney ? brl(v) : String(v)} />
          <Line type="monotone" dataKey={dataKey} stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
        </LineChart>
      );
    }
    return (
      <BarChart data={dailySeries} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
        <XAxis dataKey="name" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
        <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
        <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => String(v)} />
        <Bar dataKey={dataKey} fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
      </BarChart>
    );
  };

  return (
    <>
      <PageHeader title="Relatórios" subtitle={periodLabel} />
      <div className="space-y-5 px-4 pt-4">
        {/* Mode switch */}
        <div className="flex rounded-xl bg-muted p-1">
          <button onClick={() => setMode("month")}
            className={cn("flex-1 rounded-lg py-2 text-xs font-medium transition-all",
              mode === "month" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground")}>
            Por mês
          </button>
          <button onClick={() => setMode("range")}
            className={cn("flex-1 rounded-lg py-2 text-xs font-medium transition-all",
              mode === "range" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground")}>
            Período personalizado
          </button>
        </div>

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
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {format(from, "dd/MM/yy")}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="single" selected={from}
                  onSelect={(d) => d && setFrom(d)}
                  disabled={(d) => d > new Date() || d > to}
                  initialFocus locale={ptBR}
                  className={cn("p-3 pointer-events-auto")} />
              </PopoverContent>
            </Popover>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="justify-start font-normal">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {format(to, "dd/MM/yy")}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="single" selected={to}
                  onSelect={(d) => d && setTo(d)}
                  disabled={(d) => d > new Date() || d < from}
                  initialFocus locale={ptBR}
                  className={cn("p-3 pointer-events-auto")} />
              </PopoverContent>
            </Popover>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <StatCard label="Lucro líquido" value={brl(s.net)} accent="success" hint={<><TrendingUp className="mr-1 inline h-3 w-3" />{s.count} corridas</>} />
          <StatCard label="Bruto" value={brl(s.gross)} />
          <StatCard label="Gastos" value={brl(s.totalExpenses)} accent="destructive" hint={<TrendingDown className="mr-1 inline h-3 w-3" />} />
          <StatCard label="R$ / hora" value={brl(s.perHour)} accent="info" hint={<><Clock className="mr-1 inline h-3 w-3" />{num(s.totalHours,1)}h</>} />
          <StatCard label="R$ / km" value={brl(s.perKm)} hint={<><Route className="mr-1 inline h-3 w-3" />{num(s.totalKm,1)} km</>} />
          <StatCard label="Média/dia" value={brl(days.length > 0 ? s.net / days.length : 0)} />
        </div>

        {/* Chart selector + chart */}
        <div className="rounded-2xl border border-border bg-card p-4">
          <div className="mb-3 space-y-2">
            <Label>Visualização</Label>
            <Select value={chart} onValueChange={(v) => setChart(v as ChartKey)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {CHARTS.map((c) => (
                  <SelectItem key={c.key} value={c.key}>{c.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="mb-2 text-sm font-semibold">{chartTitle}</div>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              {renderChart()}
            </ResponsiveContainer>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Button variant="outline" className="h-12 gap-2" onClick={exportCSV}>
            <Download className="h-4 w-4" /> Excel (CSV)
          </Button>
          <Button variant="outline" className="h-12 gap-2" onClick={exportPDF}>
            <FileText className="h-4 w-4" /> PDF
          </Button>
        </div>
      </div>
    </>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return <div className="text-xs font-medium text-muted-foreground">{children}</div>;
}
