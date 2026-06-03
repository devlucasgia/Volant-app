import { useMemo } from "react";
import { startOfMonth, endOfMonth } from "date-fns";
import { Car, Entry, EarningEntry, ExpenseEntry, GoalType, Settings } from "@/types";
import { useData } from "@/context/DataContext";
import { computeFixedMonthlyCosts, startOfDay, toIsoDate } from "@/lib/planejamento";

export type PlanningStatusKind =
  | "not_configured"
  | "invalid_avg_km"
  | "no_workdays"
  | "needs_adjustment"
  | "completed"
  | "on_track"
  | "behind"
  | "ahead";

export interface PlanningSnapshot {
  isPlanningConfigured: boolean;
  mainGoalType: GoalType;

  // Targets
  grossTarget: number;
  netTarget: number;
  requiredGrossRevenue: number;
  estimatedNetProfit: number;

  // Costs
  consideredCosts: number;
  costItems: { label: string; value: number }[];

  // Progresso real do mês
  currentGross: number;
  currentExpenses: number;
  currentNet: number;
  currentKm: number;

  // Restante
  remainingGross: number;
  remainingNet: number;
  remainingGrossToTarget: number;
  activeRemainingAmount: number;

  // Dias
  selectedWorkdaysCount: number;
  remainingWorkdaysCount: number;
  pastWorkdaysCount: number;

  // Meta diária
  suggestedDailyGrossGoal: number;
  suggestedDailyNetGoal: number;
  activeSuggestedDailyGoal: number;
  dailyGrossNeeded: number;

  // KM — novo modelo
  averageKmPerDay: number;
  plannedKmTotal: number;
  remainingPlannedKm: number;
  requiredRpk: number;
  smartRpk: number;

  // Home lens — alvos simétricos para o toggle bruto/líquido da Home.
  // bruto = meta cadastrada crua; líquido = meta cadastrada + custos fixos.
  // Independente do goalType cadastrado. Progresso sempre usa currentGross.
  homeGrossTarget: number;
  homeNetTarget: number;
  homeRemainingGross: number;
  homeRemainingNet: number;
  homeDailyGross: number;
  homeDailyNet: number;
  homeSmartRpkGross: number;
  homeSmartRpkNet: number;

  // Aliases técnicos (compat)
  baseRpk: number;
  requiredKm: number;
  remainingKm: number;
  averageKmPerWorkday: number;


  status: PlanningStatusKind;
  message: string;
}

interface ComputeInput {
  now?: Date;
  settings: Settings;
  activeCar: Car | null;
  entries: Entry[];
}

/** Helper local — soma gross, expenses, net e km do mês de referência. */
export function monthAggregates(entries: Entry[], now: Date) {
  const from = +startOfMonth(now);
  const to = +endOfMonth(now);
  let gross = 0;
  let expenses = 0;
  let km = 0;
  for (const e of entries) {
    const t = +new Date(e.date);
    if (t < from || t > to) continue;
    if (e.type === "earning") {
      const en = e as EarningEntry;
      gross += en.gross || 0;
      km += en.km || 0;
    } else {
      const ex = e as ExpenseEntry;
      expenses += ex.expense.amount || 0;
    }
  }
  return { gross, expenses, net: gross - expenses, km };
}

const safe = (v: number) => (!isFinite(v) || isNaN(v) ? 0 : v);
const clampPos = (v: number) => Math.max(0, safe(v));

export function computePlanning(input: ComputeInput): PlanningSnapshot {
  const now = input.now ?? new Date();
  const { settings, activeCar, entries } = input;

  const isPlanningConfigured = settings.planningStatus === "configured";
  const mainGoalType: GoalType = settings.goalType ?? "bruto";
  const monthlyGoal = Number(settings.monthlyGoal) || 0;

  // Custos considerados (fixos do veículo) — independentes dos gastos reais
  const costs = computeFixedMonthlyCosts(activeCar);
  const consideredCosts = costs.total;

  // Targets segundo a meta principal
  let grossTarget: number;
  let netTarget: number;
  let requiredGrossRevenue: number;
  let estimatedNetProfit: number;

  if (mainGoalType === "bruto") {
    grossTarget = monthlyGoal;
    requiredGrossRevenue = monthlyGoal;
    estimatedNetProfit = monthlyGoal - consideredCosts;
    netTarget = estimatedNetProfit;
  } else {
    netTarget = monthlyGoal;
    requiredGrossRevenue = monthlyGoal + consideredCosts;
    grossTarget = requiredGrossRevenue;
    estimatedNetProfit = monthlyGoal;
  }

  // Dias — hoje conta como restante se estiver selecionado
  const selected = settings.planningSelectedDates ?? [];
  const todayIso = toIsoDate(startOfDay(now));
  let pastWorkdaysCount = 0;
  let remainingWorkdaysCount = 0;
  for (const iso of selected) {
    if (iso >= todayIso) remainingWorkdaysCount += 1;
    else pastWorkdaysCount += 1;
  }
  const selectedWorkdaysCount = selected.length;

  // KM médio/dia — preferir novo campo; fallback derivado do legado para não
  // quebrar planos antigos (rpkBase + kmPlannedMonth).
  let averageKmPerDay = settings.planningAvgKmPerDay && settings.planningAvgKmPerDay > 0
    ? Number(settings.planningAvgKmPerDay)
    : 0;
  if (averageKmPerDay <= 0 && selectedWorkdaysCount > 0 && settings.kmPlannedMonth && settings.kmPlannedMonth > 0) {
    averageKmPerDay = Number(settings.kmPlannedMonth) / selectedWorkdaysCount;
  }

  const plannedKmTotal = averageKmPerDay > 0 && selectedWorkdaysCount > 0
    ? averageKmPerDay * selectedWorkdaysCount
    : 0;

  // Progresso real do mês
  const agg = monthAggregates(entries, now);
  const currentGross = clampPos(agg.gross);
  const currentExpenses = clampPos(agg.expenses);
  const currentNet = agg.net;
  const currentKm = clampPos(agg.km);

  const remainingGross = clampPos(grossTarget - currentGross);
  const remainingNet = clampPos(netTarget - currentNet);
  const remainingGrossToTarget = clampPos(requiredGrossRevenue - currentGross);
  const activeRemainingAmount = mainGoalType === "bruto" ? remainingGross : remainingNet;

  const remainingPlannedKm = clampPos(plannedKmTotal - currentKm);

  // Meta diária — restante / dias restantes
  const suggestedDailyGrossGoal =
    remainingWorkdaysCount > 0 ? remainingGross / remainingWorkdaysCount : 0;
  const suggestedDailyNetGoal =
    remainingWorkdaysCount > 0 ? remainingNet / remainingWorkdaysCount : 0;
  const activeSuggestedDailyGoal =
    mainGoalType === "bruto" ? suggestedDailyGrossGoal : suggestedDailyNetGoal;
  const dailyGrossNeeded =
    remainingWorkdaysCount > 0 ? remainingGrossToTarget / remainingWorkdaysCount : 0;

  // R$/KM mínimo necessário (estático) e R$/KM inteligente (dinâmico)
  const requiredRpk =
    plannedKmTotal > 0 ? requiredGrossRevenue / plannedKmTotal : 0;
  const smartRpk =
    remainingPlannedKm > 0 ? remainingGrossToTarget / remainingPlannedKm : 0;

  // Home lens — alvos simétricos independentes do goalType cadastrado.
  // bruto = meta cadastrada; líquido = meta cadastrada + custos fixos.
  // Progresso usa sempre currentGross (faturado), comparado ao alvo da lente ativa.
  const homeGrossTarget = monthlyGoal;
  const homeNetTarget = monthlyGoal + consideredCosts;
  const homeRemainingGross = clampPos(homeGrossTarget - currentGross);
  const homeRemainingNet = clampPos(homeNetTarget - currentGross);
  const homeDailyGross =
    remainingWorkdaysCount > 0 ? homeRemainingGross / remainingWorkdaysCount : 0;
  const homeDailyNet =
    remainingWorkdaysCount > 0 ? homeRemainingNet / remainingWorkdaysCount : 0;
  const homeSmartRpkGross =
    remainingPlannedKm > 0 ? homeRemainingGross / remainingPlannedKm : 0;
  const homeSmartRpkNet =
    remainingPlannedKm > 0 ? homeRemainingNet / remainingPlannedKm : 0;


  // Status
  let status: PlanningStatusKind;
  let message: string;

  const isCompleted =
    mainGoalType === "bruto"
      ? grossTarget > 0 && currentGross >= grossTarget
      : netTarget > 0 && currentNet >= netTarget;

  if (!isPlanningConfigured) {
    status = "not_configured";
    message =
      "Configure seu Planejamento Inteligente para acompanhar metas e KM com mais precisão.";
  } else if (averageKmPerDay <= 0) {
    status = "invalid_avg_km";
    message = "Informe sua média de KM por dia para calcular o R$/KM mínimo necessário.";
  } else if (isCompleted) {
    status = "completed";
    message = "Meta concluída. Você já atingiu o objetivo deste período.";
  } else if (remainingWorkdaysCount <= 0) {
    status = "no_workdays";
    message =
      "Você não tem mais dias planejados neste período. Ajuste o planejamento para recalcular sua meta.";
  } else if (remainingPlannedKm <= 0 && remainingGrossToTarget > 0) {
    status = "needs_adjustment";
    message =
      "Você já usou os KM planejados. Ajuste sua média de KM, seus dias ou sua meta para recalcular.";
  } else {
    const expectedRatio =
      selectedWorkdaysCount > 0 ? pastWorkdaysCount / selectedWorkdaysCount : 0;
    const target = mainGoalType === "bruto" ? grossTarget : netTarget;
    const progress = mainGoalType === "bruto" ? currentGross : currentNet;
    const actualRatio = target > 0 ? progress / target : 0;
    const delta = actualRatio - expectedRatio;
    if (delta > 0.1) {
      status = "ahead";
      message = "Você está acima do ritmo planejado.";
    } else if (delta < -0.1) {
      status = "behind";
      message = "Seu ritmo está abaixo do necessário para atingir a meta.";
    } else {
      status = "on_track";
      message = "Você está dentro do ritmo planejado.";
    }
  }

  const requiredRpkOut = clampPos(requiredRpk);
  const remainingPlannedKmOut = clampPos(remainingPlannedKm);

  return {
    isPlanningConfigured,
    mainGoalType,
    grossTarget: clampPos(grossTarget),
    netTarget: clampPos(netTarget),
    requiredGrossRevenue: clampPos(requiredGrossRevenue),
    estimatedNetProfit: safe(estimatedNetProfit),
    consideredCosts,
    costItems: costs.items,
    currentGross,
    currentExpenses,
    currentNet,
    currentKm,
    remainingGross,
    remainingNet,
    remainingGrossToTarget,
    activeRemainingAmount,
    selectedWorkdaysCount,
    remainingWorkdaysCount,
    pastWorkdaysCount,
    suggestedDailyGrossGoal: clampPos(suggestedDailyGrossGoal),
    suggestedDailyNetGoal: clampPos(suggestedDailyNetGoal),
    activeSuggestedDailyGoal: clampPos(activeSuggestedDailyGoal),
    dailyGrossNeeded: clampPos(dailyGrossNeeded),
    averageKmPerDay: clampPos(averageKmPerDay),
    plannedKmTotal: clampPos(plannedKmTotal),
    remainingPlannedKm: remainingPlannedKmOut,
    requiredRpk: requiredRpkOut,
    smartRpk: clampPos(smartRpk),
    homeGrossTarget: clampPos(homeGrossTarget),
    homeNetTarget: clampPos(homeNetTarget),
    homeRemainingGross,
    homeRemainingNet,
    homeDailyGross: clampPos(homeDailyGross),
    homeDailyNet: clampPos(homeDailyNet),
    homeSmartRpkGross: clampPos(homeSmartRpkGross),
    homeSmartRpkNet: clampPos(homeSmartRpkNet),
    // aliases técnicos (compat com consumidores antigos)
    baseRpk: requiredRpkOut,
    requiredKm: clampPos(plannedKmTotal),
    remainingKm: remainingPlannedKmOut,
    averageKmPerWorkday:
      remainingWorkdaysCount > 0
        ? clampPos(remainingPlannedKm / remainingWorkdaysCount)
        : 0,
    status,
    message,
  };
}

export function usePlanningSnapshot(now?: Date): PlanningSnapshot {
  const { settings, activeCar, entries } = useData();
  return useMemo(
    () => computePlanning({ now, settings, activeCar, entries }),
    [now, settings, activeCar, entries],
  );
}
