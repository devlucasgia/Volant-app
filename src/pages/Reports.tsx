import { useMemo, useState } from "react";
import { PageHeader, StatCard } from "@/components/ui-bits";
import { useData } from "@/context/DataContext";
import { byApp, filterByPeriod, Period, summarize } from "@/lib/stats";
import { APP_META, AppName, EXPENSE_META } from "@/types";
import { brl } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Download, FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { toast } from "sonner";

const PERIODS: { key: Period; label: string }[] = [
  { key: "day", label: "Hoje" },
  { key: "week", label: "Semana" },
  { key: "month", label: "Mês" },
  { key: "all", label: "Tudo" },
];

const APP_HEX: Record<AppName, string> = {
  uber: "#000000",
  "99": "#FFCC00",
  indriver: "#A4E333",
  particular: "#3B82F6",
};

export default function Reports() {
  const { entries } = useData();
  const [period, setPeriod] = useState<Period>("month");
  const filtered = useMemo(() => filterByPeriod(entries, period), [entries, period]);
  const s = useMemo(() => summarize(filtered), [filtered]);
  const apps = useMemo(() => byApp(filtered), [filtered]);

  const chartData = (Object.keys(apps) as AppName[]).map((k) => ({
    name: APP_META[k].label,
    valor: Math.round(apps[k] * 100) / 100,
    fill: APP_HEX[k],
  }));

  const exportCSV = () => {
    const rows = [
      ["Data", "Tipo", "App/Categoria", "Km", "Horas", "Valor", "Observações"],
      ...filtered.map((e) =>
        e.type === "earning"
          ? [format(new Date(e.date), "yyyy-MM-dd HH:mm"), "Ganho", APP_META[e.app].label, String(e.km), String(e.hours), e.gross.toFixed(2), e.notes || ""]
          : [format(new Date(e.date), "yyyy-MM-dd HH:mm"), "Gasto", EXPENSE_META[e.expense.category].label, "", "", e.expense.amount.toFixed(2), e.expense.description || ""]
      ),
    ];
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `drivefin-${period}-${format(new Date(), "yyyyMMdd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV exportado!");
  };

  const exportPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text("DriveFin · Relatório", 14, 18);
    doc.setFontSize(10);
    doc.text(`Período: ${PERIODS.find((p) => p.key === period)?.label} · Gerado em ${format(new Date(), "dd/MM/yyyy HH:mm")}`, 14, 25);

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
          : [format(new Date(e.date), "dd/MM HH:mm"), "Gasto", EXPENSE_META[e.expense.category].label, "-", "-", brl(e.expense.amount)]
      ),
      theme: "grid",
      styles: { fontSize: 9 },
    });

    doc.save(`drivefin-${period}-${format(new Date(), "yyyyMMdd")}.pdf`);
    toast.success("PDF exportado!");
  };

  return (
    <>
      <PageHeader title="Relatórios" subtitle="Performance e exportação" />
      <div className="space-y-5 px-4 pt-4">
        <div className="flex rounded-xl bg-muted p-1">
          {PERIODS.map((p) => (
            <button
              key={p.key}
              onClick={() => setPeriod(p.key)}
              className={cn(
                "flex-1 rounded-lg py-2 text-xs font-medium transition-all",
                period === p.key ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"
              )}
            >
              {p.label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <StatCard label="Lucro" value={brl(s.net)} accent="success" />
          <StatCard label="Bruto" value={brl(s.gross)} />
        </div>

        <div className="rounded-2xl border border-border bg-card p-4">
          <div className="mb-3 text-sm font-semibold">Comparativo entre apps</div>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                <Tooltip
                  contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 12, fontSize: 12 }}
                  formatter={(v: number) => brl(v)}
                />
                <Bar dataKey="valor" radius={[8, 8, 0, 0]} />
              </BarChart>
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
