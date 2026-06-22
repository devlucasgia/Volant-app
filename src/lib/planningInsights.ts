export type InsightTone = "good" | "warn" | "bad" | "info";

export interface PlanningInsight {
  icon: string;
  text: string;
  tone: InsightTone;
}

export interface PlanningInsightsInput {
  rpkAtual: number;
  rpkMinimo: number;
  homeRemainingGross: number;
  homeDailyGross: number;
  remainingWorkdaysCount: number;
  currentGross: number;
  homeGrossTarget: number;
  daysWorkedThisMonth: number;
  selectedWorkdaysCount: number;
  currentKm: number;
  hoursWorked?: number; // se disponível no snapshot
}

export function computePlanningInsights(
  input: PlanningInsightsInput
): PlanningInsight[] {
  const {
    rpkAtual, rpkMinimo,
    homeRemainingGross, homeDailyGross,
    remainingWorkdaysCount, currentGross, homeGrossTarget,
    daysWorkedThisMonth, selectedWorkdaysCount,
    currentKm, hoursWorked,
  } = input;

  const insights: PlanningInsight[] = [];

  const fmt = (v: number) =>
    v.toLocaleString("pt-BR", {
      style: "currency", currency: "BRL", maximumFractionDigits: 0,
    });
  const fmt2 = (v: number) =>
    v.toLocaleString("pt-BR", {
      style: "currency", currency: "BRL",
      minimumFractionDigits: 2, maximumFractionDigits: 2,
    });

  const temDados = currentGross > 0 || daysWorkedThisMonth > 0;
  if (!temDados) return insights;

  const progressPct = homeGrossTarget > 0 ? currentGross / homeGrossTarget : 0;

  // 1. Meta batida — encerrando aqui, nada mais relevante
  if (progressPct >= 1) {
    insights.push({
      icon: "🏆",
      tone: "good",
      text: `Meta do mês batida. Tudo que você fizer agora é lucro extra — sem pressão, só ganho.`,
    });
    return insights;
  }

  // 2. KM rodado alto mas faturamento baixo — corridas ruins
  // Motorista rodou muito mas rendeu pouco por km — insight que ele não calcularia
  if (currentKm > 0 && rpkAtual > 0 && rpkMinimo > 0 && rpkAtual < rpkMinimo * 0.85) {
    const kmNecessario = homeGrossTarget / rpkMinimo;
    const kmExtra = currentKm - (kmNecessario * progressPct);
    if (kmExtra > 50) {
      insights.push({
        icon: "🛣️",
        tone: "bad",
        text: `Você rodou ${currentKm.toLocaleString("pt-BR")} km mas está rendendo ${fmt2(rpkAtual)}/km — abaixo do mínimo de ${fmt2(rpkMinimo)}. Você está rodando mais do que o necessário por menos do que deveria. Corridas seletivas valem mais que km a mais.`,
      });
    }
  }

  // 3. R$/km acima — mas quanto tempo sobra?
  // Conecta rendimento por km com o tempo restante
  if (rpkAtual >= rpkMinimo && rpkAtual > 0 && remainingWorkdaysCount > 0) {
    const projecao = currentGross + homeDailyGross * remainingWorkdaysCount;
    if (projecao >= homeGrossTarget) {
      insights.push({
        icon: "⚡",
        tone: "good",
        text: `Seu R$/km está em ${fmt2(rpkAtual)} — acima do mínimo. Se mantiver esse ritmo nos ${remainingWorkdaysCount} dias restantes, você fecha o mês no alvo.`,
      });
    } else {
      // Tá com bom R$/km mas ainda assim não vai bater — precisa de mais dias
      insights.push({
        icon: "💡",
        tone: "warn",
        text: `Seu R$/km de ${fmt2(rpkAtual)} está bom, mas o tempo que resta pode não ser suficiente. Considere trabalhar em algum dia de folga ou ajustar a meta.`,
      });
    }
  }

  // 4. Quase lá — com contexto de ritmo
  if (progressPct >= 0.85 && progressPct < 1 && daysWorkedThisMonth > 0) {
    const ritmoAtual = currentGross / daysWorkedThisMonth;
    const diasParaFechar = Math.ceil(homeRemainingGross / ritmoAtual);
    if (diasParaFechar <= remainingWorkdaysCount) {
      insights.push({
        icon: "🏁",
        tone: "good",
        text: `Faltam ${fmt(homeRemainingGross)} — e no seu ritmo atual de ${fmt(ritmoAtual)}/dia, você fecha em ${diasParaFechar} ${diasParaFechar === 1 ? "dia" : "dias"}. Tá no controle.`,
      });
    }
  }

  // 5. Desvio silencioso — meta do dia não está sendo batida mas R$/km parece ok
  // Motorista pode achar que está bem porque o R$/km é bom, mas está trabalhando menos dias
  if (
    daysWorkedThisMonth > 0 &&
    selectedWorkdaysCount > 0 &&
    remainingWorkdaysCount > 0
  ) {
    const diasEsperadosAteAgora = selectedWorkdaysCount - remainingWorkdaysCount;
    const diasAtraso = diasEsperadosAteAgora - daysWorkedThisMonth;
    if (diasAtraso >= 2) {
      const faltaExtra = diasAtraso * homeDailyGross;
      insights.push({
        icon: "📅",
        tone: "warn",
        text: `Você deixou de trabalhar ${diasAtraso} ${diasAtraso === 1 ? "dia" : "dias"} que estavam no plano. Isso significa ${fmt(faltaExtra)} a mais pra recuperar nos dias restantes.`,
      });
    }
  }

  // 6. R$/km muito abaixo — traduzir em impacto real de km
  // Não só "está abaixo", mas "o quanto a mais você vai precisar rodar"
  if (rpkAtual > 0 && rpkMinimo > 0 && rpkAtual < rpkMinimo * 0.9 && currentKm > 0) {
    const kmNecessarioComRitmoAtual = homeRemainingGross / rpkAtual;
    const kmNecessarioComMinimo = homeRemainingGross / rpkMinimo;
    const kmExtra = kmNecessarioComRitmoAtual - kmNecessarioComMinimo;
    if (kmExtra > 100) {
      insights.push({
        icon: "⚠️",
        tone: "bad",
        text: `No ritmo atual de ${fmt2(rpkAtual)}/km, você vai precisar rodar ${Math.round(kmExtra).toLocaleString("pt-BR")} km a mais do que o planejado para bater a meta. Subir o R$/km é mais eficiente que rodar mais.`,
      });
    }
  }

  // Priorizar os mais críticos e retornar no máximo 2
  const ordem: InsightTone[] = ["bad", "warn", "good", "info"];
  insights.sort((a, b) => ordem.indexOf(a.tone) - ordem.indexOf(b.tone));
  return insights.slice(0, 2);
}
