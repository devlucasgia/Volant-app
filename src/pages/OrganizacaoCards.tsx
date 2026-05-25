import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft, LayoutGrid, Target, Brain, Gauge, BarChart3, Receipt, Timer as TimerIcon,
  Wallet, CalendarDays, Route, Flag, Clock, LineChart,
  ArrowLeftRight, Check, GripVertical, ArrowUp, ArrowDown,
} from "lucide-react";
import {
  DndContext, closestCenter, PointerSensor, TouchSensor, useSensor, useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { SortableHomeRow } from "@/components/account/SortableHomeRow";
import { Segmented } from "@/components/Segmented";
import { Button } from "@/components/ui/button";
import { useData } from "@/context/DataContext";
import { useHomeOrder, type HomeCardKey } from "@/lib/homeOrder";
import { useReportWidgets, type ReportWidgets } from "@/lib/reportWidgets";
import { useReportOrder, type ReportCardKey } from "@/lib/reportOrder";
import { useHeroMetric, type HeroMetric } from "@/lib/heroMetric";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { DashboardWidgets } from "@/types";

type Tab = "home" | "reports";

function ScreenHeader({ onBack }: { onBack: () => void }) {
  return (
    <header className="sticky top-0 z-20 border-b border-border bg-background/85 backdrop-blur-lg">
      <div className="flex items-center gap-3 px-3 py-3">
        <button
          type="button"
          onClick={onBack}
          aria-label="Voltar"
          className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-card transition-colors hover:bg-muted/50 active:scale-[0.96]"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <LayoutGrid className="h-4 w-4" />
        </span>
        <div className="min-w-0">
          <h1 className="truncate text-[17px] font-bold leading-tight tracking-tight text-foreground">
            Organização dos cards
          </h1>
          <p className="text-[11px] leading-tight text-muted-foreground/80">
            Controle a visibilidade e a ordem dos cards no app.
          </p>
        </div>
      </div>
    </header>
  );
}

const notifySaved = () =>
  toast.success("Alterações salvas", { id: "autosave", duration: 1600 });
const notifySaveError = () =>
  toast.error("Não foi possível salvar agora.", { id: "autosave" });

export default function OrganizacaoCards() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>("home");

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, []);

  return (
    <div className="min-h-screen">
      <ScreenHeader onBack={() => navigate("/ajustes/personalizacao")} />
      <div className="space-y-4 px-4 py-6">
        <Segmented<Tab>
          options={[
            { key: "home", label: "Tela inicial" },
            { key: "reports", label: "Relatórios" },
          ]}
          value={tab}
          onChange={setTab}
          size="sm"
        />

        {tab === "home" ? <HomeOrganizer /> : <ReportsOrganizer />}
      </div>
    </div>
  );
}

/* ------------------------------ Home ------------------------------ */

function HomeOrganizer() {
  const { settings, updateSettings } = useData();
  const [homeOrder, moveHome, reorderHome] = useHomeOrder();
  const [heroMetric, setHeroMetric] = useHeroMetric();
  const widgets = settings.dashboardWidgets;

  const dndSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 6 } }),
  );

  const setWidget = async (k: keyof DashboardWidgets, v: boolean) => {
    try {
      await updateSettings({ dashboardWidgets: { ...widgets, [k]: v } });
      notifySaved();
    } catch {
      notifySaveError();
    }
  };

  const labels: Partial<Record<HomeCardKey, { label: string; icon: React.ReactNode }>> = {
    goal:      { label: "Meta",        icon: <Target className="h-4 w-4" /> },
    smartKm:   { label: "R$/km inteligente", icon: <Brain className="h-4 w-4" /> },
    stats:     { label: "Performance", icon: <Gauge className="h-4 w-4" /> },
    byApp:     { label: "Por app",     icon: <BarChart3 className="h-4 w-4" /> },
    byExpense: { label: "Gastos",      icon: <Receipt className="h-4 w-4" /> },
    journey:   { label: "Jornada",     icon: <TimerIcon className="h-4 w-4" /> },
  };
  const draggable = homeOrder.filter((k) => k !== "greeting");

  const onDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    reorderHome(active.id as HomeCardKey, over.id as HomeCardKey);
    notifySaved();
  };

  return (
    <div className="space-y-4">
      {/* Hero metric block */}
      <div className="rounded-2xl border border-primary/20 bg-primary/[0.04] p-3">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/15 text-primary">
            <ArrowLeftRight className="h-3.5 w-3.5" />
          </span>
          <div className="min-w-0">
            <div className="text-[13px] font-semibold leading-tight">Destaque do card principal</div>
            <div className="text-[11px] text-muted-foreground leading-snug">
              Escolha qual valor aparece em maior evidência na tela inicial.
            </div>
          </div>
        </div>
        <div role="radiogroup" aria-label="Destaque do card principal" className="mt-3 grid grid-cols-2 gap-2">
          {([
            { k: "net" as HeroMetric, label: "Lucro líquido", hint: "Valor após gastos" },
            { k: "gross" as HeroMetric, label: "Bruto", hint: "Total dos ganhos" },
          ]).map((o) => {
            const active = heroMetric === o.k;
            return (
              <button
                key={o.k}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => {
                  if (heroMetric === o.k) return;
                  setHeroMetric(o.k);
                  notifySaved();
                }}
                className={cn(
                  "relative rounded-xl border px-3 py-2.5 text-left transition-all duration-300 active:scale-[0.98]",
                  active
                    ? "border-primary/55 bg-primary/[0.08] shadow-[0_0_0_1px_hsl(var(--primary)/0.12),0_4px_14px_-10px_hsl(var(--primary)/0.5)]"
                    : "border-border/60 bg-muted/25 hover:bg-muted/40",
                )}
              >
                <div className="flex items-center justify-between">
                  <div className={cn("text-[13px] font-semibold", active ? "text-foreground" : "text-muted-foreground/90")}>
                    {o.label}
                  </div>
                  {active && <Check className="h-3.5 w-3.5 text-primary" strokeWidth={3} />}
                </div>
                <div className="mt-0.5 text-[10.5px] text-muted-foreground/80">{o.hint}</div>
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <div className="px-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/80">
          Blocos da tela inicial
        </div>
        <p className="mt-1 px-1 text-[11px] leading-snug text-muted-foreground">
          Toque no card para ativar/desativar. Arraste pela alça <GripVertical className="inline h-3 w-3 align-text-bottom" /> ou use as setas para reordenar.
        </p>
      </div>

      <div className="space-y-2">
        <DndContext sensors={dndSensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <SortableContext items={draggable} strategy={verticalListSortingStrategy}>
            {draggable.map((k, i) => {
              const meta = labels[k]!;
              const active = (widgets as any)[k] as boolean;
              const isLast = i === draggable.length - 1;
              return (
                <SortableHomeRow key={k} id={k} active={active}>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      role="switch"
                      aria-checked={active}
                      onClick={() => setWidget(k as keyof DashboardWidgets, !active)}
                      className="flex flex-1 items-center gap-2.5 rounded-lg px-1.5 py-1 text-left transition-transform active:scale-[0.98]"
                    >
                      <span className={cn(
                        "flex h-7 w-7 items-center justify-center rounded-md transition-colors",
                        active ? "bg-primary/15 text-primary" : "bg-background/60 text-muted-foreground/70",
                      )}>{meta.icon}</span>
                      <span className={cn(
                        "text-[13px] font-semibold",
                        active ? "text-foreground" : "text-muted-foreground/80",
                      )}>{meta.label}</span>
                      <span className={cn(
                        "ml-auto text-[10px] font-bold uppercase tracking-wider",
                        active ? "text-primary/80" : "text-muted-foreground/60",
                      )}>{active ? "Ativo" : "Oculto"}</span>
                    </button>
                    <div className="flex shrink-0 items-center gap-0.5 pl-1">
                      <Button type="button" variant="ghost" size="icon" className="h-7 w-7"
                        disabled={i === 0}
                        onClick={() => { moveHome(k, -1); notifySaved(); }}
                        aria-label={`Mover ${meta.label} para cima`}>
                        <ArrowUp className="h-3.5 w-3.5" />
                      </Button>
                      <Button type="button" variant="ghost" size="icon" className="h-7 w-7"
                        disabled={isLast}
                        onClick={() => { moveHome(k, 1); notifySaved(); }}
                        aria-label={`Mover ${meta.label} para baixo`}>
                        <ArrowDown className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </SortableHomeRow>
              );
            })}
          </SortableContext>
        </DndContext>
      </div>
    </div>
  );
}

/* ------------------------------ Reports ------------------------------ */

function ReportsOrganizer() {
  const [reportWidgets, toggleReportWidget] = useReportWidgets();
  const [reportOrder, moveReport, reorderReport] = useReportOrder();

  const dndSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 6 } }),
  );

  const labels: Record<ReportCardKey, { label: string; icon: React.ReactNode }> = {
    net:        { label: "Lucro líquido", icon: <Wallet className="h-4 w-4" /> },
    perHour:    { label: "R$ / hora",     icon: <Gauge className="h-4 w-4" /> },
    gross:      { label: "Bruto",         icon: <Wallet className="h-4 w-4" /> },
    expenses:   { label: "Gastos",        icon: <Receipt className="h-4 w-4" /> },
    activeDays: { label: "Dias ativos",   icon: <CalendarDays className="h-4 w-4" /> },
    perDay:     { label: "Média / dia",   icon: <Clock className="h-4 w-4" /> },
    totalKm:    { label: "KM total",      icon: <Route className="h-4 w-4" /> },
    perKm:      { label: "R$ / km",       icon: <Route className="h-4 w-4" /> },
    trips:      { label: "Corridas",      icon: <Flag className="h-4 w-4" /> },
    perTrip:    { label: "R$ / corrida",  icon: <Flag className="h-4 w-4" /> },
    chart:      { label: "Gráfico",       icon: <LineChart className="h-4 w-4" /> },
  };

  const onDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    reorderReport(active.id as ReportCardKey, over.id as ReportCardKey);
    notifySaved();
  };

  const toggle = (k: keyof ReportWidgets) => {
    toggleReportWidget(k);
    notifySaved();
  };

  return (
    <div className="space-y-4">
      <p className="px-1 text-[11px] leading-snug text-muted-foreground">
        Toque no card para ativar/desativar. Arraste pela alça <GripVertical className="inline h-3 w-3 align-text-bottom" /> ou use as setas para reordenar.
      </p>
      <div className="space-y-2">
        <DndContext sensors={dndSensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <SortableContext items={reportOrder} strategy={verticalListSortingStrategy}>
            {reportOrder.map((k, i) => {
              const meta = labels[k];
              const active = reportWidgets[k];
              const isLast = i === reportOrder.length - 1;
              return (
                <SortableHomeRow key={k} id={k} active={active}>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      role="switch"
                      aria-checked={active}
                      onClick={() => toggle(k)}
                      className="flex flex-1 items-center gap-2.5 rounded-lg px-1.5 py-1 text-left transition-transform active:scale-[0.98]"
                    >
                      <span className={cn(
                        "flex h-7 w-7 items-center justify-center rounded-md transition-colors",
                        active ? "bg-primary/15 text-primary" : "bg-background/60 text-muted-foreground/70",
                      )}>{meta.icon}</span>
                      <span className={cn(
                        "text-[13px] font-semibold",
                        active ? "text-foreground" : "text-muted-foreground/80",
                      )}>{meta.label}</span>
                      <span className={cn(
                        "ml-auto text-[10px] font-bold uppercase tracking-wider",
                        active ? "text-primary/80" : "text-muted-foreground/60",
                      )}>{active ? "Ativo" : "Oculto"}</span>
                    </button>
                    <div className="flex shrink-0 items-center gap-0.5 pl-1">
                      <Button type="button" variant="ghost" size="icon" className="h-7 w-7"
                        disabled={i === 0}
                        onClick={() => { moveReport(k, -1); notifySaved(); }}
                        aria-label={`Mover ${meta.label} para cima`}>
                        <ArrowUp className="h-3.5 w-3.5" />
                      </Button>
                      <Button type="button" variant="ghost" size="icon" className="h-7 w-7"
                        disabled={isLast}
                        onClick={() => { moveReport(k, 1); notifySaved(); }}
                        aria-label={`Mover ${meta.label} para baixo`}>
                        <ArrowDown className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </SortableHomeRow>
              );
            })}
          </SortableContext>
        </DndContext>
      </div>
    </div>
  );
}
