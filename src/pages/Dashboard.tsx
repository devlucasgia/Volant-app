import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useData } from "@/context/DataContext";
import { useAuth } from "@/context/AuthContext";
import { useUI } from "@/context/UIContext";
import { supabase } from "@/integrations/supabase/client";
import { byApp, byExpenseCategory, filterByPeriod, Period, summarize, totalKmAllTime, goalForPeriod, type CustomRange } from "@/lib/stats";
import { brl, num } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";
import { Wrench, Target, Clock, Route, Gauge, Timer as TimerIcon, CalendarRange, Check, TrendingUp, Eye, EyeOff, Bell, ChevronRight } from "lucide-react";
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, differenceInCalendarDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { PlatformLogo } from "@/components/PlatformLogo";
import { JourneyModule } from "@/components/JourneyModule";
import { useHomeOrder, type HomeCardKey } from "@/lib/homeOrder";

import { useGreetingStyle, greetingStyleClass, useGreetingEmoji } from "@/lib/greetingStyle";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription } from "@/components/ui/drawer";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import type { DateRange } from "react-day-picker";
import { useAccess } from "@/context/AccessContext";
import { computeMonthlyVehicleCosts, computeSmartKm, getCurrentMonthRealData } from "@/lib/smartKm";
import volantSymbol from "@/assets/volant-symbol-header.png";
import { NotificationsSheet } from "@/components/NotificationsSheet";
import { useNotifications } from "@/hooks/useNotifications";
import { Segmented } from "@/components/Segmented";
import { useCountUp } from "@/hooks/useCountUp";


export default function Dashboard() {
  const { entries, settings, updateSettings, carInitialKm, activeCar, expenseMetaFor, platformMetaFor, isSimplePlatform } = useData();
  const { isFull } = useAccess();
  const { user } = useAuth();
  const { openDrawer } = useUI();
  const [period, setPeriod] = useState<Period>("day");
  const navigate = useNavigate();
  const [customRange, setCustomRange] = useState<CustomRange | null>(null);
  const [calOpen, setCalOpen] = useState(false);
  const [calDraft, setCalDraft] = useState<DateRange | undefined>(undefined);
  const [hideValues, setHideValues] = useState(() => {
    if (typeof window === "undefined") return false;
    try { return window.localStorage.getItem("volant.hideValues") === "1"; } catch { return false; }
  });
  const widgets = settings.dashboardWidgets;
  const [homeOrder] = useHomeOrder();
  const heroMetric: "net" | "gross" = settings.goalType === "bruto" ? "gross" : "net";
  const [greetingStyle] = useGreetingStyle();
  const [greetingEmoji] = useGreetingEmoji();
  const [notifOpen, setNotifOpen] = useState(false);
  const { unread: unreadNotifs } = useNotifications(user?.id, user?.created_at);

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
      const s = startOfWeek(now, { weekStartsOn: 1 });
      const e = endOfWeek(now, { weekStartsOn: 1 });
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
  }, [period, customRange]);

  const filtered = useMemo(
    () => filterByPeriod(entries, period, customRange ?? undefined),
    [entries, period, customRange]
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
      const raw = localStorage.getItem(`volant_day_goal_${todayKey}`);
      const n = raw ? Number(raw) : 0;
      return n > 0 ? n : null;
    } catch { return null; }
  }, [todayKey, settings.monthlyGoal, calOpen, overrideTick]);

  const goalOpts = useMemo(
    () => ({
      goalType: settings.goalType,
      workingDays: settings.workingDaysPerMonth,
      remainingWorkingDays: settings.remainingWorkingDays,
    }),
    [settings.goalType, settings.workingDaysPerMonth, settings.remainingWorkingDays]
  );
  const periodGoal = useMemo(
    () => goalForPeriod(period, settings.monthlyGoal, entries, customRange ?? undefined, journeyDailyOverride, goalOpts),
    [period, settings.monthlyGoal, entries, customRange, journeyDailyOverride, goalOpts]
  );
  const goalProgressValue = settings.goalType === "liquido" ? s.net : s.gross;
  const goalPct = periodGoal.value > 0 ? Math.min(100, (goalProgressValue / periodGoal.value) * 100) : 0;
  const goalReached = periodGoal.value > 0 && goalProgressValue >= periodGoal.value;
  const goalRemaining = Math.max(0, periodGoal.value - goalProgressValue);
  const overAmount = Math.max(0, goalProgressValue - periodGoal.value);
  const overPct = periodGoal.value > 0 && overAmount > 0 ? (overAmount / periodGoal.value) * 100 : 0;

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

  // KM Inteligente — discrete display under the R$/km cell when valid.
  const smartKmValue = useMemo(() => {
    if (!isFull) return null;
    const real = getCurrentMonthRealData(entries);
    const costs = computeMonthlyVehicleCosts(activeCar, settings.kmPlannedMonth);
    const state = computeSmartKm({
      monthlyGoal: settings.monthlyGoal,
      goalType: settings.goalType,
      kmPlanned: settings.kmPlannedMonth,
      vehicleMonthlyCost: costs.total,
      real,
      remainingWorkingDays: settings.remainingWorkingDays,
      kmRemainingOverride: settings.kmRemainingOverride,
    });
    return state.kind === "ok" ? state.smart : null;
  }, [isFull, entries, activeCar, settings.kmPlannedMonth, settings.kmRemainingOverride, settings.monthlyGoal, settings.goalType, settings.remainingWorkingDays]);

  const totalKmDriven = totalKmAllTime(entries);
  const realCurrentKm = carInitialKm + totalKmDriven;
  const lastMaint = settings.lastMaintenanceKm > 0 ? settings.lastMaintenanceKm : carInitialKm;
  const kmSinceMaint = Math.max(0, realCurrentKm - lastMaint);
  const interval = settings.maintenanceIntervalKm || 0;
  const kmToNext = interval - kmSinceMaint;
  const threshold = interval > 0 ? Math.max(500, Math.round(interval * 0.1)) : 0;
  const showMaintAlert = interval > 0 && kmToNext <= threshold;

  const activeApps = Object.keys(apps)
    .filter((k) => apps[k] > 0)
    .sort((a, b) => apps[b] - apps[a]);
  const activeExp = Object.keys(expCats)
    .filter((k) => expCats[k] > 0)
    .sort((a, b) => expCats[b] - expCats[a]);

  // Build the renderer map for each reorderable / hideable card.
  const blocks: Record<HomeCardKey, React.ReactNode> = {
    greeting: widgets.greeting ? (
        <div key="greeting" className="pt-0.5 pb-1 animate-fade-in">
          <div className="text-[22px] font-bold tracking-tight text-foreground leading-tight">
          Olá, {greetingName}{greetingEmoji ? <> <span aria-hidden>{greetingEmoji}</span></> : null}
        </div>
        {greetingMessage && (
          <div className={cn(
            "mt-1 text-[13px] text-muted-foreground/90 leading-snug",
            greetingStyleClass(greetingStyle),
          )}>
            {greetingMessage}
          </div>
        )}
        <div className="mt-0.5 text-[12px] text-muted-foreground/70 leading-snug">
          {contextualDate}
        </div>
      </div>
    ) : null,

    goal: widgets.goal ? (() => {
      const isLiquido = settings.goalType === "liquido";
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
          onClick={() => navigate("/ajustes/planejamento/metas")}
          aria-label="Ver meta"
            className={cn(
              "group relative z-10 w-full cursor-pointer overflow-hidden rounded-2xl border bg-card p-4 text-left transition-all duration-500 active:scale-[0.99] hover:bg-card/95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
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
                <span className="truncate">{periodGoal.title}</span>
              </div>
              <div className="flex shrink-0 items-center gap-1.5">
                <div className="text-right tabular-nums text-[13px] leading-tight text-muted-foreground">
                  <span className="font-bold text-foreground">{brl(goalProgressValue)}</span>
                  <span className="mx-1 text-muted-foreground/60">/</span>
                  <span>{brl(periodGoal.value)}</span>
                </div>
                <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground/60 transition-transform group-hover:translate-x-0.5 group-hover:text-foreground group-active:translate-x-1" />
              </div>
            </div>

            <Progress
              value={goalPct}
              className={cn("mt-3 h-2 transition-all duration-700", themeBar)}
            />
            <div className="mt-1.5 flex items-center justify-between gap-3 text-xs text-muted-foreground">
              <span className="tabular-nums truncate">
                {periodGoal.value > 0
                  ? goalReached
                    ? overAmount > 0
                      ? `${brl(overAmount)} acima da meta`
                      : "Meta atingida"
                    : `Faltam ${brl(goalRemaining)}`
                  : "Defina sua meta mensal em Ajustes"}
              </span>
              {periodGoal.value > 0 && (
                <span className={cn("tabular-nums font-semibold", themeText)}>{num(goalPct, 0)}%</span>
              )}
            </div>
            {overAmount > 0 && (
              <div className="mt-1.5">
                <span className={cn(
                  "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold animate-fade-in",
                  isLiquido
                    ? "border-success/40 bg-success/10 text-success"
                    : "border-[hsl(var(--goal-gross))]/45 bg-[hsl(var(--goal-gross))]/10 text-[hsl(var(--goal-gross))]",
                )}>
                  <TrendingUp className="h-2.5 w-2.5" />
                  {overPct >= 1 ? `+${num(overPct, 0)}%` : `+${brl(overAmount)}`}
                </span>
              </div>
            )}
            {monthlyProjection !== null && (
              <div className="mt-2 border-t border-border/60 pt-2 text-[11px] text-muted-foreground">
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
        <div className="grid grid-cols-2 divide-x divide-border rounded-2xl border border-border bg-card p-1 shadow-sm">
          <div className="flex flex-col items-center justify-center gap-1 px-3 py-3.5">
            <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-success">
              <Clock className="h-3 w-3" /> R$ / hora
            </div>
            <div className="text-2xl font-bold tabular-nums text-foreground leading-none">{brl(s.perHour)}</div>
            <div className="text-[11px] text-muted-foreground tabular-nums">{num(s.totalHours, 1)}h trabalhadas</div>
          </div>
          <div className="flex flex-col items-center justify-center gap-1 px-3 py-3.5">
            <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-info">
              <Route className="h-3 w-3" /> R$ / km
            </div>
            <div className="text-2xl font-bold tabular-nums text-foreground leading-none">{brl(s.perKm)}</div>
            <div className="text-[11px] text-muted-foreground tabular-nums">{num(s.totalKm, 1)} km rodados</div>
          </div>
        </div>
      </section>
    ) : null,

    smartKm: widgets.smartKm && smartKmValue !== null ? (() => {
      const showGross = settings.goalType === "bruto";
      const themeIcon = showGross ? "text-[hsl(var(--goal-gross))]" : "text-success";
      const themeBg = showGross ? "bg-[hsl(var(--goal-gross))]/10" : "bg-success/10";
      const themeBorder = showGross ? "border-[hsl(var(--goal-gross))]/25" : "border-success/25";
      const connectorClass = showGross
        ? "bg-gradient-to-b from-[hsl(var(--goal-gross))]/35 to-transparent"
        : "bg-gradient-to-b from-success/35 to-transparent";
      return (
        // Negative top margin pulls this card closer to the Meta card above,
        // so the KM Inteligente reads as a subcard of the goal — not a loose card.
        <div key="smartKm" className="flex flex-col items-center">
          {/* Ultra-subtle vertical connector — premium, almost invisible */}
          <span aria-hidden className={cn("h-0.5 w-px", connectorClass)} />
          <button
            type="button"
            onClick={() => navigate("/ajustes/planejamento/km")}
            aria-label="Ver cálculo"
            className={cn(
              "group relative mx-auto flex w-[88%] cursor-pointer items-center justify-between gap-3 rounded-2xl border bg-card px-4 py-2.5 shadow-sm transition-all duration-200 hover:bg-card/80 active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30",
              themeBorder
            )}
          >
            <span className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl", themeBg, themeIcon)}>
              <Gauge className="h-5 w-5" />
            </span>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
              <div className="text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground leading-tight">
                R$/km inteligente
              </div>
              <div className="mt-1 flex items-center justify-center gap-1 text-[17px] font-bold tabular-nums text-foreground leading-tight">
                {brl(smartKmValue)}
                <span className="text-[12px] font-normal text-muted-foreground">/ km</span>
              </div>
            </div>
            {/* Discreet chevron mirrors the icon width so the centered text reads visually symmetric */}
            <span className="flex h-10 w-10 shrink-0 items-center justify-end">
              <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/60 transition-transform group-hover:translate-x-0.5 group-hover:text-foreground group-active:translate-x-1" />
            </span>
          </button>
        </div>
      );
    })() : null,

    byApp: widgets.byApp ? (
      <div key="byApp" className="rounded-2xl border border-border bg-card p-4">
        <div className="mb-3 text-sm font-semibold">Por aplicativo</div>
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
                  <div className="relative h-2 flex-1 overflow-hidden rounded-full bg-muted">
                    <div className="absolute inset-y-0 left-0 rounded-full" style={{ width: `${pct}%`, backgroundColor: meta.hex }} />
                  </div>
                  <span className="w-20 text-right text-sm font-semibold tabular-nums">{brl(v)}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    ) : null,

    byExpense: widgets.byExpense ? (
      <div key="byExpense" className="rounded-2xl border border-border bg-card p-4">
        <div className="mb-3 text-sm font-semibold">Por gastos</div>
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
                    <div className="absolute inset-y-0 left-0 rounded-full" style={{ width: `${pct}%`, backgroundColor: Meta.hex }} />
                  </div>
                  <span className="w-20 text-right text-sm font-semibold tabular-nums">{brl(v)}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    ) : null,

    journey: widgets.journey ? (
      <section key="journey">
        <div className="mb-2 flex items-center gap-2 px-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          <TimerIcon className="h-3.5 w-3.5" /> Jornada
        </div>
        <JourneyModule />
      </section>
    ) : null,
  };

  // Header gets a small extra top breath when greeting is enabled.
  const topPadding = widgets.greeting ? "pt-3" : "pt-2";

  const greetingHasContent = widgets.greeting;

  return (
    <>
      {/* Header compacto da Home — símbolo do Volant + saudação clicável + sino */}
      <header className="sticky top-0 z-20 border-b border-border/70 bg-background/85 backdrop-blur-lg">
        <div className="flex items-center justify-between gap-3 px-4 py-2.5">
          <button
            type="button"
            onClick={() => greetingHasContent && navigate("/ajustes/personalizacao/saudacao")}
            className={cn(
              "flex min-w-0 flex-1 items-center gap-3 rounded-xl py-1 pr-2 text-left transition-all duration-200",
              greetingHasContent && "hover:bg-muted/30 active:scale-[0.99]",
            )}
            aria-label="Editar saudação"
          >
            <img
              src={volantSymbol}
              alt="Volant"
              width={43}
              height={43}
              decoding="sync"
              loading="eager"
              fetchPriority="high"
              className="h-[43px] w-[43px] shrink-0 self-center rounded-full shadow-[0_2px_8px_-4px_hsl(var(--success)/0.35)]"
            />
            <div className="min-w-0 flex-1 self-center">
              {greetingHasContent ? (
                <>
                  <div className="truncate text-[16.25px] font-bold leading-tight tracking-tight text-foreground">
                    Olá, {greetingName}
                    {greetingEmoji ? <> <span aria-hidden>{greetingEmoji}</span></> : null}
                  </div>
                  {greetingMessage && (
                    <div
                      className={cn(
                        "truncate text-[10.8px] leading-snug text-muted-foreground/90",
                        greetingStyleClass(greetingStyle),
                      )}
                    >
                      {greetingMessage}
                    </div>
                  )}
                  <div className="truncate text-[11px] leading-snug text-muted-foreground/70">
                    {contextualDate}
                  </div>
                </>
              ) : (
                <div className="truncate text-[16.25px] font-bold leading-tight tracking-tight text-foreground">
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
                <Calendar
                  mode="range"
                  selected={calDraft}
                  onSelect={setCalDraft}
                  numberOfMonths={1}
                  locale={ptBR}
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
            void updateSettings({ goalType: showGross ? "liquido" : "bruto" });
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
                      value={settings.goalType}
                      onChange={(v) => { void updateSettings({ goalType: v }); }}
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
        {showMaintAlert && (
          <button
            type="button"
            onClick={() => openDrawer({ tab: "expense", category: "manutencao" })}
            className={cn(
              "mt-4 flex w-full items-start gap-3 rounded-2xl border p-4 text-left transition-colors hover:bg-muted/30",
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
              <div className="mt-1 text-[11px] font-medium text-primary">Registrar manutenção →</div>
            </div>
          </button>
        )}

        {/* Reorderable / hideable cards (excluding greeting which renders above) */}
        {homeOrder
          .filter((k) => k !== "greeting")
          .map((k, index, arr) => {
            const block = blocks[k];
            if (!block) return null;

            const prev = index > 0 ? arr[index - 1] : null;
            const marginClass =
              prev === "goal" && k === "smartKm"
                ? "mt-2"
                : prev === "smartKm"
                  ? "mt-3"
                  : "mt-5";

            return (
              <div key={k} className={marginClass}>
                {block}
              </div>
            );
          })
          .filter(Boolean)}
      </div>
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
  const activeClass = tone === "gross"
    ? "bg-gradient-to-b from-[hsl(var(--goal-gross))] to-[hsl(var(--goal-gross))]/85 text-white shadow-[0_2px_10px_-2px_hsl(var(--goal-gross)/0.55),inset_0_1px_0_hsl(0_0%_100%/0.12)] ring-1 ring-[hsl(var(--goal-gross))]/40"
    : "bg-gradient-to-b from-success to-success/85 text-success-foreground shadow-[0_2px_10px_-2px_hsl(var(--success)/0.55),inset_0_1px_0_hsl(0_0%_100%/0.12)] ring-1 ring-success/40";
  const inactiveClass = "text-muted-foreground hover:text-foreground";
  return (
    <div role="tablist" className="flex w-full items-stretch gap-1 rounded-xl border border-border/60 bg-muted/60 p-1">
      {items.map((o) => {
        const active = period === o.key;
        return (
          <button
            key={o.key}
            role="tab"
            aria-selected={active}
            onClick={() => onSelect(o.key)}
            className={cn(
              "flex-1 rounded-lg py-2 text-sm font-medium transition-all duration-300",
              active ? activeClass : inactiveClass
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
          "flex w-11 shrink-0 items-center justify-center rounded-lg transition-all duration-300",
          period === "custom" ? activeClass : inactiveClass
        )}
      >
        <CalendarRange className="h-4 w-4" />
      </button>
    </div>
  );
}

