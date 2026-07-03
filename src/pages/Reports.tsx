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
import { EnrichedCalendar } from "@/components/ui/EnrichedCalendar";
import { buildDailyStats } from "@/lib/calendarDayStats";
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
  Wallet, Receipt, CalendarDays, Route, Flag, Gauge,
  Download, FileSpreadsheet, FileText, FileDown,
} from "lucide-react";
import { PlatformLogo } from "@/components/PlatformLogo";
import {
  TONE, TONE_CLASS, INSIGHT_ICON, pickPhrase, fillPhrase,
  type PhraseKey,
} from "@/lib/insightPhrases";
import { cn } from "@/lib/utils";
import { useReportWidgets } from "@/lib/reportWidgets";
import { useReportOrder, isHeroKey, type ReportCardKey } from "@/lib/reportOrder";
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

const CHARTS_LABEL_PT: Record<ChartKey, string> = {
  net: "Lucro",
  expenses: "Gastos",
  km: "KM",
  hours: "Horas",
};


/**
 * Smooth number transition for hero / list values when the selected period changes.
 * Respects prefers-reduced-motion via useCountUp.
 */
function AnimatedNumber({ value, format, duration = 500 }: { value: number; format: (n: number) => string; duration?: number }) {
  const animated = useCountUp(value, duration);
  return <span className="tabular-nums">{format(animated)}</span>;
}



export default function Reports() {
  const { entries, settings, expenseMetaFor, platformMetaFor, isSimplePlatform } = useData();
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
  const [calVisibleMonth, setCalVisibleMonth] = useState<Date>(() => startOfMonth(new Date()));
  const calDailyStats = useMemo(
    () => buildDailyStats(entries, calVisibleMonth),
    [entries, calVisibleMonth],
  );

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

  const avgPerDay = workedDays > 0 ? s.gross / workedDays : 0;

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

  const loadLogoDataUrl = async (): Promise<string | null> => {
    try {
      const mod = await import("@/assets/volant-symbol-header.png");
      const res = await fetch((mod as { default: string }).default);
      const blob = await res.blob();
      return await new Promise<string>((resolve, reject) => {
        const r = new FileReader();
        r.onloadend = () => resolve(r.result as string);
        r.onerror = reject;
        r.readAsDataURL(blob);
      });
    } catch {
      return null;
    }
  };

  const exportPDF = async () => {
    try {
      const doc = new jsPDF({ unit: "mm", format: "a4" });
      const pageW = doc.internal.pageSize.getWidth();
      const pageH = doc.internal.pageSize.getHeight();
      const logoDataUrl = await loadLogoDataUrl();
      const genAt = format(new Date(), "dd/MM/yyyy HH:mm");
      const genDate = format(new Date(), "dd/MM/yyyy");

      // 1) Header dark band
      doc.setFillColor(15, 23, 42); // #0F172A
      doc.rect(0, 0, pageW, 28, "F");
      if (logoDataUrl) {
        try { doc.addImage(logoDataUrl, "PNG", 14, 8, 12, 12); } catch { /* noop */ }
      }
      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(16);
      doc.text("Volant", logoDataUrl ? 30 : 14, 15);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(220, 230, 240);
      doc.text("Relatório de ganhos", logoDataUrl ? 30 : 14, 21);
      // Right side: period + generated
      doc.setFontSize(10);
      doc.setTextColor(255, 255, 255);
      doc.text(periodLabel, pageW - 14, 14, { align: "right" });
      doc.setFontSize(8);
      doc.setTextColor(200, 210, 220);
      doc.text(`Gerado em ${genAt}`, pageW - 14, 20, { align: "right" });
      // 2) Faixa verde
      doc.setFillColor(34, 197, 94); // #22c55e
      doc.rect(0, 28, pageW, 1.6, "F");

      // 3) Bloco destaque (líquido)
      let y = 42;
      doc.setTextColor(100, 116, 139);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.text("LUCRO LÍQUIDO", 14, y);
      y += 9;
      doc.setTextColor(22, 163, 74); // #16A34A
      doc.setFont("helvetica", "bold");
      doc.setFontSize(26);
      doc.text(brl(s.net), 14, y);
      y += 6;
      doc.setTextColor(100, 116, 139);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.text(`Bruto ${brl(s.gross)}  ·  Gastos ${brl(s.totalExpenses)}`, 14, y);
      y += 6;

      // 4) Grade de métricas (3x2)
      const metrics: [string, string][] = [
        ["R$ / hora", brl(s.perHour)],
        ["R$ / dia", brl(avgPerDay)],
        ["R$ / km", brl(s.perKm)],
        ["R$ / corrida", brl(s.perRide)],
        ["Dias ativos", String(workedDays)],
        ["KM total", num(s.totalKm, 1)],
      ];
      const cellW = (pageW - 28) / 3;
      const cellH = 16;
      metrics.forEach((m, idx) => {
        const col = idx % 3;
        const row = Math.floor(idx / 3);
        const x = 14 + col * cellW;
        const cy = y + row * (cellH + 2);
        doc.setDrawColor(226, 232, 240);
        doc.setFillColor(248, 250, 252);
        doc.roundedRect(x, cy, cellW - 3, cellH, 1.5, 1.5, "FD");
        doc.setTextColor(100, 116, 139);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        doc.text(m[0], x + 3, cy + 5.5);
        doc.setTextColor(15, 23, 42);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(12);
        doc.text(m[1], x + 3, cy + 12);
      });
      y += 2 * (cellH + 2) + 4;

      // 5) Tabela de lançamentos
      const tableBody = filtered.map((e) =>
        e.type === "earning"
          ? [
              format(new Date(e.date), "dd/MM HH:mm"),
              "Ganho",
              platformMetaFor(e.app).label,
              num(e.km, 1),
              num(e.hours, 2),
              brl(e.gross),
            ]
          : [
              format(new Date(e.date), "dd/MM HH:mm"),
              "Gasto",
              expenseMetaFor(e.expense.category).label,
              "—",
              "—",
              brl(e.expense.amount),
            ]
      );

      autoTable(doc, {
        startY: y,
        head: [["Data", "Tipo", "App/Categoria", "KM", "Horas", "Valor"]],
        body: tableBody,
        theme: "striped",
        styles: { fontSize: 9, cellPadding: 2.2, textColor: [30, 41, 59] },
        headStyles: {
          fillColor: [15, 23, 42],
          textColor: [255, 255, 255],
          fontStyle: "bold",
          halign: "left",
        },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        columnStyles: {
          3: { halign: "right" },
          4: { halign: "right" },
          5: { halign: "right", fontStyle: "bold" },
        },
        didParseCell: (data) => {
          if (data.section !== "body") return;
          const tipo = String(data.row.raw?.[1] ?? "");
          if (data.column.index === 1 || data.column.index === 5) {
            if (tipo === "Ganho") data.cell.styles.textColor = [22, 163, 74];
            else if (tipo === "Gasto") data.cell.styles.textColor = [220, 38, 38];
          }
        },
        margin: { left: 14, right: 14, bottom: 20 },
        didDrawPage: () => {
          // Rodapé
          doc.setFillColor(34, 197, 94);
          doc.rect(0, pageH - 14, pageW, 0.8, "F");
          doc.setTextColor(100, 116, 139);
          doc.setFont("helvetica", "normal");
          doc.setFontSize(8);
          doc.text(
            "Gestão Financeira Inteligente para motoristas de app",
            pageW / 2,
            pageH - 9,
            { align: "center" }
          );
          doc.setFontSize(7);
          doc.setTextColor(148, 163, 184);
          doc.text(
            `Gerado pelo Volant em ${genDate} · usevolant.app`,
            pageW / 2,
            pageH - 5,
            { align: "center" }
          );
        },
      });

      doc.save(`volant-${format(new Date(), "yyyyMMdd")}.pdf`);
      toast.success("PDF exportado!");
    } catch (err) {
      console.error(err);
      toast.error("Não foi possível exportar PDF agora.");
    }
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
      const XLSX: typeof import("xlsx-js-style") = await import("xlsx-js-style");
      const wb = XLSX.utils.book_new();

      const FONT = { name: "Calibri", sz: 11 };
      const GREEN = "22C55E";
      const DARK = "0F172A";
      const RED_TXT = "DC2626";
      const GREEN_TXT = "16A34A";
      const CURRENCY_FMT = '"R$" #,##0.00';
      const DATE_FMT = "dd/mm/yyyy hh:mm";

      const headerStyle = (bg: string) => ({
        font: { ...FONT, bold: true, color: { rgb: "FFFFFF" }, sz: 12 },
        fill: { patternType: "solid", fgColor: { rgb: bg } },
        alignment: { vertical: "center", horizontal: "left" },
      });

      // ===== Aba Resumo =====
      const resumo: Record<string, unknown> = {};
      const setCell = (
        ws: Record<string, unknown>,
        addr: string,
        value: unknown,
        style?: Record<string, unknown>,
        z?: string,
        t?: string,
      ) => {
        const cell: Record<string, unknown> = { v: value };
        if (t) cell.t = t;
        else if (typeof value === "number") cell.t = "n";
        else if (value instanceof Date) cell.t = "d";
        else cell.t = "s";
        if (z) cell.z = z;
        if (style) cell.s = style;
        ws[addr] = cell;
      };

      setCell(resumo, "A1", "Volant — Relatório", headerStyle(GREEN));
      setCell(resumo, "B1", "", headerStyle(GREEN));
      setCell(resumo, "A2", `Período: ${periodLabel}`, headerStyle(GREEN));
      setCell(resumo, "B2", "", headerStyle(GREEN));
      setCell(resumo, "A3", `Gerado em: ${format(new Date(), "dd/MM/yyyy HH:mm")}`, headerStyle(GREEN));
      setCell(resumo, "B3", "", headerStyle(GREEN));

      setCell(resumo, "A5", "Indicador", {
        font: { ...FONT, bold: true, color: { rgb: "FFFFFF" } },
        fill: { patternType: "solid", fgColor: { rgb: DARK } },
      });
      setCell(resumo, "B5", "Valor", {
        font: { ...FONT, bold: true, color: { rgb: "FFFFFF" } },
        fill: { patternType: "solid", fgColor: { rgb: DARK } },
        alignment: { horizontal: "right" },
      });

      const numericMap: Record<string, { v: number; z?: string }> = {
        "Lucro líquido": { v: s.net, z: CURRENCY_FMT },
        Bruto: { v: s.gross, z: CURRENCY_FMT },
        Gastos: { v: s.totalExpenses, z: CURRENCY_FMT },
        "Dias trabalhados": { v: workedDays },
        "KM total": { v: s.totalKm, z: "#,##0.0" },
        "Corridas total": { v: s.totalRides },
        "R$ / hora": { v: s.perHour, z: CURRENCY_FMT },
        "R$ / dia": { v: avgPerDay, z: CURRENCY_FMT },
        "R$ / km": { v: s.perKm, z: CURRENCY_FMT },
        "R$ / corrida": { v: s.perRide, z: CURRENCY_FMT },
      };
      summaryRows.forEach((row, idx) => {
        const r = 6 + idx;
        setCell(resumo, `A${r}`, row[0], { font: FONT });
        const m = numericMap[row[0]];
        if (m) {
          setCell(resumo, `B${r}`, m.v, { font: { ...FONT, bold: true }, alignment: { horizontal: "right" } }, m.z, "n");
        } else {
          setCell(resumo, `B${r}`, row[1], { font: { ...FONT, bold: true }, alignment: { horizontal: "right" } });
        }
      });

      (resumo as { "!ref"?: string })["!ref"] = `A1:B${5 + summaryRows.length}`;
      (resumo as { "!cols"?: unknown[] })["!cols"] = [{ wch: 28 }, { wch: 20 }];
      (resumo as { "!merges"?: unknown[] })["!merges"] = [
        { s: { r: 0, c: 0 }, e: { r: 0, c: 1 } },
        { s: { r: 1, c: 0 }, e: { r: 1, c: 1 } },
        { s: { r: 2, c: 0 }, e: { r: 2, c: 1 } },
      ];
      XLSX.utils.book_append_sheet(wb, resumo as never, "Resumo");

      // ===== Aba Lançamentos =====
      const lanc: Record<string, unknown> = {};
      const headers = ["Data", "Tipo", "App/Categoria", "KM", "Horas", "Corridas", "Valor", "Observações"];
      const headerCellStyle = {
        font: { ...FONT, bold: true, color: { rgb: "FFFFFF" } },
        fill: { patternType: "solid", fgColor: { rgb: DARK } },
        alignment: { horizontal: "left", vertical: "center" },
      };
      headers.forEach((h, c) => {
        const addr = XLSX.utils.encode_cell({ r: 0, c });
        setCell(lanc, addr, h, headerCellStyle);
      });

      const totals = { ganhos: 0, gastos: 0 };
      filtered.forEach((e, i) => {
        const r = i + 1;
        const isEarn = e.type === "earning";
        const tipo = isEarn ? "Ganho" : "Gasto";
        const color = isEarn ? GREEN_TXT : RED_TXT;
        const tipoStyle = { font: { ...FONT, bold: true, color: { rgb: color } } };
        const valStyle = { font: { ...FONT, bold: true, color: { rgb: color } }, alignment: { horizontal: "right" } };

        const dateVal = new Date(e.date);
        setCell(lanc, XLSX.utils.encode_cell({ r, c: 0 }), dateVal, { font: FONT }, DATE_FMT, "d");
        setCell(lanc, XLSX.utils.encode_cell({ r, c: 1 }), tipo, tipoStyle);
        if (isEarn) {
          totals.ganhos += e.gross;
          setCell(lanc, XLSX.utils.encode_cell({ r, c: 2 }), platformMetaFor(e.app).label, { font: FONT });
          setCell(lanc, XLSX.utils.encode_cell({ r, c: 3 }), e.km, { font: FONT, alignment: { horizontal: "right" } }, "#,##0.0", "n");
          setCell(lanc, XLSX.utils.encode_cell({ r, c: 4 }), e.hours, { font: FONT, alignment: { horizontal: "right" } }, "#,##0.00", "n");
          if (e.rides != null) {
            setCell(lanc, XLSX.utils.encode_cell({ r, c: 5 }), e.rides, { font: FONT, alignment: { horizontal: "right" } }, "0", "n");
          }
          setCell(lanc, XLSX.utils.encode_cell({ r, c: 6 }), Number(e.gross.toFixed(2)), valStyle, CURRENCY_FMT, "n");
          setCell(lanc, XLSX.utils.encode_cell({ r, c: 7 }), e.notes || "", { font: FONT });
        } else {
          totals.gastos += e.expense.amount;
          setCell(lanc, XLSX.utils.encode_cell({ r, c: 2 }), expenseMetaFor(e.expense.category).label, { font: FONT });
          setCell(lanc, XLSX.utils.encode_cell({ r, c: 6 }), Number(e.expense.amount.toFixed(2)), valStyle, CURRENCY_FMT, "n");
          setCell(lanc, XLSX.utils.encode_cell({ r, c: 7 }), e.expense.description || "", { font: FONT });
        }
      });

      const totalsStart = filtered.length + 2;
      const totalRowStyle = { font: { ...FONT, bold: true }, fill: { patternType: "solid", fgColor: { rgb: "F1F5F9" } } };
      const totalGreen = { font: { ...FONT, bold: true, color: { rgb: GREEN_TXT } }, fill: { patternType: "solid", fgColor: { rgb: "F1F5F9" } }, alignment: { horizontal: "right" } };
      const totalRed = { font: { ...FONT, bold: true, color: { rgb: RED_TXT } }, fill: { patternType: "solid", fgColor: { rgb: "F1F5F9" } }, alignment: { horizontal: "right" } };

      setCell(lanc, `A${totalsStart}`, "Total Ganhos", totalRowStyle);
      setCell(lanc, `G${totalsStart}`, Number(totals.ganhos.toFixed(2)), totalGreen, CURRENCY_FMT, "n");
      setCell(lanc, `A${totalsStart + 1}`, "Total Gastos", totalRowStyle);
      setCell(lanc, `G${totalsStart + 1}`, Number(totals.gastos.toFixed(2)), totalRed, CURRENCY_FMT, "n");
      setCell(lanc, `A${totalsStart + 2}`, "Líquido", totalRowStyle);
      setCell(lanc, `G${totalsStart + 2}`, Number((totals.ganhos - totals.gastos).toFixed(2)), { font: { ...FONT, bold: true }, fill: { patternType: "solid", fgColor: { rgb: "E2E8F0" } }, alignment: { horizontal: "right" } }, CURRENCY_FMT, "n");

      const lastRow = totalsStart + 2;
      (lanc as { "!ref"?: string })["!ref"] = `A1:H${lastRow}`;
      (lanc as { "!freeze"?: unknown; "!views"?: unknown[] })["!views"] = [{ state: "frozen", ySplit: 1 }];

      // Column widths
      const colWidths = headers.map((h) => Math.max(h.length + 2, 10));
      filtered.forEach((e) => {
        const label = e.type === "earning" ? platformMetaFor(e.app).label : expenseMetaFor(e.expense.category).label;
        colWidths[2] = Math.max(colWidths[2], label.length + 2);
        const notes = e.type === "earning" ? (e.notes || "") : (e.expense.description || "");
        colWidths[7] = Math.max(colWidths[7], Math.min(notes.length + 2, 40));
      });
      colWidths[0] = 18; // date
      colWidths[6] = 16; // value
      (lanc as { "!cols"?: unknown[] })["!cols"] = colWidths.map((w) => ({ wch: w }));

      XLSX.utils.book_append_sheet(wb, lanc as never, "Lançamentos");

      XLSX.writeFile(wb, `volant-${format(new Date(), "yyyyMMdd")}.xlsx`);
      toast.success("Excel exportado!");
    } catch (err) {
      console.error(err);
      toast.error("Não foi possível exportar Excel agora.");
    }
  };



  const chartMeta = CHARTS.find((c) => c.key === chart)!;
  const dataKey = chart === "net" ? "net" : chart === "expenses" ? "expense" : chart === "km" ? "km" : "hours";
  

  const renderChart = () => {
    const color = chartMeta.color;
    const tooltipStyle = {
      background: "hsl(var(--card))",
      border: "1px solid hsl(var(--border))",
      borderRadius: 12,
      fontSize: 12,
      boxShadow: "0 10px 30px -12px hsl(var(--background) / 0.6)",
      padding: "8px 12px",
    };
    const gradientId = `reportAreaFill-${chart}`;
    return (
      <AreaChart data={dailySeries} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.35} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <XAxis
          dataKey="name"
          tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
          tickMargin={6}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip
          cursor={{ stroke: color, strokeOpacity: 0.4 }}
          contentStyle={tooltipStyle}
          formatter={(v: number) => {
            const labelPt = CHARTS_LABEL_PT[chart];
            if (chart === "net" || chart === "expenses") return [brl(v), labelPt];
            if (chart === "km") return [`${num(v, 0)} km`, labelPt];
            return [`${num(v, 1)}h`, labelPt];
          }}
          labelFormatter={(label, payload) => {
            if (useMonthly) {
              const raw = (payload?.[0] as unknown as { payload?: { d?: Date } })?.payload?.d;
              if (raw) return format(new Date(raw), "MMM/yy", { locale: ptBR });
            }
            return String(label);
          }}
        />
        <Area type="monotone" dataKey={dataKey} stroke={color} strokeWidth={2} fill={`url(#${gradientId})`} dot={false} />
      </AreaChart>
    );
  };

  // -------- Contextual chart title (Bloco 2) --------
  const chartTitle = mode === "month"
    ? "Evolução diária"
    : mode === "year"
      ? "Evolução mensal"
      : "Evolução no período";

  // -------- Insights Inteligentes — comparação MTD/YTD + categorias + plataformas --------
  type InsightItem = {
    id: string;
    phraseKey: PhraseKey;
    vars: Record<string, string>;
    relevance: number; // higher = more relevant (for sorting)
    kind: "numeric" | "category" | "platform";
    platformKey?: string; // for platform.* insights — render PlatformLogo badge
  };

  // 1.2 — same-period (MTD / YTD) comparison intervals. Only insights use these;
  // the on-screen totals/chart/list keep using the user-selected `interval`.
  const compare = useMemo(() => {
    if (mode === "range") return null;
    const today = new Date();
    if (mode === "month") {
      const sameMonth =
        monthRef.getFullYear() === today.getFullYear() &&
        monthRef.getMonth() === today.getMonth();
      if (sameMonth) {
        const prevRef = subMonths(monthRef, 1);
        const lastDayPrev = endOfMonth(prevRef).getDate();
        const day = Math.min(today.getDate(), lastDayPrev);
        return {
          curInterval: { start: startOfDay(startOfMonth(monthRef)), end: endOfDay(today) },
          prevInterval: {
            start: startOfDay(startOfMonth(prevRef)),
            end: endOfDay(new Date(prevRef.getFullYear(), prevRef.getMonth(), day)),
          },
          label: format(prevRef, "MMMM", { locale: ptBR }),
          isPartial: true,
        };
      }
      const prevRef = subMonths(monthRef, 1);
      return {
        curInterval: { start: startOfDay(startOfMonth(monthRef)), end: endOfDay(endOfMonth(monthRef)) },
        prevInterval: { start: startOfDay(startOfMonth(prevRef)), end: endOfDay(endOfMonth(prevRef)) },
        label: format(prevRef, "MMMM", { locale: ptBR }),
        isPartial: false,
      };
    }
    // year
    const sameYear = getYear(yearRef) === getYear(today);
    if (sameYear) {
      const prevYear = getYear(yearRef) - 1;
      let prevEndDate = new Date(prevYear, today.getMonth(), today.getDate());
      if (prevEndDate.getMonth() !== today.getMonth()) {
        prevEndDate = new Date(prevYear, today.getMonth() + 1, 0);
      }
      return {
        curInterval: { start: startOfDay(startOfYear(yearRef)), end: endOfDay(today) },
        prevInterval: { start: startOfDay(new Date(prevYear, 0, 1)), end: endOfDay(prevEndDate) },
        label: String(prevYear),
        isPartial: true,
      };
    }
    const prevRef = subYears(yearRef, 1);
    return {
      curInterval: { start: startOfDay(startOfYear(yearRef)), end: endOfDay(endOfYear(yearRef)) },
      prevInterval: { start: startOfDay(startOfYear(prevRef)), end: endOfDay(endOfYear(prevRef)) },
      label: format(prevRef, "yyyy"),
      isPartial: false,
    };
  }, [mode, monthRef, yearRef]);

  const prevSummary = useMemo(() => {
    if (!compare) return null;
    const prevEntries = entries.filter((e) => isWithinInterval(new Date(e.date), compare.prevInterval));
    if (prevEntries.length === 0) return null;
    const ps = summarize(prevEntries, isSimplePlatform);
    const prevWorkedDays = (() => {
      const set = new Set<string>();
      prevEntries.forEach((e) => { if (e.type === "earning") set.add(format(new Date(e.date), "yyyy-MM-dd")); });
      return set.size;
    })();
    return { ...ps, prevWorkedDays, prevAvgPerDay: prevWorkedDays > 0 ? ps.net / prevWorkedDays : 0 };
  }, [compare, entries, isSimplePlatform]);

  const curForInsights = useMemo(() => {
    if (!compare) return null;
    const curEntries = entries.filter((e) => isWithinInterval(new Date(e.date), compare.curInterval));
    const cs = summarize(curEntries, isSimplePlatform);
    const curWorkedDays = (() => {
      const set = new Set<string>();
      curEntries.forEach((e) => { if (e.type === "earning") set.add(format(new Date(e.date), "yyyy-MM-dd")); });
      return set.size;
    })();
    return { ...cs, curWorkedDays, curAvgPerDay: curWorkedDays > 0 ? cs.net / curWorkedDays : 0 };
  }, [compare, entries, isSimplePlatform]);

  // Expense by category for both intervals (with emoji + label from expenseMetaFor).
  const expenseByCategoryDiff = useMemo(() => {
    if (!compare) return [] as { category: string; label: string; emoji: string; cur: number; prev: number }[];
    const sumByCat = (interval: { start: Date; end: Date }) => {
      const map = new Map<string, number>();
      entries.forEach((e) => {
        if (e.type !== "expense") return;
        if (!isWithinInterval(new Date(e.date), interval)) return;
        const cat = e.expense.category;
        const amt = e.expense.amount || 0;
        map.set(cat, (map.get(cat) ?? 0) + amt);
      });
      return map;
    };
    const cur = sumByCat(compare.curInterval);
    const prev = sumByCat(compare.prevInterval);
    const keys = new Set<string>([...cur.keys(), ...prev.keys()]);
    return Array.from(keys).map((cat) => {
      const meta = expenseMetaFor(cat);
      return {
        category: cat,
        label: meta.label,
        emoji: meta.emoji ?? "",
        cur: cur.get(cat) ?? 0,
        prev: prev.get(cat) ?? 0,
      };
    });
  }, [compare, entries, expenseMetaFor]);

  // BLOCO 6.1 — Earnings by platform for both intervals.
  const platformDiff = useMemo(() => {
    if (!compare) return [] as { key: string; label: string; cur: number; prev: number }[];
    const sumByPlat = (interval: { start: Date; end: Date }) => {
      const map = new Map<string, number>();
      entries.forEach((e) => {
        if (e.type !== "earning") return;
        if (!isWithinInterval(new Date(e.date), interval)) return;
        const k = e.app;
        map.set(k, (map.get(k) ?? 0) + (e.gross || 0));
      });
      return map;
    };
    const cur = sumByPlat(compare.curInterval);
    const prev = sumByPlat(compare.prevInterval);
    const keys = new Set<string>([...cur.keys(), ...prev.keys()]);
    return Array.from(keys).map((k) => ({
      key: k,
      label: platformMetaFor(k).label,
      cur: cur.get(k) ?? 0,
      prev: prev.get(k) ?? 0,
    }));
  }, [compare, entries, platformMetaFor]);

  // Build the rotation queue.
  const queue = useMemo(() => {
    const empty = { N: [] as InsightItem[], C: [] as InsightItem[], P: [] as InsightItem[] };
    if (!compare || !prevSummary || !curForInsights) return empty;
    const label = compare.label;
    
    const MIN_BASE_MONEY = 1;
    const MIN_BASE_HOURS = 1;
    const MIN_DELTA_MONEY = 10;
    const MIN_DELTA_HOURS = 1;
    const MIN_DELTA_PLAT_COMPARE = 50;
    const MIN_DELTA_CATEGORY = 30;
    const MIN_DELTA_PLATFORM = 50;

    const vBase = { mês: label };
    const suffix = compare.isPartial ? ".partial" : ".closed";

    const N: InsightItem[] = [];

    // net (lucro líquido) — absolute R$ delta
    {
      const cur = curForInsights.net;
      const prev = prevSummary.net;
      const diff = cur - prev;
      const abs = Math.abs(diff);
      if (Math.abs(prev) >= MIN_BASE_MONEY && abs >= MIN_DELTA_MONEY) {
        const key = (diff >= 0 ? `net.up${suffix}` : `net.down${suffix}`) as PhraseKey;
        N.push({
          id: "n-net", kind: "numeric", phraseKey: key, relevance: abs,
          vars: { ...vBase, valor: brl(abs) },
        });
      }
    }

    // expenses — absolute R$ delta
    {
      const cur = curForInsights.totalExpenses;
      const prev = prevSummary.totalExpenses;
      const diff = cur - prev;
      const abs = Math.abs(diff);
      if (Math.abs(prev) >= MIN_BASE_MONEY && abs >= MIN_DELTA_MONEY) {
        const key = (diff >= 0 ? `expenses.up${suffix}` : `expenses.down${suffix}`) as PhraseKey;
        N.push({
          id: "n-exp", kind: "numeric", phraseKey: key, relevance: abs,
          vars: { ...vBase, valor: brl(abs) },
        });
      }
    }

    // R$/hora
    {
      const cur = curForInsights.perHour;
      const prev = prevSummary.perHour;
      const diff = cur - prev;
      const abs = Math.abs(diff);
      if (prev >= 1 && abs >= 1) {
        const key = (diff >= 0 ? `rph.up${suffix}` : `rph.down${suffix}`) as PhraseKey;
        N.push({
          id: "n-rph", kind: "numeric", phraseKey: key, relevance: abs * 50,
          vars: { ...vBase, valor: brl(cur) },
        });
      }
    }

    // R$/km
    {
      const cur = curForInsights.perKm;
      const prev = prevSummary.perKm;
      const diff = cur - prev;
      const abs = Math.abs(diff);
      if (prev >= 0.5 && abs >= 0.2) {
        const key = (diff >= 0 ? `rpkm.up${suffix}` : `rpkm.down${suffix}`) as PhraseKey;
        N.push({
          id: "n-rpkm", kind: "numeric", phraseKey: key, relevance: abs * 100,
          vars: { ...vBase, valor: brl(cur) },
        });
      }
    }

    // Horas
    {
      const cur = curForInsights.totalHours;
      const prev = prevSummary.totalHours;
      const diff = cur - prev;
      const abs = Math.abs(diff);
      if (prev >= MIN_BASE_HOURS && abs >= MIN_DELTA_HOURS) {
        const key = (diff >= 0 ? `hours.more${suffix}` : `hours.less${suffix}`) as PhraseKey;
        N.push({
          id: "n-hours", kind: "numeric", phraseKey: key, relevance: abs * 5,
          vars: { ...vBase, valor: `${num(abs, 1)}h` },
        });
      }
    }

    N.sort((a, b) => b.relevance - a.relevance);

    // Categorias
    const C: InsightItem[] = [];
    for (const it of expenseByCategoryDiff) {
      const { cur, prev, label: catLabel, emoji, category } = it;
      const base = { mês: label, categoria: catLabel, emoji: emoji || "" };

      if (prev < MIN_BASE_MONEY) {
        if (cur >= MIN_DELTA_CATEGORY) {
          C.push({
            id: `cat-new-${category}`, kind: "category", phraseKey: "category.new", relevance: cur,
            vars: { ...base, valor: brl(cur) },
          });
        }
        continue;
      }
      if (prev >= MIN_BASE_MONEY && cur === 0) {
        C.push({
          id: `cat-zero-${category}`, kind: "category", phraseKey: "category.zero", relevance: prev * 0.5,
          vars: base,
        });
        continue;
      }
      const delta = cur - prev;
      const absDelta = Math.abs(delta);
      if (absDelta < MIN_DELTA_CATEGORY) continue;
      const key = (delta >= 0 ? `category.up${suffix}` : `category.down${suffix}`) as PhraseKey;
      C.push({
        id: `cat-${key}-${category}`, kind: "category", phraseKey: key, relevance: absDelta,
        vars: { ...base, valor: brl(absDelta) },
      });
    }
    C.sort((a, b) => b.relevance - a.relevance);

    // Plataformas
    const P: InsightItem[] = [];
    // 1) comparação top1 vs top2 do período atual
    const curSorted = [...platformDiff].sort((a, b) => b.cur - a.cur).filter((p) => p.cur > 0);
    if (curSorted.length >= 2) {
      const [p1, p2] = curSorted;
      if (p1.cur - p2.cur >= MIN_DELTA_PLAT_COMPARE) {
        const key = `platform.compare${suffix}` as PhraseKey;
        P.push({
          id: `plat-compare-${p1.key}-${p2.key}`, kind: "platform", phraseKey: key,
          platformKey: p1.key,
          relevance: p1.cur - p2.cur,
          vars: { ...vBase, plat1: p1.label, plat2: p2.label },
        });
      }
    }
    // 2) up/down por plataforma
    for (const p of platformDiff) {
      const delta = p.cur - p.prev;
      const abs = Math.abs(delta);
      if (p.prev < MIN_BASE_MONEY || abs < MIN_DELTA_PLATFORM) continue;
      const key = (delta >= 0 ? `platform.up${suffix}` : `platform.down${suffix}`) as PhraseKey;
      P.push({
        id: `plat-${key}-${p.key}`, kind: "platform", phraseKey: key, platformKey: p.key,
        relevance: abs,
        vars: { ...vBase, plat: p.label, valor: brl(abs) },
      });
    }
    // 3) participação (qualquer plataforma >= 50%)
    const totalCur = curSorted.reduce((a, b) => a + b.cur, 0);
    if (totalCur > 0) {
      const dominant = curSorted.find((p) => p.cur / totalCur >= 0.5);
      if (dominant) {
        const share = Math.round((dominant.cur / totalCur) * 100);
        P.push({
          id: `plat-share-${dominant.key}`, kind: "platform", phraseKey: "platform.share",
          platformKey: dominant.key,
          relevance: share,
          vars: { ...vBase, plat: dominant.label, valor: String(share) },
        });
      }
    }
    P.sort((a, b) => b.relevance - a.relevance);

    return { N, C, P };
  }, [compare, curForInsights, prevSummary, expenseByCategoryDiff, platformDiff]);

  // Total positions: numerics + 1 category slot (if any) + 1 platform slot (if any).
  const insightTotal = queue.N.length + (queue.C.length > 0 ? 1 : 0) + (queue.P.length > 0 ? 1 : 0);

  // ---------- Rotation state (12s) ----------
  const [rotationIdx, setRotationIdx] = useState(0);
  const cIdxRef = useRef(0);
  const pIdxRef = useRef(0);

  // Reset rotation on period change.
  useEffect(() => {
    setRotationIdx(0);
    cIdxRef.current = 0;
    pIdxRef.current = 0;
  }, [mode, monthRef, yearRef]);

  // Keep rotation in bounds if the queue shrinks.
  useEffect(() => {
    if (insightTotal > 0 && rotationIdx >= insightTotal) setRotationIdx(0);
  }, [insightTotal, rotationIdx]);

  // BLOCO 3 — Auto-rotation (12s). prefers-reduced-motion → estático (sem timer).
  useEffect(() => {
    if (insightTotal <= 1) return;
    const reduced = typeof window !== "undefined"
      && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduced) return;
    const id = window.setInterval(() => {
      setRotationIdx((prev) => {
        const next = (prev + 1) % insightTotal;
        if (next === 0) {
          if (queue.C.length > 0) cIdxRef.current += 1;
          if (queue.P.length > 0) pIdxRef.current += 1;
        }
        return next;
      });
    }, 12000);
    return () => window.clearInterval(id);
  }, [insightTotal, queue.C.length, queue.P.length]);

  // Resolve which insight to show based on the rotation index.
  const insightToShow: InsightItem | null = useMemo(() => {
    if (insightTotal === 0) return null;
    if (rotationIdx < queue.N.length) return queue.N[rotationIdx];
    let i = rotationIdx - queue.N.length;
    if (queue.C.length > 0) {
      if (i === 0) return queue.C[cIdxRef.current % queue.C.length];
      i -= 1;
    }
    if (queue.P.length > 0 && i === 0) {
      return queue.P[pIdxRef.current % queue.P.length];
    }
    return null;
  }, [insightTotal, queue, rotationIdx]);

  // BLOCO 4 — pick phrase variation when the shown insight changes.
  const lastPhraseRef = useRef<{ id: string | null; phrase: string }>({ id: null, phrase: "" });
  const phraseShown = useMemo(() => {
    if (!insightToShow) return "";
    if (lastPhraseRef.current.id === insightToShow.id) return lastPhraseRef.current.phrase;
    const tpl = pickPhrase(insightToShow.phraseKey);
    const filled = fillPhrase(tpl, insightToShow.vars);
    lastPhraseRef.current = { id: insightToShow.id, phrase: filled };
    return filled;
  }, [insightToShow]);

  const renderInsightBlock = (): React.ReactNode => {
    // G2 — hide card whenever there is nothing meaningful to show.
    if (mode === "range") return null;
    if (!compare || !prevSummary) return null;
    if (!insightToShow) return null;

    const tone = TONE[insightToShow.phraseKey];
    const toneCls = TONE_CLASS[tone];
    const Icon = INSIGHT_ICON[insightToShow.phraseKey];
    const isPlatform = insightToShow.kind === "platform" && insightToShow.platformKey;
    const platMeta = isPlatform ? platformMetaFor(insightToShow.platformKey as string) : null;

    return (
      <div key="insights" className="space-y-1.5 animate-fade-in-up">
        <div className="px-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          Insights inteligentes
        </div>
        <div className="rounded-2xl bg-card/60 ring-1 ring-border/50 px-4 py-4 min-h-[96px] h-auto flex items-center gap-3">
          {isPlatform && platMeta ? (
            <PlatformLogo
              platformKey={insightToShow.platformKey as string}
              label={platMeta.label}
              hex={platMeta.hex}
              size="sm"
              imageUrl={platMeta.imageUrl ?? null}
            />
          ) : (
            <span
              className={cn(
                "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted/40",
                toneCls,
              )}
            >
              <Icon className="h-4 w-4" />
            </span>
          )}
          <div
            key={insightToShow.id}
            className="min-w-0 flex-1 text-sm leading-snug text-pretty hyphens-none text-foreground animate-fade-in motion-reduce:animate-none"
          >
            {phraseShown}
          </div>
        </div>
      </div>
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
                  <span>{format(monthRef, "MMMM 'de' yyyy", { locale: ptBR })}</span>
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
              setCalVisibleMonth(startOfMonth(from));
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
                <EnrichedCalendar
                  mode="range"
                  selected={calDraft}
                  onSelect={setCalDraft}
                  month={calVisibleMonth}
                  onMonthChange={setCalVisibleMonth}
                  numberOfMonths={1}
                  locale={ptBR}
                  disabled={(d) => d > new Date()}
                  className="pointer-events-auto"
                  dailyStats={calDailyStats}
                  valueMode={reportOrder[0] === "grossExpenses" ? "gross" : "net"}
                  plannedDates={settings.planningSelectedDates ?? []}
                  showPlanSemantics
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
          // Hero is always the first hero-eligible key in the order, and
          // is always rendered — even if the user toggled its widget off —
          // because the Reports screen requires a hero at the top.
          const heroKey: ReportCardKey = isHeroKey(reportOrder[0]) ? reportOrder[0] : "net";
          const visibleKeys = reportOrder.filter((k) => widgets[k] || k === heroKey);

          const renderHero = (k: ReportCardKey) => {
            if (k === "net") {
              return (
                <div key="hero-net" className="py-5 text-center">
                  <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                    Lucro líquido
                  </div>
                  <div className="mt-2 text-5xl sm:text-6xl font-bold tabular-nums tracking-tight text-success leading-none">
                    <AnimatedNumber value={s.net} format={brl} />
                  </div>
                  <div className="mt-3 text-xs text-muted-foreground tabular-nums">
                    Bruto <span className="text-info">{brl(s.gross)}</span> · Gastos <span className="text-destructive">{brl(s.totalExpenses)}</span>
                  </div>
                </div>
              );
            }
            // grossExpenses hero — Ganho bruto destacado em azul
            return (
              <div key="hero-grossExpenses" className="py-5 text-center">
                <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                  Ganho bruto
                </div>
                <div className="mt-2 text-5xl sm:text-6xl font-bold tabular-nums tracking-tight text-info leading-none">
                  <AnimatedNumber value={s.gross} format={brl} />
                </div>
                <div className="mt-3 text-xs text-muted-foreground tabular-nums">
                  Gastos <span className="text-destructive">{brl(s.totalExpenses)}</span> · Líquido <span className="text-success">{brl(s.net)}</span>
                </div>
              </div>
            );
          };

          // Each non-hero, non-chart key produces one or more rows.
          // Icons are monochromatic (success/70) to keep the list calm.
          const iconCls = "h-4 w-4 text-success/70";
          const moneyVal = (n: number): React.ReactNode => <AnimatedNumber value={n} format={brl} />;
          type Row = { icon: React.ReactNode; label: string; value: React.ReactNode; sub?: string };
          const rowsFor = (k: ReportCardKey): Row[] => {
            switch (k) {
              case "net":
                // Absorvido pelo herói "Ganho bruto".
                if (heroKey === "grossExpenses") return [];
                return [{ icon: <Wallet className={iconCls} />, label: "Lucro líquido", value: moneyVal(s.net) }];
              case "grossExpenses":
                // Absorvido pelo herói "Lucro líquido".
                if (heroKey === "net") return [];
                return [
                  { icon: <Wallet className={iconCls} />, label: "Bruto", value: moneyVal(s.gross) },
                  { icon: <Receipt className={iconCls} />, label: "Gastos", value: moneyVal(s.totalExpenses) },
                ];
              case "perHour":
                return [{
                  icon: <Gauge className={iconCls} />,
                  label: "Média por hora",
                  value: moneyVal(s.perHour),
                  sub: s.totalHours > 0 ? `${num(s.totalHours, 1)}h trabalhadas` : undefined,
                }];
              case "daysGroup":
                return [{
                  icon: <CalendarDays className={iconCls} />,
                  label: "Média / dia",
                  value: moneyVal(avgPerDay),
                  sub: workedDays > 0 ? `${workedDays} ${workedDays === 1 ? "ativo" : "ativos"}` : undefined,
                }];
              case "kmGroup":
                return [{
                  icon: <Route className={iconCls} />,
                  label: "R$ / km",
                  value: moneyVal(s.perKm),
                  sub: s.totalKm > 0 ? `${num(s.totalKm, 0)} km rodados` : undefined,
                }];
              case "tripsGroup":
                return [{
                  icon: <Flag className={iconCls} />,
                  label: "R$ / corrida",
                  value: moneyVal(s.perRide),
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
                <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  {chartTitle}
                </div>
                <div className="text-sm font-semibold" style={{ color: chartMeta.color }}>
                  {chartMeta.fullLabel}
                </div>
              </div>
              <div className="mb-3 grid grid-cols-4 gap-1.5">
                {CHARTS.map((c) => {
                  const active = c.key === chart;
                  return (
                    <button
                      key={c.key}
                      type="button"
                      onClick={() => setChart(c.key)}
                      className={cn(
                        "rounded-full px-2 py-1.5 text-xs font-medium text-center transition-colors",
                        !active && "bg-foreground/[0.04] text-muted-foreground hover:text-foreground",
                      )}
                      style={active ? {
                        backgroundColor: `color-mix(in srgb, ${c.color} 15%, transparent)`,
                        color: c.color,
                        boxShadow: `inset 0 0 0 1px color-mix(in srgb, ${c.color} 30%, transparent)`,
                      } : undefined}
                    >
                      {c.shortLabel}
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
          let insightsRendered = false;
          let overviewEyebrowRendered = false;
          const flushRowGroup = () => {
            if (rowGroup.length === 0) return;
            const flat = rowGroup.flatMap((g) => g.rows.map((r, idx) => ({ ...r, _key: `${g.key}-${idx}` })));
            const showEyebrow = insightsRendered && !overviewEyebrowRendered;
            if (showEyebrow) overviewEyebrowRendered = true;
            blocks.push(
              <div key={`group-${blocks.length}`} className="space-y-1.5">
                {showEyebrow && (
                  <div className="px-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    Visão geral
                  </div>
                )}
                <div className="rounded-2xl bg-card/40">
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
            if (k === "insights") {
              const node = renderInsightBlock();
              if (node) {
                flushRowGroup();
                blocks.push(node);
                insightsRendered = true;
              }
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

