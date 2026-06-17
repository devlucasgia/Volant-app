import { useEffect, useMemo, useRef, useState } from "react";
import { PageHeader } from "@/components/ui-bits";
import { Segmented } from "@/components/Segmented";
import { useData } from "@/context/DataContext";
import { Entry, EarningEntry } from "@/types";
import { summarize } from "@/lib/stats";
import { brl, num } from "@/lib/format";
import { useCountUp } from "@/hooks/useCountUp";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import {
  Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription,
} from "@/components/ui/drawer";
import type { DateRange } from "react-day-picker";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  ResponsiveContainer, Tooltip, XAxis,
  Area, AreaChart,
} from "recharts";
import {
  CalendarIcon, CalendarRange,
  Wallet, Receipt, CalendarDays, Route, Flag, Gauge, Sparkles,
  TrendingUp, TrendingDown,
  Download, FileSpreadsheet, FileText, FileDown, FileType2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useReportWidgets } from "@/lib/reportWidgets";
import { useReportOrder, type ReportCardKey } from "@/lib/reportOrder";
import { useAccess } from "@/context/AccessContext";
import { PremiumLockOverlay } from "@/components/PremiumLockOverlay";
import {
  format, startOfMonth, endOfMonth, isWithinInterval, eachDayOfInterval,
  startOfDay, endOfDay, subMonths, addMonths,
  startOfYear, endOfYear, eachMonthOfInterval, subYears, addYears, getYear,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";

type RangeMode = "range" | "month" | "year";
type ChartKey = "net" | "expenses" | "km" | "hours";

const CHARTS: { key: ChartKey; label: string; shortLabel: string; fullLabel: string; color: string }[] = [
  { key: "net",      label: "Lucro líquido",     shortLabel: "Lucro",  fullLabel: "Lucro líquido",     color: "hsl(var(--success))" },
  { key: "expenses", label: "Gastos",            shortLabel: "Gastos", fullLabel: "Gastos",            color: "hsl(var(--destructive))" },
  { key: "km",       label: "KM rodados",        shortLabel: "KM",     fullLabel: "KM rodados",        color: "hsl(var(--info))" },
  { key: "hours",    label: "Horas trabalhadas", shortLabel: "Horas",  fullLabel: "Horas trabalhadas", color: "hsl(265 85% 70%)" },
];

export default function Reports() {
  const { entries, expenseMetaFor, platformMetaFor, isSimplePlatform } = useData();
  const { isLimited } = useAccess();
  const [widgets] = useReportWidgets();
  const [reportOrder] = useReportOrder();
  const [mode, setMode] = useState<RangeMode>("month");
  const [monthRef, setMonthRef] = useState<Date>(startOfMonth(new Date()));
  const [yearRef, setYearRef] = useState<Date>(startOfYear(new Date()));
  const [from, setFrom] = useState<Date>(startOfMonth(new Date()));
  const [to, setTo] = useState<Date>(endOfMonth(new Date()));
  const [chart, setChart] = useState<ChartKey>("net");
  const [calOpen, setCalOpen] = useState(false);
  const [calDraft, setCalDraft] = useState<DateRange | undefined>(undefined);

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

  const summaryRows: [string, string][] = [
    ["Lucro líquido", brl(s.net)],
    ["Bruto", brl(s.gross)],
    ["Gastos", brl(s.totalExpenses)],
    ["Dias trabalhados", String(workedDays)],
    ["KM total", num(s.totalKm, 1)],
    ["Corridas total", String(s.totalRides)],
    ["R$ / hora", brl(s.perHour)],
    ["R$ / dia", brl(avgPerDay)],
    ["R$ / km", brl(s.perKm)],
    ["R$ / corrida", brl(s.perRide)],
  ];

  const exportXLSX = async () => {
    try {
      const XLSX = await import("xlsx");
      const wb = XLSX.utils.book_new();

      const resumo = XLSX.utils.aoa_to_sheet([
        ["Volant — Relatório"],
        [`Período: ${periodLabel}`],
        [`Gerado em: ${format(new Date(), "dd/MM/yyyy HH:mm")}`],
        [],
        ["Indicador", "Valor"],
        ...summaryRows,
      ]);
      XLSX.utils.book_append_sheet(wb, resumo, "Resumo");

      const lancHeader = ["Data", "Tipo", "App/Categoria", "Km", "Horas", "Corridas", "Valor (R$)", "Observações"];
      const lancRows = filtered.map((e) =>
        e.type === "earning"
          ? [format(new Date(e.date), "dd/MM/yyyy HH:mm"), "Ganho", platformMetaFor(e.app).label, e.km, e.hours, e.rides ?? "", Number(e.gross.toFixed(2)), e.notes || ""]
          : [format(new Date(e.date), "dd/MM/yyyy HH:mm"), "Gasto", expenseMetaFor(e.expense.category).label, "", "", "", Number(e.expense.amount.toFixed(2)), e.expense.description || ""]
      );
      const lanc = XLSX.utils.aoa_to_sheet([lancHeader, ...lancRows]);
      XLSX.utils.book_append_sheet(wb, lanc, "Lançamentos");

      XLSX.writeFile(wb, `volant-${format(new Date(), "yyyyMMdd")}.xlsx`);
      toast.success("Excel exportado!");
    } catch (err) {
      console.error(err);
      toast.error("Não foi possível exportar Excel agora.");
    }
  };

  const exportDOCX = async () => {
    try {
      const docx = await import("docx");
      const {
        Document, Packer, Paragraph, HeadingLevel, AlignmentType,
        Table, TableRow, TableCell, WidthType, TextRun, BorderStyle,
      } = docx;

      const border = { style: BorderStyle.SINGLE, size: 4, color: "DDDDDD" };
      const cellBorders = { top: border, bottom: border, left: border, right: border };

      const headerCell = (text: string) =>
        new TableCell({
          borders: cellBorders,
          children: [new Paragraph({ children: [new TextRun({ text, bold: true })] })],
        });
      const cell = (text: string) =>
        new TableCell({ borders: cellBorders, children: [new Paragraph(text)] });

      const summaryTable = new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
          new TableRow({ children: [headerCell("Indicador"), headerCell("Valor")] }),
          ...summaryRows.map(([k, v]) => new TableRow({ children: [cell(k), cell(v)] })),
        ],
      });

      const entriesHeader = ["Data", "Tipo", "App/Categoria", "Km", "Horas", "Valor"];
      const entryRows = filtered.map((e) =>
        e.type === "earning"
          ? [format(new Date(e.date), "dd/MM HH:mm"), "Ganho", platformMetaFor(e.app).label, String(e.km), String(e.hours), brl(e.gross)]
          : [format(new Date(e.date), "dd/MM HH:mm"), "Gasto", expenseMetaFor(e.expense.category).label, "-", "-", brl(e.expense.amount)]
      );
      const entriesTable = new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
          new TableRow({ children: entriesHeader.map(headerCell) }),
          ...entryRows.map((r) => new TableRow({ children: r.map(cell) })),
        ],
      });

      const wordDoc = new Document({
        sections: [{
          children: [
            new Paragraph({
              heading: HeadingLevel.HEADING_1,
              alignment: AlignmentType.LEFT,
              children: [new TextRun({ text: "Volant — Relatório", bold: true })],
            }),
            new Paragraph({ children: [new TextRun({ text: `Período: ${periodLabel}` })] }),
            new Paragraph({ children: [new TextRun({ text: `Gerado em ${format(new Date(), "dd/MM/yyyy HH:mm")}` })] }),
            new Paragraph(""),
            new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun({ text: "Resumo", bold: true })] }),
            summaryTable,
            new Paragraph(""),
            new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun({ text: "Lançamentos", bold: true })] }),
            entriesTable,
          ],
        }],
      });

      const blob = await Packer.toBlob(wordDoc);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `volant-${format(new Date(), "yyyyMMdd")}.docx`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Word exportado!");
    } catch (err) {
      console.error(err);
      toast.error("Não foi possível exportar Word agora.");
    }
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
    return (
      <AreaChart data={dailySeries} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
        <defs>
          <linearGradient id="reportAreaFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="hsl(var(--success))" stopOpacity={0.35} />
            <stop offset="100%" stopColor="hsl(var(--success))" stopOpacity={0} />
          </linearGradient>
        </defs>
        <XAxis
          dataKey="name"
          tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
          tickMargin={6}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip cursor={{ stroke: "hsl(var(--success) / 0.4)" }} contentStyle={tooltipStyle} formatter={(v: number) => fmt(v)} />
        <Area type="monotone" dataKey={dataKey} stroke="hsl(var(--success))" strokeWidth={2} fill="url(#reportAreaFill)" dot={false} />
      </AreaChart>
    );
  };

  return (
    <>
      <PageHeader
        title="Relatórios"
        subtitle={periodLabel}
      />
      <div className="relative">
      <div className="mx-auto w-full max-w-5xl space-y-5 px-4 pt-4 pb-6">
        {/* Mode switch + Export */}
        <div className="flex items-center gap-2">
          <Segmented<RangeMode>
            options={[
              { key: "month", label: "Por mês" },
              { key: "year", label: "Por ano" },
              { key: "range", label: "Personalizado" },
            ]}
            value={mode}
            onChange={setMode}
            size="sm"
            tone="flat"
            className="flex-1"
          />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Exportar relatório"
                className="h-9 w-9 shrink-0 rounded-xl text-muted-foreground hover:text-foreground"
              >
                <Download className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={exportXLSX}>
                <FileSpreadsheet className="mr-2 h-4 w-4 text-success" /> Exportar Excel
              </DropdownMenuItem>
              <DropdownMenuItem onClick={exportDOCX}>
                <FileType2 className="mr-2 h-4 w-4 text-info" /> Exportar Word
              </DropdownMenuItem>
              <DropdownMenuItem onClick={exportPDF}>
                <FileText className="mr-2 h-4 w-4 text-destructive" /> Exportar PDF
              </DropdownMenuItem>
              <DropdownMenuItem onClick={exportCSV}>
                <FileDown className="mr-2 h-4 w-4 text-muted-foreground" /> Exportar CSV
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>



        {mode === "month" ? (
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground" onClick={() => setMonthRef(subMonths(monthRef, 1))}>‹</Button>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" className="flex-1 justify-center font-medium text-foreground hover:bg-foreground/[0.04]">
                  <CalendarIcon className="mr-2 h-4 w-4 text-muted-foreground" />
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
            <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground disabled:opacity-30"
              disabled={endOfMonth(monthRef) >= endOfMonth(new Date())}
              onClick={() => setMonthRef(addMonths(monthRef, 1))}>›</Button>
          </div>
        ) : mode === "year" ? (
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground" onClick={() => setYearRef(subYears(yearRef, 1))}>‹</Button>
            <Select
              value={String(getYear(yearRef))}
              onValueChange={(v) => setYearRef(startOfYear(new Date(Number(v), 0, 1)))}
            >
              <SelectTrigger className="flex-1 justify-center border-0 bg-transparent font-medium text-foreground hover:bg-foreground/[0.04] [&>span]:flex [&>span]:items-center [&>span]:justify-center [&>span]:gap-2 [&>span]:flex-1">
                <SelectValue>
                  <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                  <span>{format(yearRef, "yyyy")}</span>
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {Array.from({ length: 8 }, (_, i) => getYear(new Date()) - i).map((y) => (
                  <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground disabled:opacity-30"
              disabled={getYear(yearRef) >= getYear(new Date())}
              onClick={() => setYearRef(addYears(yearRef, 1))}>›</Button>
          </div>
        ) : (
          <Button
            variant="ghost"
            className="w-full justify-center font-medium text-foreground hover:bg-foreground/[0.04]"
            onClick={() => {
              setCalDraft({ from, to });
              setCalOpen(true);
            }}
          >
            <CalendarRange className="mr-2 h-4 w-4 text-muted-foreground" />
            {format(from, "dd/MM/yy")} – {format(to, "dd/MM/yy")}
          </Button>
        )}

        <Drawer open={calOpen} onOpenChange={setCalOpen}>
          <DrawerContent>
            <div className="mx-auto w-full max-w-md">
              <DrawerHeader>
                <DrawerTitle className="flex items-center gap-2">
                  <CalendarRange className="h-4 w-4 text-success" /> Selecionar período
                </DrawerTitle>
                <DrawerDescription>Toque uma vez para um dia ou duas para um intervalo.</DrawerDescription>
              </DrawerHeader>
              <div className="flex justify-center px-2">
                <Calendar
                  mode="range"
                  selected={calDraft}
                  onSelect={setCalDraft}
                  numberOfMonths={1}
                  locale={ptBR}
                  disabled={(d) => d > new Date()}
                  className="pointer-events-auto"
                />
              </div>
              <div className="flex gap-2 px-4 py-3 pb-[calc(env(safe-area-inset-bottom)+12px)]">
                <Button variant="outline" className="flex-1" onClick={() => setCalOpen(false)}>
                  Cancelar
                </Button>
                <Button
                  className="flex-1 gradient-success text-primary-foreground"
                  disabled={!calDraft?.from}
                  onClick={() => {
                    if (!calDraft?.from) return;
                    const f = calDraft.from;
                    const t = calDraft.to ?? calDraft.from;
                    setFrom(f);
                    setTo(t);
                    setCalOpen(false);
                  }}
                >
                  Aplicar
                </Button>
              </div>
            </div>
          </DrawerContent>
        </Drawer>


        {/* Cards rendered in user-defined order.
            - First visible item, if "net" or "grossExpenses" → HERO (no chrome, huge typography).
            - "chart" → standalone block with no border.
            - All other items → continuous list rows grouped in a single subtle container. */}
        {(() => {
          const visibleKeys = reportOrder.filter((k) => widgets[k]);
          const heroKey = (visibleKeys[0] === "net" || visibleKeys[0] === "grossExpenses")
            ? visibleKeys[0]
            : null;

          const renderHero = (k: ReportCardKey) => {
            if (k === "net") {
              return (
                <div key="hero-net" className="py-5 text-center">
                  <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                    Lucro líquido
                  </div>
                  <div className="mt-2 text-5xl sm:text-6xl font-bold tabular-nums tracking-tight text-success leading-none">
                    {brl(s.net)}
                  </div>
                  <div className="mt-3 text-xs text-muted-foreground tabular-nums">
                    Bruto {brl(s.gross)} · Gastos {brl(s.totalExpenses)}
                  </div>
                </div>
              );
            }
            // grossExpenses hero
            const saldo = s.gross - s.totalExpenses;
            return (
              <div key="hero-grossExpenses" className="py-5 text-center">
                <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                  Saldo do período
                </div>
                <div className="mt-2 text-5xl sm:text-6xl font-bold tabular-nums tracking-tight text-foreground leading-none">
                  {brl(saldo)}
                </div>
                <div className="mt-3 text-xs text-muted-foreground tabular-nums">
                  Bruto <span className="text-info">{brl(s.gross)}</span> · Gastos <span className="text-destructive">{brl(s.totalExpenses)}</span>
                </div>
              </div>
            );
          };

          // Each non-hero, non-chart key produces one or more rows.
          // Icons are monochromatic (success/70) to keep the list calm.
          const iconCls = "h-4 w-4 text-success/70";
          const rowsFor = (k: ReportCardKey): { icon: React.ReactNode; label: string; value: string; sub?: string }[] => {
            switch (k) {
              case "net":
                return [{ icon: <Wallet className={iconCls} />, label: "Lucro líquido", value: brl(s.net) }];
              case "grossExpenses":
                // Absorvido pelo herói "Lucro líquido".
                if (heroKey === "net") return [];
                return [
                  { icon: <Wallet className={iconCls} />, label: "Bruto", value: brl(s.gross) },
                  { icon: <Receipt className={iconCls} />, label: "Gastos", value: brl(s.totalExpenses) },
                ];
              case "perHour":
                return [{
                  icon: <Gauge className={iconCls} />,
                  label: "Média por hora",
                  value: brl(s.perHour),
                  sub: s.totalHours > 0 ? `${num(s.totalHours, 1)}h trabalhadas` : undefined,
                }];
              case "daysGroup":
                return [{
                  icon: <CalendarDays className={iconCls} />,
                  label: "Média / dia",
                  value: brl(avgPerDay),
                  sub: workedDays > 0 ? `${workedDays} ${workedDays === 1 ? "ativo" : "ativos"}` : undefined,
                }];
              case "kmGroup":
                return [{
                  icon: <Route className={iconCls} />,
                  label: "R$ / km",
                  value: brl(s.perKm),
                  sub: s.totalKm > 0 ? `${num(s.totalKm, 0)} km rodados` : undefined,
                }];
              case "tripsGroup":
                return [{
                  icon: <Flag className={iconCls} />,
                  label: "R$ / corrida",
                  value: brl(s.perRide),
                  sub: s.totalRides > 0 ? `${s.totalRides} ${s.totalRides === 1 ? "corrida" : "corridas"}` : undefined,
                }];
              default:
                return [];
            }
          };

          const hasChartData = dailySeries.length > 0
            && dailySeries.some((d) => Number((d as unknown as Record<string, number>)[dataKey]) > 0);

          const renderChartBlock = () => (
            <div key="chart" className="pt-1">
              <div className="mb-3 flex flex-col gap-0.5 px-1">
                <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Visualização</div>
                <div className="text-sm font-semibold text-foreground">{chartMeta.label}</div>
              </div>
              <div className="-mx-1 mb-3 flex gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {CHARTS.map((c) => {
                  const active = c.key === chart;
                  return (
                    <button
                      key={c.key}
                      type="button"
                      onClick={() => setChart(c.key)}
                      className={cn(
                        "shrink-0 whitespace-nowrap rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors",
                        active
                          ? "bg-success/15 text-success ring-1 ring-success/30"
                          : "bg-foreground/[0.04] text-muted-foreground hover:text-foreground",
                      )}
                    >
                      {c.label}
                    </button>
                  );
                })}
              </div>
              <div className="h-64">
                {hasChartData ? (
                  <ResponsiveContainer width="100%" height="100%">
                    {renderChart()}
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                    Sem dados para este período.
                  </div>
                )}
              </div>
            </div>
          );


          // Walk visibleKeys, grouping contiguous row-friendly items into a single container.
          const blocks: React.ReactNode[] = [];
          let rowGroup: { key: ReportCardKey; rows: ReturnType<typeof rowsFor> }[] = [];
          const flushRowGroup = () => {
            if (rowGroup.length === 0) return;
            const flat = rowGroup.flatMap((g) => g.rows.map((r, idx) => ({ ...r, _key: `${g.key}-${idx}` })));
            blocks.push(
              <div key={`group-${blocks.length}`} className="rounded-2xl bg-card/40">
                {flat.map((r, i) => (
                  <div
                    key={r._key}
                    className={cn(
                      "flex items-center gap-3 px-4 py-3.5",
                      i < flat.length - 1 && "border-b border-border/40",
                    )}
                  >
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted/40">
                      {r.icon}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm text-foreground">{r.label}</div>
                      {r.sub && <div className="text-[11px] text-muted-foreground">{r.sub}</div>}
                    </div>
                    <div className="text-base font-semibold tabular-nums text-foreground">{r.value}</div>
                  </div>
                ))}
              </div>
            );
            rowGroup = [];
          };

          visibleKeys.forEach((k, i) => {
            if (i === 0 && k === heroKey) {
              flushRowGroup();
              blocks.push(renderHero(k));
              return;
            }
            if (k === "chart") {
              flushRowGroup();
              blocks.push(renderChartBlock());
              return;
            }
            rowGroup.push({ key: k, rows: rowsFor(k) });
          });
          flushRowGroup();

          return <div className="space-y-4">{blocks}</div>;
        })()}

      </div>
      {isLimited && (
        <PremiumLockOverlay
          title="Relatórios completos no Premium"
          description="Acesse seus relatórios, gráficos e exportações assinando o Volant Premium."
          intense
        />
      )}
      </div>
    </>
  );
}

