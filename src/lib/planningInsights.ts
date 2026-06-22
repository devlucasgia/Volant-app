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
}

export function computePlanningInsights(
  input: PlanningInsightsInput
): PlanningInsight[] {
  const {
    rpkAtual, rpkMinimo,
    homeRemainingGross, homeDailyGross,
    remainingWorkdaysCount, currentGross, homeGrossTarget,
    daysWorkedThisMonth, selectedWorkdaysCount,
    currentKm,
  } = input;

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
  if (!temDados) return [];

  const progressPct = homeGrossTarget > 0 ? currentGross / homeGrossTarget : 0;

  // Ordem de prioridade: bad → warn → good
  // Retorna 1 insight — o mais crítico elegível

  // 1. Meta batida
  if (progressPct >= 1) {
    return [{
      icon: "🏆",
      tone: "good",
      text: `Meta do mês batida. Tudo que você fizer agora é lucro extra — sem pressão, só ganho.`,
    }];
  }

  // 2. KM alto mas rendimento baixo (BAD)
  // Regras 2 e 3 são mutuamente exclusivas: se 2 dispara, 3 não entra
  const rpkMuitoBaixo = rpkAtual > 0 && rpkMinimo > 0 && rpkAtual < rpkMinimo * 0.85;
  if (rpkMuitoBaixo && currentKm > 0) {
    const kmNecessarioMinimo = homeGrossTarget / rpkMinimo;
    const kmExtra = currentKm - kmNecessarioMinimo * progressPct;
    if (kmExtra > 50) {
      return [{
        icon: "🛣️",
        tone: "bad",
        text: `Você rodou ${currentKm.toLocaleString("pt-BR")} km mas está rendendo ${fmt2(rpkAtual)}/km — abaixo do mínimo de ${fmt2(rpkMinimo)}. Você está rodando mais do que o necessário por menos do que deveria. Corridas seletivas valem mais que km a mais.`,
      }];
    }
  }

  // 3. R$/km abaixo — traduzir em km extra necessário (BAD)
  // Só entra se regra 2 NÃO disparou
  if (!rpkMuitoBaixo && rpkAtual > 0 && rpkMinimo > 0 && rpkAtual < rpkMinimo * 0.9 && currentKm > 0) {
    const kmNecessarioAtual = homeRemainingGross / rpkAtual;
    const kmNecessarioMinimo = homeRemainingGross / rpkMinimo;
    const kmExtra = kmNecessarioAtual - kmNecessarioMinimo;
    if (kmExtra > 100) {
      return [{
        icon: "⚠️",
        tone: "bad",
        text: `No ritmo atual de ${fmt2(rpkAtual)}/km, você vai precisar rodar ${Math.round(kmExtra).toLocaleString("pt-BR")} km a mais do que o planejado para bater a meta. Subir o R$/km é mais eficiente que rodar mais.`,
      }];
    }
  }

  // 4. Dias perdidos do plano — impacto financeiro (WARN)
  if (daysWorkedThisMonth >= 0 && selectedWorkdaysCount > 0 && remainingWorkdaysCount > 0) {
    const diasEsperadosAteAgora = selectedWorkdaysCount - remainingWorkdaysCount;
    const diasAtraso = diasEsperadosAteAgora - daysWorkedThisMonth;
    if (diasAtraso >= 2) {
      const faltaExtra = diasAtraso * homeDailyGross;
      return [{
        icon: "📅",
        tone: "warn",
        text: `Você deixou de trabalhar ${diasAtraso} ${diasAtraso === 1 ? "dia" : "dias"} que estavam no plano. Isso significa ${fmt(faltaExtra)} a mais pra recuperar nos dias restantes.`,
      }];
    }
  }

  // 5. R$/km bom mas tempo pode não ser suficiente (WARN)
  if (rpkAtual >= rpkMinimo && rpkAtual > 0 && remainingWorkdaysCount > 0) {
    const projecao = currentGross + homeDailyGross * remainingWorkdaysCount;
    if (projecao < homeGrossTarget) {
      return [{
        icon: "💡",
        tone: "warn",
        text: `Seu R$/km de ${fmt2(rpkAtual)} está bom, mas o tempo restante pode não ser suficiente. Considere trabalhar em algum dia de folga ou ajustar a meta.`,
      }];
    }
  }

  // 6. Quase lá — com projeção de dias baseada no ritmo real (GOOD)
  if (progressPct >= 0.85 && progressPct < 1 && daysWorkedThisMonth > 0) {
    const ritmoAtual = currentGross / daysWorkedThisMonth;
    const diasParaFechar = Math.ceil(homeRemainingGross / ritmoAtual);
    if (diasParaFechar <= remainingWorkdaysCount) {
      return [{
        icon: "🏁",
        tone: "good",
        text: `Faltam ${fmt(homeRemainingGross)} — e no seu ritmo atual de ${fmt(ritmoAtual)}/dia, você fecha em ${diasParaFechar} ${diasParaFechar === 1 ? "dia" : "dias"}. Tá no bolso.`,
      }];
    }
  }

  // 7. R$/km acima do mínimo e projeção ok (GOOD)
  if (rpkAtual >= rpkMinimo && rpkAtual > 0 && remainingWorkdaysCount > 0) {
    const projecao = currentGross + homeDailyGross * remainingWorkdaysCount;
    if (projecao >= homeGrossTarget) {
      return [{
        icon: "⚡",
        tone: "good",
        text: `Seu R$/km está em ${fmt2(rpkAtual)} — acima do mínimo. Se mantiver esse ritmo nos ${remainingWorkdaysCount} ${remainingWorkdaysCount === 1 ? "dia restante" : "dias restantes"}, você fecha o mês no alvo.`,
      }];
    }
  }

  return [];
}
