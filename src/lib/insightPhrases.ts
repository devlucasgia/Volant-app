/**
 * Insights Inteligentes — banco de frases v2 (4 camadas).
 * Tom parceiro, frases curtas, dado embutido. Variações sorteadas sem repetir
 * a mesma frase em chamadas consecutivas (memória por chave).
 *
 * Regra de parcialidade: chaves sensíveis à comparação possuem variantes
 * `.partial` (mês atual ainda não acabou) e `.closed` (mês encerrado).
 */
import {
  Wallet, Receipt, Clock, Route, BarChart3, Trophy,
  type LucideIcon,
} from "lucide-react";

export type Tone = "good" | "warn" | "info";

export type PhraseKey =
  // LUCRO
  | "net.up.partial" | "net.up.closed"
  | "net.down.partial" | "net.down.closed"
  | "net.flat"
  // GASTOS
  | "expenses.down.partial" | "expenses.down.closed"
  | "expenses.up.partial" | "expenses.up.closed"
  | "expenses.flat"
  // R$/HORA
  | "rph.up.partial" | "rph.up.closed"
  | "rph.down.partial" | "rph.down.closed"
  // R$/KM
  | "rpkm.up.partial" | "rpkm.up.closed"
  | "rpkm.down.partial" | "rpkm.down.closed"
  // HORAS
  | "hours.more.partial" | "hours.more.closed"
  | "hours.less.partial" | "hours.less.closed"
  // CATEGORIAS
  | "category.down.partial" | "category.down.closed"
  | "category.up.partial" | "category.up.closed"
  | "category.zero" | "category.new"
  // PLATAFORMAS
  | "platform.compare.partial" | "platform.compare.closed"
  | "platform.up.partial" | "platform.up.closed"
  | "platform.down.partial" | "platform.down.closed"
  | "platform.share"
  // RECORDES
  | "record.bestDay" | "record.bestRph";

export const PHRASES: Record<PhraseKey, string[]> = {
  // ---------- LUCRO ----------
  "net.up.partial": [
    "Você lucrou {valor} a mais que no mesmo período de {mês}. No ritmo certo, esse mês fecha melhor!",
    "Até agora você tá {valor} acima do mesmo período de {mês}. Continue assim que o mês fecha forte.",
  ],
  "net.up.closed": [
    "Você fechou {mês} lucrando {valor} a mais. Mês redondo, parabéns!",
  ],
  "net.down.partial": [
    "Você tá {valor} abaixo do mesmo período de {mês}, mas o mês ainda não acabou. Dá pra virar o jogo.",
  ],
  "net.down.closed": [
    "Esse mês fechou {valor} abaixo de {mês}. Bora ajustar e recuperar no próximo.",
  ],
  "net.flat": [
    "Seu lucro tá quase igual ao mesmo período de {mês}. Constância também é resultado.",
  ],

  // ---------- GASTOS ----------
  "expenses.down.partial": [
    "Você gastou {valor} a menos que no mesmo período de {mês}. Segurando assim, sobra mais no fim!",
    "Até agora seus gastos tão {valor} abaixo do mesmo período de {mês}. Tá no controle.",
  ],
  "expenses.down.closed": [
    "Você fechou {mês} gastando {valor} a menos. O bolso agradece!",
  ],
  "expenses.up.partial": [
    "Seus gastos tão {valor} acima do mesmo período de {mês}. Vale ver onde dá pra segurar antes do mês fechar.",
  ],
  "expenses.up.closed": [
    "Esse mês os gastos passaram {valor} de {mês}. Fica de olho onde foi parar o dinheiro.",
  ],
  "expenses.flat": [
    "Seus gastos tão quase iguais aos do mesmo período de {mês}.",
  ],

  // ---------- R$/HORA ----------
  "rph.up.partial": [
    "Cada hora tá te pagando melhor que no mesmo período de {mês}: {valor} por hora. Tá rendendo!",
  ],
  "rph.up.closed": [
    "Cada hora te pagou melhor que em {mês}: {valor} por hora. Mês rendeu bem!",
  ],
  "rph.down.partial": [
    "Sua hora tá rendendo menos que no mesmo período de {mês}. Talvez dê pra escolher horários mais cheios.",
  ],
  "rph.down.closed": [
    "Sua hora rendeu menos que em {mês}. Vale rever os horários no próximo mês.",
  ],

  // ---------- R$/KM ----------
  "rpkm.up.partial": [
    "Cada km tá te pagando melhor que no mesmo período de {mês}. Tá rodando esperto!",
  ],
  "rpkm.up.closed": [
    "Cada km te pagou melhor que em {mês}. Mês de corridas bem escolhidas!",
  ],
  "rpkm.down.partial": [
    "Seu km tá rendendo menos que no mesmo período de {mês}. Vale evitar corrida curta que paga pouco.",
  ],
  "rpkm.down.closed": [
    "Seu km rendeu menos que em {mês}. Vale evitar corrida curta que paga pouco.",
  ],

  // ---------- HORAS ----------
  "hours.more.partial": [
    "Você já rodou {valor} a mais que no mesmo período de {mês}. Tá com pique!",
  ],
  "hours.more.closed": [
    "Você rodou {valor} a mais que em {mês}. Mês de pique forte!",
  ],
  "hours.less.partial": [
    "Você rodou {valor} a menos que no mesmo período de {mês}. Ainda dá tempo de correr atrás!",
  ],
  "hours.less.closed": [
    "Você rodou {valor} a menos que em {mês}. Bora pra pista no próximo!",
  ],

  // ---------- CATEGORIAS ----------
  "category.down.partial": [
    "Você gastou {valor} a menos com {categoria} que no mesmo período de {mês}. Boa economia! {emoji}",
  ],
  "category.down.closed": [
    "Você fechou {mês} gastando {valor} a menos com {categoria}. Boa economia! {emoji}",
  ],
  "category.up.partial": [
    "Seus gastos com {categoria} tão {valor} acima do mesmo período de {mês}. Vale ficar de olho. {emoji}",
  ],
  "category.up.closed": [
    "Esse mês os gastos com {categoria} passaram {valor} de {mês}. Vale ficar de olho. {emoji}",
  ],
  "category.zero": [
    "Você ainda não anotou nenhum gasto com {categoria} esse mês. Se rolou, não esquece de lançar. {emoji}",
  ],
  "category.new": [
    "Apareceu um gasto novo: {valor} com {categoria} esse mês. {emoji}",
  ],

  // ---------- PLATAFORMAS ----------
  "platform.compare.partial": [
    "A {plat1} te pagou mais que a {plat2} no mesmo período de {mês}. Vale priorizar onde rende mais.",
  ],
  "platform.compare.closed": [
    "A {plat1} te pagou mais que a {plat2} em {mês}. Vale priorizar onde rende mais.",
  ],
  "platform.up.partial": [
    "A {plat} rendeu {valor} a mais que no mesmo período de {mês}. Tá indo bem por lá!",
  ],
  "platform.up.closed": [
    "A {plat} rendeu {valor} a mais que em {mês}. Tá indo bem por lá!",
  ],
  "platform.down.partial": [
    "A {plat} rendeu {valor} a menos que no mesmo período de {mês}. Talvez valha testar mais a outra.",
  ],
  "platform.down.closed": [
    "A {plat} rendeu {valor} a menos que em {mês}. Talvez valha testar mais a outra.",
  ],
  "platform.share": [
    "A maior parte do seu dinheiro esse mês veio da {plat}. Bom saber onde focar.",
  ],

  // ---------- RECORDES ----------
  "record.bestDay": [
    "Esse foi seu melhor dia até agora: {valor} num dia só. Tá voando!",
  ],
  "record.bestRph": [
    "Melhor ganho por hora dos últimos meses. Tá afiado!",
  ],
};

export const TONE: Record<PhraseKey, Tone> = {
  "net.up.partial": "good", "net.up.closed": "good",
  "net.down.partial": "warn", "net.down.closed": "warn",
  "net.flat": "info",
  "expenses.down.partial": "good", "expenses.down.closed": "good",
  "expenses.up.partial": "warn", "expenses.up.closed": "warn",
  "expenses.flat": "info",
  "rph.up.partial": "good", "rph.up.closed": "good",
  "rph.down.partial": "warn", "rph.down.closed": "warn",
  "rpkm.up.partial": "good", "rpkm.up.closed": "good",
  "rpkm.down.partial": "warn", "rpkm.down.closed": "warn",
  "hours.more.partial": "info", "hours.more.closed": "info",
  "hours.less.partial": "info", "hours.less.closed": "info",
  "category.down.partial": "good", "category.down.closed": "good",
  "category.up.partial": "warn", "category.up.closed": "warn",
  "category.zero": "info", "category.new": "info",
  "platform.compare.partial": "info", "platform.compare.closed": "info",
  "platform.up.partial": "good", "platform.up.closed": "good",
  "platform.down.partial": "warn", "platform.down.closed": "warn",
  "platform.share": "info",
  "record.bestDay": "good", "record.bestRph": "good",
};

/** Ícone lucide por assunto (não por direção). Cor vem do TONE. */
export const INSIGHT_ICON: Record<PhraseKey, LucideIcon> = {
  "net.up.partial": Wallet, "net.up.closed": Wallet,
  "net.down.partial": Wallet, "net.down.closed": Wallet,
  "net.flat": Wallet,
  "expenses.down.partial": Receipt, "expenses.down.closed": Receipt,
  "expenses.up.partial": Receipt, "expenses.up.closed": Receipt,
  "expenses.flat": Receipt,
  "rph.up.partial": Clock, "rph.up.closed": Clock,
  "rph.down.partial": Clock, "rph.down.closed": Clock,
  "rpkm.up.partial": Route, "rpkm.up.closed": Route,
  "rpkm.down.partial": Route, "rpkm.down.closed": Route,
  "hours.more.partial": Clock, "hours.more.closed": Clock,
  "hours.less.partial": Clock, "hours.less.closed": Clock,
  "category.down.partial": Wallet, "category.down.closed": Wallet,
  "category.up.partial": Wallet, "category.up.closed": Wallet,
  "category.zero": Wallet, "category.new": Wallet,
  "platform.compare.partial": BarChart3, "platform.compare.closed": BarChart3,
  "platform.up.partial": BarChart3, "platform.up.closed": BarChart3,
  "platform.down.partial": BarChart3, "platform.down.closed": BarChart3,
  "platform.share": BarChart3,
  "record.bestDay": Trophy, "record.bestRph": Trophy,
};

export const TONE_CLASS: Record<Tone, string> = {
  good: "text-success",
  warn: "text-warning",
  info: "text-info",
};

/** Última variação usada por chave — evita repetir a mesma frase em sequência. */
const lastIdxByKey = new Map<PhraseKey, number>();

export function pickPhrase(key: PhraseKey): string {
  const list = PHRASES[key];
  if (!list || list.length === 0) return "";
  if (list.length === 1) return list[0];
  const prev = lastIdxByKey.get(key) ?? -1;
  let next = Math.floor(Math.random() * list.length);
  if (next === prev) next = (next + 1) % list.length;
  lastIdxByKey.set(key, next);
  return list[next];
}

/**
 * Substitui {chave} pelo valor correspondente. Aceita chaves com acentos
 * (ex.: {mês}) — por isso evita `\w`, que sem flag `u` não casa com `ê`.
 * Se a variável estiver vazia, espaços resultantes são colapsados.
 */
export function fillPhrase(tpl: string, vars: Record<string, string>): string {
  return tpl
    .replace(/\{([^}]+)\}/g, (_, k) => (k in vars ? vars[k] : ""))
    .replace(/\s+([.,!?;:])/g, "$1")
    .replace(/\s{2,}/g, " ")
    .trim();
}
