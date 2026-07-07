import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useData } from "@/context/DataContext";
import { useAuth } from "@/context/AuthContext";
import { useUI } from "@/context/UIContext";
import { useTimer } from "@/context/TimerContext";
import { supabase } from "@/integrations/supabase/client";
import { byApp, byExpenseCategory, filterByPeriod, Period, summarize, totalKmAllTime, goalForPeriod, type CustomRange } from "@/lib/stats";
import { brl, num } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";
import { Wrench, Target, Clock, Route, Gauge, Timer as TimerIcon, CalendarRange, Check, TrendingUp, Eye, EyeOff, Bell, ChevronRight, Coffee, BarChart3, Receipt, ArrowLeftRight } from "lucide-react";
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, differenceInCalendarDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { PlatformLogo } from "@/components/PlatformLogo";
import { JourneyModule } from "@/components/JourneyModule";
import { useHomeOrder, type HomeCardKey } from "@/lib/homeOrder";

import { useGreetingStyle, greetingStyleClass, useGreetingEmoji } from "@/lib/greetingStyle";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription } from "@/components/ui/drawer";
import { EnrichedCalendar } from "@/components/ui/EnrichedCalendar";
import { buildDailyStats } from "@/lib/calendarDayStats";
import { Button } from "@/components/ui/button";
import type { DateRange } from "react-day-picker";
import { useAccess } from "@/context/AccessContext";
import { computeMonthlyVehicleCosts, computeSmartKm, getCurrentMonthRealData } from "@/lib/smartKm";
import { toIsoDate, startOfDay as plStartOfDay } from "@/lib/planejamento";
import { usePlanningSnapshot } from "@/lib/planningEngine";
import { useHeroMetric } from "@/lib/heroMetric";
import volantSymbol from "@/assets/volant-symbol-header.png";
import { NotificationsSheet } from "@/components/NotificationsSheet";

import { useNotifications } from "@/hooks/useNotifications";
import { ensureMaintenanceNotifications } from "@/lib/notifications";

import { Segmented } from "@/components/Segmented";
import { useCountUp } from "@/hooks/useCountUp";
import { ShareResultSheet, type ShareCardData } from "@/components/share/ShareResultSheet";
import { Share2 } from "lucide-react";


export default function Dashboard() {
  const { entries, settings, updateSettings, carInitialKm, activeCar, cars, expenseMetaFor, platformMetaFor, isSimplePlatform, loading: dataLoading } = useData();
  const { isFull, isPaidPremium } = useAccess();
  const { user } = useAuth();
  const { openDrawer } = useUI();
  const { state: timerState } = useTimer();
  const [period, setPeriod] = useState<Period>("day");
  const navigate = useNavigate();
  const [customRange, setCustomRange] = useState<CustomRange | null>(null);
  const [calOpen, setCalOpen] = useState(false);
  const [calDraft, setCalDraft] = useState<DateRange | undefined>(undefined);
  const [calVisibleMonth, setCalVisibleMonth] = useState<Date>(() => startOfMonth(new Date()));
  const calDailyStats = useMemo(
    () => buildDailyStats(entries, calVisibleMonth),
    [entries, calVisibleMonth],
  );
  const [hideValues, setHideValues] = useState(() => {
    if (typeof window === "undefined") return false;
    try { return window.localStorage.getItem("volant.hideValues") === "1"; } catch { return false; }
  });
  const widgets = settings.dashboardWidgets;
  const [homeOrder] = useHomeOrder();
  const [heroView, setHeroView] = useHeroMetric();
  const heroMetric: "net" | "gross" = heroView;
  const plan = usePlanningSnapshot();
  const showGrossView = heroView === "gross";
  const [greetingStyle] = useGreetingStyle();
  const [greetingEmoji] = useGreetingEmoji();
  const [notifOpen, setNotifOpen] = useState(false);
  // TEMP: ponto de entrada de teste — remover/substituir na Parte 2
  const [shareOpen, setShareOpen] = useState(false);
  const planningSnapshot = useMemo(
    () => ({
      monthlyGoal: settings.monthlyGoal,
      kmPlannedMonth: settings.kmPlannedMonth,
      workingDaysPerMonth: settings.workingDaysPerMonth,
    }),
    [settings.monthlyGoal, settings.kmPlannedMonth, settings.workingDaysPerMonth],
  );
  const { unread: unreadNotifs } = useNotifications(user?.id, user?.created_at, {
    isPaidPremium,
    planning: planningSnapshot,
    cars: cars as any,
    ready: !dataLoading,
  });



  useEffect(() => {
    try { window.localStorage.setItem("volant.hideValues", hideValues ? "1" : "0"); } catch { /* ignore */ }
  }, [hideValues]);

  // Personalized greeting — nickname + optional subtitle message from profiles.
  const [nickname, setNickname] = useState<string>("");
  const [greetingMessage, setGreetingMessage] = useState<string>("");
  useEffect(() => {
    if (!user) { setNickname(""); setGreetingMessage(""); return; }
    let active = true;
    (async () => {
      const { data } = await (supabase.from("profiles") as any)
        .select("nickname, greeting_message").eq("id", user.id).maybeSingle();
      if (!active) return;
      setNickname(((data as any)?.nickname ?? "").trim());
      setGreetingMessage(((data as any)?.greeting_message ?? "").trim());
    })();
    return () => { active = false; };
  }, [user]);

  const greetingName = useMemo(() => {
    if (nickname) return nickname;
    const md = (user?.user_metadata ?? {}) as Record<string, unknown>;
    const full = ((md.full_name as string) || (md.name as string) || (md.display_name as string) || "").trim();
    if (full) return full.split(/\s+/)[0];
    return "Motorista";
  }, [nickname, user]);

  const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
  const contextualDate = useMemo(() => {
    const now = new Date();
    if (period === "day") {
      return cap(format(now, "EEEE, d 'de' MMMM", { locale: ptBR }));
    }
    if (period === "week") {
      const wso = (settings.weekStartsOn ?? 1) as 0 | 1;
      const s = startOfWeek(now, { weekStartsOn: wso });
      const e = endOfWeek(now, { weekStartsOn: wso });
      const sameMonth = s.getMonth() === e.getMonth();
      if (sameMonth) {
        return `${format(s, "d", { locale: ptBR })} a ${format(e, "d 'de' MMMM", { locale: ptBR })}`;
      }
      return `${format(s, "d 'de' MMM", { locale: ptBR })} a ${format(e, "d 'de' MMM", { locale: ptBR })}`;
    }
    if (period === "month") {
      return cap(format(now, "MMMM 'de' yyyy", { locale: ptBR }));
    }
    // custom
    if (customRange) {
      const { from, to } = customRange;
      const single = +from === +to || format(from, "yyyy-MM-dd") === format(to, "yyyy-MM-dd");
      if (single) return `${format(from, "d 'de' MMMM 'de' yyyy", { locale: ptBR })}`;
      const sameMonth = from.getMonth() === to.getMonth() && from.getFullYear() === to.getFullYear();
      if (sameMonth) return `${format(from, "d", { locale: ptBR })} a ${format(to, "d 'de' MMMM", { locale: ptBR })}`;
      return `${format(from, "d 'de' MMM", { locale: ptBR })} a ${format(to, "d 'de' MMM", { locale: ptBR })}`;
    }
    return "";
  }, [period, customRange, settings.weekStartsOn]);

  const filtered = useMemo(
    () => filterByPeriod(entries, period, customRange ?? undefined, (settings.weekStartsOn ?? 1) as 0 | 1),
    [entries, period, customRange, settings.weekStartsOn]
  );
  const s = useMemo(() => summarize(filtered, isSimplePlatform), [filtered, isSimplePlatform]);
  // Animated hero value — count-up between Líquido/Bruto swaps.
  const heroValueRaw = heroMetric === "gross" ? s.gross : s.net;
  const animatedHeroValue = useCountUp(heroValueRaw, 380);
  const apps = useMemo(() => byApp(filtered), [filtered]);
  const expCats = useMemo(() => byExpenseCategory(filtered), [filtered]);

  // Daily-journey goal override (today only, set inside Jornada modal).
  const todayKey = format(new Date(), "yyyy-MM-dd");
  const [overrideTick, setOverrideTick] = useState(0);
  useEffect(() => {
    const handler = () => setOverrideTick((t) => t + 1);
    window.addEventListener("volant:dayGoalChanged", handler);
    window.addEventListener("storage", handler);
    return () => {
      window.removeEventListener("volant:dayGoalChanged", handler);
      window.removeEventListener("storage", handler);
    };
  }, []);
  const journeyDailyOverride = useMemo(() => {
    try {
      const view = showGrossView ? "gross" : "net";
      // 1) Chave nova por visão (líquido/bruto não se sobrescrevem)
      const raw = localStorage.getItem(`volant_day_goal_${view}_${todayKey}`);
      const n = raw ? Number(raw) : 0;
      if (n > 0) return n;
      // 2) Migração leve: chave antiga sem visão (compat com metas de hoje gravadas antes do hotfix)
      const legacy = localStorage.getItem(`volant_day_goal_${todayKey}`);
      const ln = legacy ? Number(legacy) : 0;
      return ln > 0 ? ln : null;
    } catch { return null; }
  }, [todayKey, settings.monthlyGoal, calOpen, overrideTick, showGrossView]);

  // Alvo mensal e meta diária vêm do motor do Planejamento Inteligente quando configurado.
  // Lente única (semântica financeira correta):
  //   BRUTO   = faturamento necessário = meta cadastrada + custos fixos + variáveis.
  //   LÍQUIDO = sobra desejada (meta cadastrada).
  const monthlyTargetForView = plan.isPlanningConfigured
    ? (showGrossView ? plan.homeGrossTarget : plan.homeNetTarget)
    : settings.monthlyGoal;
  const dailyForView = plan.isPlanningConfigured && plan.remainingWorkdaysCount > 0
    ? (showGrossView ? plan.homeDailyGross : plan.homeDailyNet)
    : null;
  const goalOpts = useMemo(
    () => ({
      goalType: (showGrossView ? "bruto" : "liquido") as "bruto" | "liquido",
      workingDays: settings.workingDaysPerMonth,
      remainingWorkingDays: plan.isPlanningConfigured ? plan.remainingWorkdaysCount : settings.remainingWorkingDays,
      dailyOverride: dailyForView,
      plannedDates: settings.planningSelectedDates,
      weekStartsOn: (settings.weekStartsOn ?? 1) as 0 | 1,
    }),
    [showGrossView, settings.workingDaysPerMonth, settings.remainingWorkingDays, settings.planningSelectedDates, settings.weekStartsOn, dailyForView, plan.isPlanningConfigured, plan.remainingWorkdaysCount],
  );
  const periodGoal = useMemo(
    () => goalForPeriod(period, monthlyTargetForView, entries, customRange ?? undefined, journeyDailyOverride, goalOpts),
    [period, monthlyTargetForView, entries, customRange, journeyDailyOverride, goalOpts]
  );
  // Progresso usa bruto na visão Bruto e líquido real (bruto - gastos) na visão Líquido,
  // espelhando o card de Lucro Líquido do herói e o alvo da lente ativa.
  const goalProgressValue = showGrossView ? s.gross : s.net;

  const goalPct = periodGoal.value > 0 ? Math.min(100, (goalProgressValue / periodGoal.value) * 100) : 0;
  const goalReached = periodGoal.value > 0 && goalProgressValue >= periodGoal.value;
  const goalRemaining = Math.max(0, periodGoal.value - goalProgressValue);
  const overAmount = Math.max(0, goalProgressValue - periodGoal.value);
  const overPct = periodGoal.value > 0 && overAmount > 0 ? (overAmount / periodGoal.value) * 100 : 0;

  // Folga programada — o dia ativo (hoje no "day", dia único em "custom")
  // não está em planningSelectedDates. Mantém progresso semanal/mensal intacto.
  const todayIsoStr = useMemo(() => toIsoDate(plStartOfDay(new Date())), []);
  const activeDayIso = useMemo(() => {
    if (period === "day") return todayIsoStr;
    if (period === "custom" && customRange) {
      const sameDay = +customRange.from === +customRange.to
        || format(customRange.from, "yyyy-MM-dd") === format(customRange.to, "yyyy-MM-dd");
      if (sameDay) return toIsoDate(plStartOfDay(customRange.from));
    }
    return null;
  }, [period, customRange, todayIsoStr]);
  const isFolga = useMemo(() => {
    if (!activeDayIso) return false;
    if (!plan.isPlanningConfigured) return false;
    if (plan.selectedWorkdaysCount <= 0) return false;
    if (s.gross > 0 || s.count > 0) return false; // trabalhou -> nunca é folga
    const dates = settings.planningSelectedDates ?? [];
    return !dates.includes(activeDayIso);
  }, [activeDayIso, plan.isPlanningConfigured, plan.selectedWorkdaysCount, settings.planningSelectedDates, s.gross, s.count]);
  const isFolgaToday = isFolga && activeDayIso === todayIsoStr;

  // Item 4 — flag de sessão: motorista decidiu trabalhar num dia de folga.
  // Combina localStorage (clique no card de Jornada) com o estado do timer
  // (se a jornada já estiver rodando, mesmo sem flag local, trata como trabalho).
  const [folgaWorkedTick, setFolgaWorkedTick] = useState(0);
  useEffect(() => {
    const handler = () => setFolgaWorkedTick((t) => t + 1);
    window.addEventListener("volant:folgaWorkedChanged", handler);
    window.addEventListener("storage", handler);
    return () => {
      window.removeEventListener("volant:folgaWorkedChanged", handler);
      window.removeEventListener("storage", handler);
    };
  }, []);
  const folgaWorkedToday = useMemo(() => {
    try { return localStorage.getItem(`volant_folga_worked_${todayIsoStr}`) === "1"; }
    catch { return false; }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [todayIsoStr, folgaWorkedTick]);
  const isFolgaTodayEffective =
    isFolgaToday && !folgaWorkedToday && timerState === "idle";
  // Para dias passados isFolga permanece. Para hoje só conta se ainda não trabalhou.
  const isFolgaEffective = isFolga && (!isFolgaToday || isFolgaTodayEffective);

  // Monthly projection — only when viewing the month. Uses net pace so far.
  const monthlyProjection = useMemo(() => {
    if (period !== "month") return null;
    const now = new Date();
    const mStart = startOfMonth(now);
    const mEnd = endOfMonth(now);
    const elapsed = Math.max(1, differenceInCalendarDays(now, mStart) + 1);
    const total = differenceInCalendarDays(mEnd, mStart) + 1;
    if (s.net <= 0) return null;
    return Math.round((s.net / elapsed) * total);
  }, [period, s.net]);

  // KM Inteligente — sempre exibido em BRUTO (R$/km piso que cobre todos os custos),
  // independente do toggle Líquido/Bruto. É o faturamento mínimo por km.
  const smartKmValue = useMemo(() => {
    if (!isFull) return null;
    if (!plan.isPlanningConfigured) return null;
    const v = plan.homeSmartRpkGross;
    return v > 0 ? v : null;
  }, [isFull, plan.isPlanningConfigured, plan.homeSmartRpkGross]);

  // Status compartilhado entre R$/km mínimo (KM Inteligente) e R$/km real (Performance).
  // Compara perKm real com o mínimo necessário. Sem dados => neutro.
  type RpkStatus = "none" | "ok" | "warn" | "bad";
  const rpkMin = plan.isPlanningConfigured ? plan.homeSmartRpkGross : 0;
  const rpkStatus: RpkStatus = (() => {
    if (rpkMin <= 0 || s.totalKm <= 0 || s.perKm <= 0) return "none";
    const ratio = s.perKm / rpkMin;
    if (ratio >= 1) return "ok";
    if (ratio >= 0.8) return "warn";
    return "bad";
  })();
  const rpkStatusTextClass =
    rpkStatus === "ok" ? "text-success"
    : rpkStatus === "warn" ? "text-warning"
    : rpkStatus === "bad" ? "text-destructive"
    : "text-muted-foreground";
  const rpkStatusBarClass =
    rpkStatus === "ok" ? "[&>div]:bg-success"
    : rpkStatus === "warn" ? "[&>div]:bg-warning"
    : rpkStatus === "bad" ? "[&>div]:bg-destructive"
    : "[&>div]:bg-muted-foreground/50";
  const rpkDiff = s.perKm - rpkMin;


  // KM planejado fatiado pelo período ativo — replica a mesma mecânica de goalForPeriod.
  // Base: averageKmPerDay × dias planejados no recorte (semana/custom contam planningSelectedDates).
  const kmPlannedForPeriod = useMemo(() => {
    if (!plan.isPlanningConfigured || plan.averageKmPerDay <= 0) return 0;
    const dailyKm = plan.averageKmPerDay;
    const plannedDates = settings.planningSelectedDates ?? [];
    const countInRange = (from: Date, to: Date) => {
      if (!plannedDates.length) return 0;
      const f = format(from, "yyyy-MM-dd");
      const t = format(to, "yyyy-MM-dd");
      return plannedDates.filter((d) => d >= f && d <= t).length;
    };
    if (period === "day") return dailyKm;
    if (period === "week") {
      const now = new Date();
      const wso = (settings.weekStartsOn ?? 1) as 0 | 1;
      const ws = startOfWeek(now, { weekStartsOn: wso });
      const we = endOfWeek(now, { weekStartsOn: wso });
      const n = countInRange(ws, we);
      return dailyKm * (n > 0 ? n : 7);
    }
    if (period === "month") return plan.plannedKmTotal;
    if (period === "custom" && customRange) {
      const n = countInRange(customRange.from, customRange.to);
      const days = Math.max(1, differenceInCalendarDays(customRange.to, customRange.from) + 1);
      return dailyKm * (n > 0 ? n : days);
    }
    return plan.plannedKmTotal;
  }, [plan.isPlanningConfigured, plan.averageKmPerDay, plan.plannedKmTotal, settings.planningSelectedDates, settings.weekStartsOn, period, customRange]);


  const totalKmDriven = totalKmAllTime(entries);
  const realCurrentKm = carInitialKm + totalKmDriven + Number(activeCar?.km_adjustment || 0);
  // Banner de manutenção agora vem dos intervalos cadastrados em Custos (óleo e pneus),
  // não mais do antigo settings.maintenanceIntervalKm.
  const maintAlerts = useMemo(() => {
    if (!activeCar) return [] as Array<{ type: "oleo" | "pneus"; kmRemaining: number; milestoneKm: number }>;
    const out: Array<{ type: "oleo" | "pneus"; kmRemaining: number; milestoneKm: number }> = [];
    for (const type of ["oleo", "pneus"] as const) {
      const intervalKm = Number(
        type === "oleo" ? activeCar.oil_change_interval_km : activeCar.tires_interval_km,
      ) || 0;
      if (intervalKm <= 0) continue;
      const maintEntries = entries
        .filter((e) => e.type === "expense" && e.expense.category === "manutencao" && e.expense.maintenanceType === type)
        .sort((a, b) => +new Date(b.date) - +new Date(a.date));
      let lastKm = carInitialKm;
      if (maintEntries.length > 0) {
        const lastDate = +new Date(maintEntries[0].date);
        const kmAfter = entries.reduce((s, e) => {
          if (e.type !== "earning") return s;
          if (+new Date(e.date) <= lastDate) return s;
          return s + (Number(e.km) || 0);
        }, 0);
        lastKm = realCurrentKm - kmAfter;
      }
      const milestoneKm = lastKm + intervalKm;
      const kmRemaining = milestoneKm - realCurrentKm;
      if (kmRemaining <= 500) out.push({ type, kmRemaining, milestoneKm });
    }
    return out.sort((a, b) => a.kmRemaining - b.kmRemaining);
  }, [activeCar, entries, carInitialKm, realCurrentKm]);
  const showMaintAlert = maintAlerts.length > 0;
  const primaryMaint = maintAlerts[0];
  const kmToNext = primaryMaint?.kmRemaining ?? 0;

  useEffect(() => {
    if (!user?.id || dataLoading) return;
    ensureMaintenanceNotifications(user.id, maintAlerts);
  }, [user?.id, dataLoading, maintAlerts]);

  const activeApps = Object.keys(apps)
    .filter((k) => apps[k] > 0)
    .sort((a, b) => apps[b] - apps[a]);
  const activeExp = Object.keys(expCats)
    .filter((k) => expCats[k] > 0)
    .sort((a, b) => expCats[b] - expCats[a]);

  // Build the renderer map for each reorderable / hideable card.
  const blocks: Record<HomeCardKey, React.ReactNode> = {
    greeting: widgets.greeting ? (
        <div key="greeting" className="pt-0 pb-0.5 animate-fade-in">
          <div className="text-[19px] font-bold tracking-tight text-foreground leading-tight">
          Olá, {greetingName}{greetingEmoji ? <> <span aria-hidden>{greetingEmoji}</span></> : null}
        </div>
        {greetingMessage && (
          <div className={cn(
            "mt-0.5 text-[12px] text-muted-foreground/90 leading-snug",
            greetingStyleClass(greetingStyle),
          )}>
            {greetingMessage}
          </div>
        )}
        <div className="mt-0 text-[11px] text-muted-foreground/70 leading-snug">
          {contextualDate}
        </div>
      </div>
    ) : null,

    goal: widgets.goal ? (() => {
      const isLiquido = !showGrossView;
      // Theme tokens: green for líquida, premium blue for bruta.
      const themeText = isLiquido ? "text-success" : "text-[hsl(var(--goal-gross))]";
      const themeBg = isLiquido ? "bg-success/15" : "bg-[hsl(var(--goal-gross))]/15";
      const themeBar = isLiquido ? "[&>div]:bg-success" : "[&>div]:bg-[hsl(var(--goal-gross))]";
      const themeBorderReached = isLiquido ? "border-success/50" : "border-[hsl(var(--goal-gross))]/55";
      const themeGradientReached = isLiquido
        ? "bg-gradient-to-br from-success/10 via-card to-card shadow-[0_0_24px_-8px_hsl(var(--success)/0.55)]"
        : "bg-gradient-to-br from-[hsl(var(--goal-gross))]/12 via-card to-card shadow-[0_0_24px_-8px_hsl(var(--goal-gross)/0.55)]";
      const themeGlow = isLiquido ? "bg-success/10" : "bg-[hsl(var(--goal-gross))]/12";
      return (
        <button
          type="button"
          key="goal"
          onClick={() => navigate("/ajustes/planejamento", { state: { returnTo: "/app" } })}
          aria-label="Ver meta"
            className={cn(
              "group relative z-10 w-full cursor-pointer overflow-hidden rounded-2xl border bg-card px-4 py-3 text-left transition-all duration-500 active:scale-[0.99] hover:bg-card/95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
            goalReached ? cn(themeBorderReached, themeGradientReached) : "border-border",
          )}

        >
          {goalReached && (
            <div
              aria-hidden
              className={cn(
                "pointer-events-none absolute -inset-1 rounded-3xl blur-2xl animate-fade-in",
                themeGlow,
              )}
            />
          )}
          <div className="relative">
            {/* Header: title left, values right — balanced horizontal distribution */}
            <div className="flex items-start justify-between gap-3">
              <div className={cn("flex min-w-0 items-center gap-2 text-sm font-semibold", themeText)}>
                {goalReached ? (
                  <span className={cn("inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full", themeBg)}>
                    <Check className="h-3.5 w-3.5" strokeWidth={3} />
                  </span>
                ) : (
                  <Target className="h-4 w-4 shrink-0" />
                )}
                <span className="min-w-0 leading-tight break-words">{isFolgaEffective ? (isFolgaTodayEffective ? "Folga programada" : "Dia de folga") : periodGoal.title}</span>
                {isFolgaEffective && (
                  <span className="ml-1 inline-flex items-center gap-1 rounded-full border border-border/50 bg-muted/40 px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                    <Coffee className="h-2.5 w-2.5" /> Descanso
                  </span>
                )}
              </div>
              {!isFolgaEffective && (
                <div className="flex shrink-0 items-center gap-1.5">
                  <div className="text-right tabular-nums text-[13px] leading-tight text-muted-foreground">
                    <span className="font-bold text-foreground">{brl(goalProgressValue)}</span>
                    <span className="mx-1 text-muted-foreground/60">/</span>
                    <span>{brl(periodGoal.value)}</span>
                  </div>
                  <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground/60 transition-transform group-hover:translate-x-0.5 group-hover:text-foreground group-active:translate-x-1" />
                </div>
              )}
            </div>

            {!isFolgaEffective && (
              <Progress
                value={goalPct}
                className={cn("mt-2.5 h-2 transition-all duration-700", themeBar)}
              />
            )}
            <div className={cn("flex items-center justify-between gap-3 text-xs text-muted-foreground", isFolgaEffective ? "mt-1.5" : "mt-1")}>

              <span className="tabular-nums truncate">
                {isFolgaEffective
                  ? (isFolgaTodayEffective
                      ? "Hoje é seu dia de descanso. Não conta para sua meta."
                      : "Este dia não está no seu planejamento.")
                  : periodGoal.value > 0
                    ? goalReached
                      ? overAmount > 0
                        ? `${brl(overAmount)} acima da meta`
                        : "Meta atingida"
                      : `Faltam ${brl(goalRemaining)}`
                    : "Defina sua meta mensal em Ajustes"}
              </span>
              {periodGoal.value > 0 && !isFolgaEffective && (
                <div className="flex shrink-0 items-center gap-1.5">
                  {overAmount > 0 && (
                    <span className={cn(
                      "inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[10px] font-semibold animate-fade-in",
                      isLiquido
                        ? "border-success/40 bg-success/10 text-success"
                        : "border-[hsl(var(--goal-gross))]/45 bg-[hsl(var(--goal-gross))]/10 text-[hsl(var(--goal-gross))]",
                    )}>
                      <TrendingUp className="h-2.5 w-2.5" />
                      +{overPct >= 1 ? num(overPct, 0) : num(overPct, 1)}%
                    </span>
                  )}
                  <span className={cn("tabular-nums font-semibold", themeText)}>{num(goalPct, 0)}%</span>
                </div>
              )}
            </div>
            {monthlyProjection !== null && (
              <div className="mt-1.5 border-t border-border/60 pt-1.5 text-[11px] text-muted-foreground">
                Projeção do mês: <span className="font-semibold tabular-nums text-foreground/80">{brl(monthlyProjection)}</span>
              </div>
            )}
          </div>
        </button>
      );
    })() : null,

    stats: widgets.stats ? (
      <section key="stats">
        <div className="mb-2 flex items-center gap-2 px-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          <Gauge className="h-3.5 w-3.5" /> Performance
        </div>
        {s.gross === 0 && s.totalExpenses === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-border bg-card px-4 py-6 shadow-sm">
            <p className="text-center text-[13px] text-muted-foreground">
              Registre ganhos ou gastos para ver sua performance
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 divide-x divide-border rounded-2xl border border-border bg-card p-1 shadow-sm">
            <div className="flex flex-col items-center justify-center gap-1 px-3 py-3.5">
              <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-success">
                <Clock className="h-3 w-3" /> R$ / hora
              </div>
              <div className="text-2xl font-bold tabular-nums text-foreground leading-none">{brl(s.perHour)}</div>
              <div className="text-[11px] text-muted-foreground tabular-nums">{num(s.totalHours, 1)}h trabalhadas</div>
            </div>
            <div className="flex flex-col items-center justify-center gap-1 px-3 py-3.5">
              <div className={cn("flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider transition-colors duration-300", rpkStatusTextClass)}>
                <Route className="h-3 w-3" /> R$ / km
              </div>
              <div className={cn("text-2xl font-bold tabular-nums leading-none transition-colors duration-300", rpkStatus === "none" ? "text-foreground" : rpkStatusTextClass)}>{brl(s.perKm)}</div>
              <div className={cn("text-[11px] tabular-nums transition-colors duration-300", rpkStatus === "none" ? "text-muted-foreground" : rpkStatusTextClass)}>
                {rpkStatus === "none"
                  ? (rpkMin > 0 ? "Aguardando registros" : `${num(s.totalKm, 1)} km rodados`)
                  : rpkStatus === "ok"
                    ? `${brl(Math.abs(rpkDiff))} acima do mínimo`
                    : `${brl(Math.abs(rpkDiff))} abaixo do mínimo`}
              </div>
            </div>

          </div>
        )}
      </section>
    ) : null,

    smartKm: widgets.smartKm ? (() => {
      // Folga passada: não faz sentido exibir cálculo de R$/km para um dia não trabalhado.
      if (isFolga && !isFolgaToday) return null;
      // Dia de folga sem jornada/decisão de trabalhar — mensagem discreta.
      if (isFolgaTodayEffective) {
        return (
          <div key="smartKm" className="flex flex-col items-center">
            <span aria-hidden className="h-0.5 w-px bg-gradient-to-b from-success/35 to-transparent" />
            <div className="flex w-full items-center justify-center rounded-2xl border border-border bg-card px-4 py-3 shadow-sm">
              <p className="text-center text-[12px] text-muted-foreground">
                Hoje é dia de descanso. Nenhuma meta de km calculada.
              </p>
            </div>
          </div>
        );
      }
      // Caso "KM planejado atingido" — plano configurado, mas remainingPlannedKm <= 0.
      if (plan.isPlanningConfigured && plan.remainingPlannedKm <= 0 && smartKmValue === null) {
        return (
          <div key="smartKm" className="flex flex-col items-center">
            <span aria-hidden className="h-0.5 w-px bg-gradient-to-b from-amber-400/35 to-transparent" />
            <button
              type="button"
              onClick={() => navigate("/ajustes/planejamento", { state: { returnTo: "/app" } })}
              className="group flex w-full items-center gap-3 rounded-2xl border border-amber-400/30 bg-amber-400/[0.05] px-4 py-3 text-left shadow-sm transition-all hover:bg-amber-400/[0.08] active:scale-[0.99]"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-400/15 text-amber-400">
                <Gauge className="h-5 w-5" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="text-[13.5px] font-semibold leading-tight text-foreground">
                  KM planejado atingido
                </div>
                <div className="mt-0.5 text-[11.5px] leading-snug text-muted-foreground">
                  Você já usou os KM previstos do mês. Ajuste sua média de KM, dias ou meta.
                </div>
                <div className="mt-1 text-[11px] font-medium text-amber-400">
                  Ajustar planejamento →
                </div>
              </div>
              <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground/60 transition-transform group-hover:translate-x-0.5" />
            </button>
          </div>
        );
      }
      if (smartKmValue === null) return null;
      const kmRequired = kmPlannedForPeriod;
      const kmDriven = s.totalKm;
      const kmPct = kmRequired > 0 ? Math.min(100, (kmDriven / kmRequired) * 100) : 0;
      const kmOverPct = kmRequired > 0 && kmDriven > kmRequired ? ((kmDriven / kmRequired) - 1) * 100 : 0;

      return (
        <div key="smartKm" className="flex flex-col items-center">
          <span aria-hidden className="h-0.5 w-px bg-border/40" />
          <button
            type="button"
            onClick={() => navigate('/ajustes/planejamento')}
            className="block w-full rounded-2xl border border-border bg-card px-4 py-3 text-left shadow-sm transition-transform active:scale-[0.99]"
          >
            <div className="flex items-center gap-2">
              <Gauge className={cn("h-4 w-4 shrink-0 animate-breath-soft transition-colors duration-300", rpkStatusTextClass)} />
              <span className="min-w-0 flex-1 text-[13px] font-semibold leading-tight text-foreground">
                R$/km mínimo pra aceitar corrida
              </span>
              <span className="ml-1 shrink-0 text-[17px] font-bold tabular-nums text-foreground animate-breath-soft">
                {brl(smartKmValue)}
                <span className="ml-0.5 text-[11px] font-normal text-muted-foreground">/km</span>
              </span>
              <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground/50" />
            </div>
            {kmRequired > 0 && (
              <>
                <Progress
                  value={kmPct}
                  className={cn("mt-2 h-2 transition-all duration-700", rpkStatusBarClass, kmDriven > kmRequired && "ring-1 ring-inset ring-foreground/10")}
                />
                <div className="mt-1 flex items-center justify-between gap-3 text-xs text-muted-foreground">
                  <span className="min-w-0 flex-1 tabular-nums leading-snug">
                    <span className="font-bold text-foreground">{num(kmDriven, 0)} km rodados</span>
                    <span className="mx-1 text-muted-foreground/60">·</span>
                    <span>Meta {num(kmRequired, 0)} km</span>
                  </span>
                  <div className="flex shrink-0 items-center gap-1.5">
                    {kmOverPct > 0 && (
                      <span className="inline-flex items-center rounded-full border border-border/50 bg-muted/40 px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground tabular-nums animate-fade-in">
                        +{num(kmOverPct, 0)}%
                      </span>
                    )}
                    <span className={cn("tabular-nums font-semibold transition-colors duration-300", rpkStatusTextClass)}>
                      {num(kmPct, 0)}%
                    </span>
                  </div>
                </div>
              </>
            )}
          </button>
        </div>
      );
    })() : null,



    byApp: widgets.byApp ? (() => {
      const insideUnified = Boolean(widgets.byExpense);
      const block = (
        <div className={insideUnified ? "" : "rounded-2xl border border-border bg-card p-4"}>
          {insideUnified && (
            <div className="mb-2 text-[10px] font-medium text-muted-foreground">Por app</div>
          )}
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
                      <PlatformLogo platformKey={k} label={meta.label} hex={meta.hex} size="sm" imageUrl={meta.imageUrl} />
                      <span className="truncate text-xs font-semibold text-foreground">{meta.label}</span>
                    </div>
                    <div className="relative h-[7px] flex-1 overflow-hidden rounded-full bg-muted">

                      <div className="absolute inset-y-0 left-0 rounded-full" style={{ width: `${pct}%`, backgroundColor: meta.hex }} />
                    </div>
                    <span className="w-20 text-right text-sm font-semibold tabular-nums">{brl(v)}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      );
      // Quando só "Por aplicativo" está visível, renderiza isolado com eyebrow próprio.
      if (!widgets.byExpense) {
        return (
          <section key="byApp">
            <div className="mb-2 flex items-center gap-2 px-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              <BarChart3 className="h-3.5 w-3.5" /> Por aplicativo
            </div>
            {block}
          </section>
        );
      }
      return block;
    })() : null,

    byExpense: widgets.byExpense ? (() => {
      const insideUnified = Boolean(widgets.byApp);
      const block = (
        <div className={insideUnified ? "" : "rounded-2xl border border-border bg-card p-4"}>
          {insideUnified && (
            <div className="mb-2 text-[10px] font-medium text-muted-foreground">Por gastos</div>
          )}
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
                const badgeContent = Meta.emoji || Meta.label.charAt(0).toUpperCase();
                return (
                  <div key={k} className="flex items-center gap-3">
                    <div className="flex min-w-[120px] items-center gap-2">
                      <span
                        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[13px] font-bold"
                        style={{ backgroundColor: `${Meta.hex}22`, color: Meta.hex }}
                        aria-label={Meta.label}
                      >
                        {badgeContent}
                      </span>
                      <span className="truncate text-xs font-semibold text-foreground">{Meta.label}</span>
                    </div>
                    <div className="relative h-[7px] flex-1 overflow-hidden rounded-full bg-muted">
                      <div className="absolute inset-y-0 left-0 rounded-full" style={{ width: `${pct}%`, backgroundColor: Meta.hex }} />
                    </div>
                    <span className="w-20 text-right text-sm font-semibold tabular-nums">{brl(v)}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      );
      if (!widgets.byApp) {
        return (
          <section key="byExpense">
            <div className="mb-2 flex items-center gap-2 px-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              <Receipt className="h-3.5 w-3.5" /> Por gastos
            </div>
            {block}
          </section>
        );
      }
      return block;
    })() : null,

    journey: widgets.journey ? (
      <section key="journey">
        <div className="mb-2 flex items-center gap-2 px-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          <TimerIcon className="h-3.5 w-3.5" />
          <span>
            Jornada
            {timerState === "idle" && (
              <span className="ml-1 font-medium normal-case tracking-normal text-muted-foreground/70">· Toque para iniciar</span>
            )}
          </span>
        </div>
        <JourneyModule isFolgaToday={isFolgaTodayEffective} />
      </section>
    ) : null,
  };

  // Header gets a small extra top breath when greeting is enabled.
  const topPadding = widgets.greeting ? "pt-3" : "pt-2";

  const greetingHasContent = widgets.greeting;

  // TEMP: dados para o card de compartilhamento (Parte 1). Reusa valores já calculados.
  const shareCardData: ShareCardData = useMemo(() => {
    const periodLabelMap: Record<string, string> = {
      day: "Hoje", week: "Semana", month: "Mês", custom: "Período", all: "Total",
    };
    // Meta pct por lente, usando o mesmo periodGoal.value ativo como referência.
    // (Preview de teste — Parte 2 pode refinar por lente separada se necessário.)
    const goalVal = periodGoal.value;
    const netPct = goalVal > 0 ? Math.min(999, (s.net / goalVal) * 100) : 0;
    const grossPct = goalVal > 0 ? Math.min(999, (s.gross / goalVal) * 100) : 0;
    const netOver = Math.max(0, s.net - goalVal);
    const grossOver = Math.max(0, s.gross - goalVal);
    const metaBase = goalVal > 0 ? `Meta ${brl(goalVal)}` : "Sem meta configurada";

    // Formata jornada a partir de horas decimais (ex: 8.5 -> "8h30").
    const totalH = s.totalHours || 0;
    const hh = Math.floor(totalH);
    const mm = Math.round((totalH - hh) * 60);
    const jornadaStr = totalH > 0 ? `${hh}h${String(mm).padStart(2, "0")}` : "—";

    // Apps: reutiliza platformMetaFor (mesma fonte do bloco "Por app" da Home).
    const shareApps = activeApps.slice(0, 5).map((k) => {
      const meta = platformMetaFor(k);
      const v = apps[k];
      const pct = s.gross > 0 ? (v / s.gross) * 100 : 0;
      return {
        name: meta.label,
        value: brl(v),
        pct,
        color: meta.hex,
        initial: (meta.label || "?").trim().charAt(0).toUpperCase(),
      };
    });

    // Gasto principal (maior categoria).
    const topExpKey = activeExp[0];
    const gastosLabel = topExpKey ? `Gastos · ${expenseMetaFor(topExpKey).label}` : undefined;
    const gastosValue = s.totalExpenses > 0 ? brl(s.totalExpenses) : undefined;

    // Data compacta para o card de compartilhamento (ex: "6 JUL 2026").
    const now = new Date();
    let shareDateLabel = format(now, "d MMM yyyy", { locale: ptBR }).toUpperCase();
    if (period === "week") {
      const wso = (settings.weekStartsOn ?? 1) as 0 | 1;
      const ws = startOfWeek(now, { weekStartsOn: wso });
      const we = endOfWeek(now, { weekStartsOn: wso });
      shareDateLabel = `${format(ws, "d", { locale: ptBR })}–${format(we, "d MMM yyyy", { locale: ptBR }).toUpperCase()}`;
    } else if (period === "month") {
      shareDateLabel = format(now, "MMM yyyy", { locale: ptBR }).toUpperCase();
    } else if (period === "custom" && customRange) {
      const sameDay = customRange.from.toDateString() === customRange.to.toDateString();
      shareDateLabel = sameDay
        ? format(customRange.from, "d MMM yyyy", { locale: ptBR }).toUpperCase()
        : `${format(customRange.from, "d MMM", { locale: ptBR }).toUpperCase()}–${format(customRange.to, "d MMM yyyy", { locale: ptBR }).toUpperCase()}`;
    }

    return {
      periodLabel: periodLabelMap[period],
      dateLabel: shareDateLabel,
      liquido: {
        heroValue: brl(s.net),
        metaBatida: goalVal > 0 && s.net >= goalVal,
        metaExcedente: netOver > 0 ? `+${brl(netOver)}` : undefined,
        metaLabel: metaBase,
        metaPct: netPct,
      },
      bruto: {
        heroValue: brl(s.gross),
        metaBatida: goalVal > 0 && s.gross >= goalVal,
        metaExcedente: grossOver > 0 ? `+${brl(grossOver)}` : undefined,
        metaLabel: metaBase,
        metaPct: grossPct,
      },
      perHour: s.perHour > 0 ? brl(s.perHour) : "—",
      perKm: s.perKm > 0 ? brl(s.perKm) : "—",
      jornada: jornadaStr,
      apps: shareApps,
      gastosLabel,
      gastosValue,
    };
  }, [period, customRange, settings.weekStartsOn, periodGoal.value, s, activeApps, apps, activeExp, expenseMetaFor, platformMetaFor]);

  return (
    <>
      {/* Header compacto da Home — símbolo do Volant + saudação clicável + sino */}
      <header className="sticky top-0 z-20 border-b border-border/70 bg-background/85 backdrop-blur-lg">
        <div className="flex items-center justify-between gap-3 px-4 py-1.5">
          <button
            type="button"
            onClick={() => greetingHasContent && navigate("/ajustes/personalizacao/saudacao", { state: { from: "/app" } })}
            className={cn(
              "flex min-w-0 flex-1 items-center gap-3 rounded-xl py-0.5 pr-2 text-left transition-all duration-200",
              greetingHasContent && "hover:bg-muted/30 active:scale-[0.99]",
            )}
            aria-label="Editar saudação"
          >
            <img
              src={volantSymbol}
              alt="Volant"
              width={37}
              height={37}
              decoding="sync"
              loading="eager"
              fetchPriority="high"
              className="h-[37px] w-[37px] shrink-0 self-center rounded-full shadow-[0_2px_8px_-4px_hsl(var(--success)/0.35)]"
            />
            <div className="min-w-0 flex-1 self-center">
              {greetingHasContent ? (
                <>
                  <div className="truncate text-[14px] font-bold leading-tight tracking-tight text-foreground">
                    Olá, {greetingName}
                    {greetingEmoji ? <> <span aria-hidden>{greetingEmoji}</span></> : null}
                  </div>
                  {greetingMessage && (
                    <div
                      className={cn(
                        "truncate text-[10px] leading-snug text-muted-foreground/90",
                        greetingStyleClass(greetingStyle),
                      )}
                    >
                      {greetingMessage}
                    </div>
                  )}
                  <div className="truncate text-[10px] leading-snug text-muted-foreground/70">
                    {contextualDate}
                  </div>
                </>
              ) : (
                <div className="truncate text-[14px] font-bold leading-tight tracking-tight text-foreground">
                  Volant
                </div>
              )}
            </div>
          </button>


          <button
            type="button"
            onClick={() => setNotifOpen(true)}
            aria-label="Abrir notificações"
            className="relative inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-muted-foreground transition-all duration-200 hover:bg-muted/40 hover:text-foreground active:scale-95"
          >
            <Bell className="h-[18px] w-[18px]" />
            {unreadNotifs > 0 && (
              <span className="absolute right-1.5 top-1.5 inline-flex h-2 w-2 rounded-full bg-success ring-2 ring-background" />
            )}
          </button>
        </div>
      </header>

      <NotificationsSheet open={notifOpen} onOpenChange={setNotifOpen} />

      <div className={cn("px-4", topPadding)}>

        {/* Period switcher — Hoje | Semana | Mês | Calendário */}
        <PeriodBar
          period={period}
          tone={heroMetric === "gross" ? "gross" : "net"}
          onSelect={(p) => { setPeriod(p); setCustomRange(null); }}
          onCalendarClick={() => {
            setCalDraft(customRange ? { from: customRange.from, to: customRange.to } : undefined);
            setCalVisibleMonth(startOfMonth(customRange?.from ?? new Date()));
            setCalOpen(true);
          }}
        />

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
                  className="pointer-events-auto"
                  dailyStats={calDailyStats}
                  valueMode={heroView === "gross" ? "gross" : "net"}
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
                    const from = calDraft.from;
                    const to = calDraft.to ?? calDraft.from;
                    setCustomRange({ from, to });
                    setPeriod("custom");
                    setCalOpen(false);
                  }}
                >
                  Aplicar
                </Button>
              </div>
            </div>
          </DrawerContent>
        </Drawer>

        

        {/* Hero highlight — user can switch between Lucro líquido (default) and Bruto */}
        <div className="mt-5">
        {(() => {
          const showGross = heroMetric === "gross";
          const heroTitle = showGross ? "Ganho bruto" : "Lucro líquido";
          const heroSubtitle = showGross ? "Antes dos gastos" : "Depois dos gastos";
          const animatedHero = animatedHeroValue;
          // Theme follows the hero metric: green for líquido, premium blue for bruto.
          const heroAccentText = showGross ? "text-[hsl(var(--goal-gross))]" : "text-success";
          const heroBorder = showGross ? "border-[hsl(var(--goal-gross))]/40" : "border-success/30";
          const heroGradient = showGross
            ? "bg-gradient-to-br from-[hsl(var(--goal-gross))]/30 via-[hsl(var(--goal-gross))]/14 to-[hsl(var(--goal-gross))]/6"
            : "bg-gradient-to-br from-success/25 via-success/12 to-success/5";
          const heroBlobMain = showGross ? "bg-[hsl(var(--goal-gross))]/30" : "bg-success/25";
          // Secondary metrics swap when "Bruto" is the hero.
          const secondary: { label: string; value: number; dot: string }[] = showGross
            ? [
                { label: "Líquido", value: s.net, dot: "bg-success/70" },
                { label: "Gastos", value: s.totalExpenses, dot: "bg-destructive/70" },
              ]
            : [
                { label: "Bruto", value: s.gross, dot: "bg-[hsl(var(--goal-gross))]/80" },
                { label: "Gastos", value: s.totalExpenses, dot: "bg-destructive/70" },
              ];
          const toggleHero = () => {
            setHeroView(showGross ? "net" : "gross");
          };
          return (
            <div
              role="button"
              tabIndex={0}
              aria-label={`Alternar para ${showGross ? "Lucro líquido" : "Ganho bruto"}`}
              aria-pressed={showGross}
              onClick={toggleHero}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  toggleHero();
                }
              }}
              className={cn(
                "relative overflow-hidden rounded-2xl border p-5 shadow-elevated cursor-pointer select-none transition-all duration-500 active:scale-[0.995] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                heroBorder,
                heroGradient,
              )}
            >
              <div className={cn("absolute -right-12 -top-16 h-44 w-44 rounded-full blur-3xl transition-colors duration-500", heroBlobMain)} />
              <div className="absolute -left-10 bottom-0 h-32 w-32 rounded-full bg-primary-glow/15 blur-3xl" />
              <div className="relative">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className={cn("flex items-center gap-1.5 text-[12px] font-semibold uppercase tracking-[0.14em] transition-colors duration-500", heroAccentText)}>
                      <Gauge className="h-3.5 w-3.5" /> {heroTitle}
                    </div>
                    <div className="mt-0.5 text-[9.5px] font-medium uppercase tracking-[0.12em] text-muted-foreground/55">
                      {heroSubtitle}
                    </div>
                  </div>
                  <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                    <Segmented
                      size="xs"
                      tone="contextual"
                      className="w-[124px] shrink-0"
                      options={[
                        { key: "liquido", label: "Líquido" },
                        { key: "bruto", label: "Bruto" },
                      ]}
                      value={showGross ? "bruto" : "liquido"}
                      onChange={(v) => { setHeroView(v === "bruto" ? "gross" : "net"); }}
                    />
                    <button
                      type="button"
                      aria-label={hideValues ? "Mostrar valores" : "Ocultar valores"}
                      onClick={(e) => { e.stopPropagation(); setHideValues((v) => !v); }}
                      className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-muted-foreground/80 transition-colors hover:bg-white/10 hover:text-foreground active:scale-95"
                    >
                      {hideValues ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <div
                  className={cn(
                    "mt-2 text-[2.5rem] font-bold leading-tight tabular-nums text-foreground transition-all duration-300",
                    hideValues && "blur-[4px] select-none"
                  )}
                >
                  {hideValues ? "R$ •••••" : brl(animatedHero)}
                </div>
                <div className={cn("mt-4 border-t transition-colors duration-500", showGross ? "border-[hsl(var(--goal-gross))]/60" : "border-success/45")} />
                <div className={cn(
                  "mt-3 flex items-center justify-center gap-4 px-2 text-[13px]",
                  showGross && "-translate-x-1.5"
                )}>
                  {secondary.map((m, i) => (
                    <div key={m.label} className="flex items-center gap-3">
                      {i > 0 && (
                        <div
                          className={cn(
                            "h-3.5 w-px transition-colors duration-500",
                            showGross ? "bg-[hsl(var(--goal-gross))]/65" : "bg-success/55",
                          )}
                        />
                      )}
                      <div className="flex items-center gap-1.5">
                        <span className={cn("h-1.5 w-1.5 rounded-full transition-colors duration-500", m.dot)} />
                        <span className="text-muted-foreground">{m.label}</span>
                        <span
                          className={cn(
                            "font-semibold tabular-nums text-foreground/90 transition-all duration-300",
                            hideValues && "blur-[3px] select-none"
                          )}
                        >
                          {hideValues ? "R$ •••••" : brl(m.value)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          );
        })()}
        </div>

        {/* Maintenance alert (conditional, fixed position, not in personalization) */}
        {showMaintAlert && primaryMaint && (
          <button
            type="button"
            onClick={() => navigate("/ajustes/veiculos/manutencao")}
            className={cn(
              "mt-4 flex w-full items-start gap-3 rounded-2xl border p-4 text-left transition-colors hover:bg-muted/30",
              kmToNext < 0 ? "border-destructive/40 bg-destructive/10" : "border-warning/40 bg-warning/10"
            )}
          >
            <Wrench className={cn("mt-0.5 h-5 w-5", kmToNext < 0 ? "text-destructive" : "text-warning")} />
            <div className="text-sm flex-1">
              <div className="font-semibold">
                {kmToNext < 0
                  ? `${primaryMaint.type === "oleo" ? "Troca de óleo" : "Troca de pneus"} atrasada!`
                  : `${primaryMaint.type === "oleo" ? "Troca de óleo" : "Troca de pneus"} próxima`}
              </div>
              <div className="text-muted-foreground">
                {kmToNext < 0
                  ? `Você ultrapassou em ${num(Math.abs(kmToNext), 0)} km`
                  : `Faltam ${num(kmToNext, 0)} km para a próxima troca`}
              </div>
              <div className="mt-1 text-[11px] font-medium text-primary">Ver manutenção →</div>
            </div>
          </button>
        )}

        {/* Reorderable / hideable cards (excluding greeting which renders above).
            Item 6: quando byApp e byExpense estão visíveis, são unificados num
            único card "Ganhos e gastos" renderizado no slot do primeiro deles
            na ordem do usuário. O outro slot é suprimido. */}
        {(() => {
          const orderedKeys = homeOrder.filter((k) => k !== "greeting");
          const bothVisible = Boolean(widgets.byApp && widgets.byExpense);
          const appsIdx = orderedKeys.indexOf("byApp");
          const expIdx = orderedKeys.indexOf("byExpense");
          const unifiedSlotKey: HomeCardKey | null = bothVisible
            ? (appsIdx >= 0 && expIdx >= 0
                ? (appsIdx < expIdx ? "byApp" : "byExpense")
                : "byApp")
            : null;
          const suppressedKey: HomeCardKey | null = bothVisible
            ? (unifiedSlotKey === "byApp" ? "byExpense" : "byApp")
            : null;

          // Item 1: agrupa Meta + KM Inteligente sob eyebrow "Planejamento Inteligente"
          // quando ambos estão visíveis e smartKm aparece imediatamente após goal.
          const goalIdx = orderedKeys.indexOf("goal");
          const smartIdx = orderedKeys.indexOf("smartKm");
          const showPlanningEyebrow =
            Boolean(widgets.goal && widgets.smartKm) &&
            goalIdx >= 0 && smartIdx === goalIdx + 1;

          return orderedKeys.map((k, index, arr) => {
            if (k === suppressedKey) return null;

            let block: React.ReactNode = blocks[k];

            if (k === unifiedSlotKey) {
              const bothEmpty = activeApps.length === 0 && activeExp.length === 0;
              block = (
                <section key="appsExpenses">
                  <div className="mb-2 flex items-center gap-2 px-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    <ArrowLeftRight className="h-3.5 w-3.5" /> Ganhos e gastos
                  </div>
                  <div className="space-y-2.5 rounded-2xl border border-border bg-card p-4">
                    {blocks.byApp}
                    {!bothEmpty && <div className="border-t border-border/30" />}
                    {blocks.byExpense}
                  </div>
                </section>
              );
            }

            if (!block) return null;

            const prev = index > 0 ? arr[index - 1] : null;
            const marginClass =
              prev === "goal" && k === "smartKm"
                ? "mt-2"
                : prev === "smartKm"
                  ? "mt-3"
                  : "mt-5";

            if (showPlanningEyebrow && k === "goal") {
              return (
                <div key={k} className={marginClass}>
                  <div className="mb-2 flex items-center gap-2 px-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    <Target className="h-3.5 w-3.5" /> Planejamento Inteligente
                  </div>
                  {block}
                </div>
              );
            }

            return (
              <div key={k} className={marginClass}>
                {block}
              </div>
            );
          }).filter(Boolean);

        })()}
      </div>

      {/* TEMP: ponto de entrada de teste — remover/substituir na Parte 2 */}
      <button
        type="button"
        onClick={() => setShareOpen(true)}
        className="fixed bottom-24 right-4 z-30 flex h-11 w-11 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg hover:opacity-90 active:scale-95 transition"
        aria-label="Compartilhar resultado (teste)"
      >
        <Share2 className="h-5 w-5" />
      </button>
      <ShareResultSheet
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        initialMode={showGrossView ? "bruto" : "liquido"}
        cardData={shareCardData}
      />
    </>
  );
}

/**
 * Period selector with Hoje | Semana | Mês | Calendar icon — all four
 * share the same green active state used elsewhere in the app.
 */
function PeriodBar({
  period, onSelect, onCalendarClick, tone = "net",
}: {
  period: Period;
  onSelect: (p: Period) => void;
  onCalendarClick: () => void;
  tone?: "net" | "gross";
}) {
  const items: { key: Period; label: string }[] = [
    { key: "day", label: "Hoje" },
    { key: "week", label: "Semana" },
    { key: "month", label: "Mês" },
  ];
  const accentAfter = tone === "gross"
    ? "after:bg-[hsl(var(--goal-gross))]/70"
    : "after:bg-success/80";
  const activeText = "text-foreground";
  const inactiveClass = "text-muted-foreground/60 hover:text-foreground";
  return (
    <div role="tablist" className="relative flex w-full items-stretch justify-center gap-1 border-b border-border/30 bg-transparent">
      {items.map((o) => {
        const active = period === o.key;
        return (
          <button
            key={o.key}
            role="tab"
            aria-selected={active}
            onClick={() => onSelect(o.key)}
            className={cn(
              "relative shrink-0 px-4 py-1.5 text-[13px] font-medium transition-all duration-300",
              active
                ? cn(
                    activeText,
                    "after:absolute after:inset-x-0 after:-bottom-px after:h-[2px] after:rounded-full",
                    accentAfter,
                  )
                : inactiveClass,
            )}
          >
            {o.label}
          </button>
        );
      })}
      <button
        type="button"
        role="tab"
        aria-label="Selecionar período no calendário"
        aria-selected={period === "custom"}
        onClick={onCalendarClick}
        className={cn(
          "absolute right-0 top-1/2 flex w-11 -translate-y-1/2 shrink-0 items-center justify-center py-1.5 transition-all duration-300",
          period === "custom"
            ? cn(
                activeText,
                "after:absolute after:inset-x-1 after:-bottom-[7px] after:h-[2px] after:rounded-full",
                accentAfter,
              )
            : inactiveClass,
        )}
      >
        <CalendarRange className="h-4 w-4" />
      </button>
    </div>
  );
}

