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
  plannedKmProportional: number;
  totalHoursWorked: number;
}

const ROTATION_KEY = "planning_insight_rotation";
const ROTATION_TTL = 24 * 60 * 60 * 1000;

function getRotationIndex(total: number): number {
  try {
    const raw = localStorage.getItem(ROTATION_KEY);
    if (!raw) return 0;
    const { index, timestamp } = JSON.parse(raw);
    const expired = Date.now() - timestamp > ROTATION_TTL;
    const next = expired ? (index + 1) % total : index;
    if (expired) localStorage.setItem(ROTATION_KEY,
      JSON.stringify({ index: next, timestamp: Date.now() }));
    return next;
  } catch { return 0; }
}

export function computePlanningInsights(
  input: PlanningInsightsInput
): PlanningInsight[] {
  const {
    rpkAtual, rpkMinimo,
    homeRemainingGross, homeDailyGross,
    remainingWorkdaysCount, currentGross, homeGrossTarget,
    daysWorkedThisMonth, selectedWorkdaysCount,
    currentKm, plannedKmProportional, totalHoursWorked,
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

  // Nível de dificuldade da meta — usado para adaptar tom
  const metaImpossivel = rpkMinimo > 5;
  const metaDificil = rpkMinimo > 3.5 && !metaImpossivel;

  const bad: PlanningInsight[] = [];
  const warn: PlanningInsight[] = [];
  const good: PlanningInsight[] = [];

  // ── META BATIDA ──────────────────────────────────────────────────────────
  if (progressPct >= 1) {
    return [{ icon: "🏆", tone: "good",
      text: `Meta do mês batida. Tudo que você fizer agora é lucro extra — sem pressão, só ganho.`,
    }];
  }

  // ── BAD 1: R$/km abaixo do mínimo — tom adaptado pela dificuldade ────────
  // Unifica as antigas regras 1 e 2 (KM alto + km extra) em uma só.
  // Detecta o contexto (KM alto vs normal) e escolhe o ângulo da mensagem.
  const rpkAbaixo = rpkAtual > 0 && rpkMinimo > 0 && rpkAtual < rpkMinimo * 0.9;
  if (rpkAbaixo && currentKm > 0) {
    const kmNecessarioMinimo = homeGrossTarget / rpkMinimo;
    const kmAlto = currentKm > kmNecessarioMinimo * progressPct * 1.15;
    const kmExtraRestante = Math.round(
      (homeRemainingGross / rpkAtual) - (homeRemainingGross / rpkMinimo)
    );

    let text: string;
    if (metaImpossivel) {
      text = `Seu R$/km mínimo de ${fmt2(rpkMinimo)} está num território muito difícil — poucos motoristas chegam lá sem corridas premium ou longas. Se não é sua realidade agora, ajustar a meta ou os dias de trabalho vai ser mais eficiente que forçar o mês.`;
    } else if (metaDificil && kmAlto) {
      text = `Você rodou bastante (${currentKm.toLocaleString("pt-BR")} km) mas o R$/km de ${fmt2(rpkAtual)} está abaixo dos ${fmt2(rpkMinimo)} que a meta exige. Com um mínimo exigente como esse, quantidade de km não resolve. Qualidade de corrida, sim.`;
    } else if (metaDificil) {
      text = `Com R$/km mínimo de ${fmt2(rpkMinimo)}, você está num plano puxado. Seu R$/km atual é ${fmt2(rpkAtual)}. Recusar corridas abaixo de ${fmt2(rpkMinimo * 0.9)}/km e priorizar as mais longas é o caminho mais realista.`;
    } else if (kmAlto) {
      text = `Você rodou ${currentKm.toLocaleString("pt-BR")} km mas está rendendo ${fmt2(rpkAtual)}/km, abaixo do mínimo de ${fmt2(rpkMinimo)}. Você está rodando mais do que o necessário por menos do que deveria. Corridas seletivas valem mais que km a mais.`;
    } else {
      text = `Seu R$/km está em ${fmt2(rpkAtual)}, abaixo do mínimo de ${fmt2(rpkMinimo)}. No ritmo atual, você vai precisar rodar ${kmExtraRestante.toLocaleString("pt-BR")} km a mais do que o planejado. Subir o R$/km é mais eficiente que rodar mais.`;
    }

    bad.push({ icon: "⚠️", tone: "bad", text });
  }

  // ── BAD 2: KM rodado muito abaixo do proporcional ────────────────────────
  // Mutuamente exclusivo com WARN 1 (dias perdidos) — se o KM está muito
  // abaixo, o problema já está capturado aqui de forma mais específica.
  const kmMuitoAbaixo =
    currentKm > 0 && plannedKmProportional > 0 &&
    currentKm < plannedKmProportional * 0.75 &&
    daysWorkedThisMonth > 0;

  if (kmMuitoAbaixo) {
    const kmFaltando = Math.round(plannedKmProportional - currentKm);
    bad.push({ icon: "📍", tone: "bad",
      text: `Até agora o plano previa ${Math.round(plannedKmProportional).toLocaleString("pt-BR")} km, mas você fez ${currentKm.toLocaleString("pt-BR")} km, ${kmFaltando.toLocaleString("pt-BR")} km abaixo. Isso pressiona o R$/km mínimo que sobra para os dias restantes.`,
    });
  }

  // ── WARN 1: Dias perdidos com impacto financeiro ─────────────────────────
  // Não dispara se BAD 2 (km abaixo) já disparou — mesma causa raiz
  if (!kmMuitoAbaixo && selectedWorkdaysCount > 0 && remainingWorkdaysCount > 0) {
    const diasEsperados = selectedWorkdaysCount - remainingWorkdaysCount;
    const diasAtraso = diasEsperados - daysWorkedThisMonth;
    if (diasAtraso >= 2) {
      const faltaExtra = diasAtraso * homeDailyGross;
      warn.push({ icon: "📅", tone: "warn",
        text: `Você deixou de trabalhar ${diasAtraso} dias que estavam no plano. Isso representa ${fmt(faltaExtra)} a mais pra recuperar nos dias restantes.`,
      });
    }
  }

  // ── WARN 2: R$/km bom mas tempo insuficiente ────────────────────────────
  if (!rpkAbaixo && rpkAtual > 0 && remainingWorkdaysCount > 0) {
    const projecao = currentGross + homeDailyGross * remainingWorkdaysCount;
    if (projecao < homeGrossTarget) {
      warn.push({ icon: "💡", tone: "warn",
        text: `Seu R$/km de ${fmt2(rpkAtual)} está bom, mas o tempo restante pode não ser suficiente. Trabalhar em algum dia de folga ou ajustar a meta pode fechar a conta.`,
      });
    }
  }

  // ── WARN 3: Viabilidade em horas ────────────────────────────────────────
  if (totalHoursWorked > 2 && daysWorkedThisMonth > 0 && homeRemainingGross > 0) {
    const grossPorHora = currentGross / totalHoursWorked;
    if (grossPorHora > 0) {
      const horasNecessarias = Math.ceil(homeRemainingGross / grossPorHora);
      const mediaHorasPorDia = totalHoursWorked / daysWorkedThisMonth;
      const diasEquivalentes = Math.ceil(horasNecessarias / mediaHorasPorDia);
      if (diasEquivalentes > remainingWorkdaysCount) {
        warn.push({ icon: "⏱️", tone: "warn",
          text: `Faltam ${fmt(homeRemainingGross)}. No seu ritmo de ${fmt(grossPorHora)}/hora, isso equivale a ~${horasNecessarias}h de trabalho — mais do que cabe nos ${remainingWorkdaysCount} dias restantes.`,
        });
      }
    }
  }

  // ── GOOD 1: Quase lá com projeção pelo ritmo real ───────────────────────
  if (progressPct >= 0.85 && progressPct < 1 && daysWorkedThisMonth > 0) {
    const ritmoAtual = currentGross / daysWorkedThisMonth;
    const diasParaFechar = Math.ceil(homeRemainingGross / ritmoAtual);
    if (diasParaFechar <= remainingWorkdaysCount) {
      good.push({ icon: "🏁", tone: "good",
        text: `Faltam ${fmt(homeRemainingGross)} — e no seu ritmo atual de ${fmt(ritmoAtual)}/dia, você fecha em ${diasParaFechar} ${diasParaFechar === 1 ? "dia" : "dias"}. Tá no bolso.`,
      });
    }
  }

  // ── GOOD 2: R$/km acima e projeção ok ───────────────────────────────────
  if (!rpkAbaixo && rpkAtual > 0 && remainingWorkdaysCount > 0) {
    const projecao = currentGross + homeDailyGross * remainingWorkdaysCount;
    if (projecao >= homeGrossTarget) {
      good.push({ icon: "⚡", tone: "good",
        text: `Seu R$/km está em ${fmt2(rpkAtual)} — acima do mínimo. Se mantiver esse ritmo nos ${remainingWorkdaysCount} ${remainingWorkdaysCount === 1 ? "dia restante" : "dias restantes"}, você fecha o mês no alvo.`,
      });
    }
  }

  // Pegar grupo mais crítico e rotacionar dentro dele (24h)
  const grupo = bad.length > 0 ? bad : warn.length > 0 ? warn : good;
  if (grupo.length === 0) return [];
  if (grupo.length === 1) return [grupo[0]];
  const idx = getRotationIndex(grupo.length);
  return [grupo[idx]];
}
