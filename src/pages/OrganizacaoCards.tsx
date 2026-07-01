import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft, LayoutGrid, Target, Brain, Gauge, BarChart3, Receipt, Timer as TimerIcon,
  Wallet, CalendarDays, Route, Flag, Clock, LineChart, Lightbulb,
  Check, GripVertical, ArrowUp, ArrowDown,
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
import { useReportOrder, isHeroKey, type ReportCardKey } from "@/lib/reportOrder";

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
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted/50 text-foreground/70 ring-1 ring-inset ring-current/15 shadow-[0_0_12px_-6px_currentColor]">
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
          tone="flat"
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
  const [reportOrder, moveReport, reorderReport, setReportHero] = useReportOrder();

  const dndSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 6 } }),
  );

  const labels: Record<ReportCardKey, { label: string; icon: React.ReactNode }> = {
    net:           { label: "Lucro líquido",              icon: <Wallet className="h-4 w-4" /> },
    insights:      { label: "Insights Inteligentes",      icon: <Lightbulb className="h-4 w-4" /> },
    perHour:       { label: "R$ / hora",                  icon: <Gauge className="h-4 w-4" /> },
    grossExpenses: { label: "Bruto e Gastos",             icon: <Wallet className="h-4 w-4" /> },
    daysGroup:     { label: "Dias ativos + Média / dia",  icon: <CalendarDays className="h-4 w-4" /> },
    kmGroup:       { label: "KM total + Média / km",      icon: <Route className="h-4 w-4" /> },
    tripsGroup:    { label: "Corridas + R$ / corrida",    icon: <Flag className="h-4 w-4" /> },
    chart:         { label: "Gráfico",                    icon: <LineChart className="h-4 w-4" /> },
  };

  const heroKey: ReportCardKey = isHeroKey(reportOrder[0]) ? reportOrder[0] : "net";
  const restOrder = reportOrder.slice(1);

  const onDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const fromKey = active.id as ReportCardKey;
    const toKey = over.id as ReportCardKey;
    // Guard against dropping a non-hero into the hero slot (position 0).
    // Since we only render items after the hero in this list, dropping
    // above the topmost restOrder item is fine — it lands at index 1.
    reorderReport(fromKey, toKey);
    notifySaved();
  };

  const toggle = (k: keyof ReportWidgets) => {
    // Prevent hiding the current hero.
    if (k === heroKey) return;
    toggleReportWidget(k);
    notifySaved();
  };

  const changeHero = (next: ReportCardKey) => {
    if (next === heroKey) return;
    setReportHero(next);
    // Also make sure both hero-eligible widgets stay visible so the
    // Reports screen never has to fall back silently.
    if (!reportWidgets[next]) toggleReportWidget(next);
    notifySaved();
  };

  return (
    <div className="space-y-5">
      {/* HERO PICKER */}
      <div className="space-y-2">
        <div className="px-1">
          <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/80">
            Card em destaque
          </div>
          <p className="mt-1 text-[11px] leading-snug text-muted-foreground">
            Escolha o valor principal exibido no topo da tela de Relatórios.
          </p>
        </div>
        <Segmented<ReportCardKey>
          options={[
            { key: "net", label: "Lucro líquido" },
            { key: "grossExpenses", label: "Bruto e Gastos" },
          ]}
          value={heroKey}
          onChange={changeHero}
          size="sm"
        />
      </div>

      {/* OTHER CARDS */}
      <div className="space-y-2">
        <div className="px-1">
          <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/80">
            Demais cards
          </div>
          <p className="mt-1 text-[11px] leading-snug text-muted-foreground">
            Toque no card para ativar/desativar. Arraste pela alça <GripVertical className="inline h-3 w-3 align-text-bottom" /> ou use as setas para reordenar.
          </p>
        </div>
        <DndContext sensors={dndSensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <SortableContext items={restOrder} strategy={verticalListSortingStrategy}>
            {restOrder.map((k, i) => {
              const meta = labels[k];
              const active = reportWidgets[k];
              const isLast = i === restOrder.length - 1;
              // Up arrow on the first item would move it into the hero
              // slot — blocked unless the item is hero-eligible.
              const upDisabled = i === 0 && !isHeroKey(k);
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
                        disabled={upDisabled}
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
