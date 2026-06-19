/**
 * Insights Inteligentes — banco de frases acessível.
 * Tom parceiro, frases curtas, dado embutido. Variações sorteadas sem repetir
 * a mesma frase em chamadas consecutivas (memória por chave).
 */
import {
  Wallet, Receipt, Clock, Route, BarChart3, Trophy,
  TrendingUp, TrendingDown,
  type LucideIcon,
} from "lucide-react";

export type Tone = "good" | "warn" | "info";

export type PhraseKey =
  | "net.up" | "net.down" | "net.flat"
  | "expenses.down" | "expenses.up" | "expenses.flat"
  | "rph.up" | "rph.down"
  | "rpkm.up" | "rpkm.down"
  | "hours.more" | "hours.less"
  | "category.down" | "category.up" | "category.zero" | "category.new"
  | "platform.compare" | "platform.up" | "platform.down" | "platform.share"
  | "record.bestMonth" | "record.bestDay" | "record.bestRph";

export const PHRASES: Record<PhraseKey, string[]> = {
  "net.up": [
    "Seu lucro subiu {valor} em relação a {mês}. Tá indo bem!",
    "Você lucrou {valor} a mais que em {mês}. Boa!",
    "Mês melhor que {mês}: {valor} a mais no bolso.",
  ],
  "net.down": [
    "Seu lucro caiu {valor} em relação a {mês}. Dá pra recuperar.",
    "Mês mais apertado que {mês}, mas ainda dá tempo de virar o jogo.",
    "Você lucrou {valor} a menos que em {mês}. Bora pra cima.",
  ],
  "net.flat": [
    "Seu lucro tá quase igual ao de {mês}. Constância é isso!",
  ],

  "expenses.down": [
    "Você gastou {valor} a menos que em {mês}. O bolso agradece!",
    "Esse mês você economizou {valor} em relação a {mês}. Boa!",
    "Seus gastos caíram {valor}. Tá guardando mais dinheiro.",
  ],
  "expenses.up": [
    "Seus gastos subiram {valor} em relação a {mês}. Vale ficar de olho.",
    "Você gastou {valor} a mais que em {mês}. Dá uma conferida onde tá indo.",
  ],
  "expenses.flat": [
    "Seus gastos tão quase iguais aos de {mês}.",
  ],

  "rph.up": [
    "Cada hora tá te pagando melhor que em {mês}. Tá rendendo!",
    "Você tá ganhando {valor} por hora, mais que em {mês}.",
  ],
  "rph.down": [
    "Sua hora tá valendo menos que em {mês}. Vale rever os horários.",
    "Você ganhou menos por hora que em {mês}. Bora ajustar a rota.",
  ],

  "rpkm.up": [
    "Cada km tá te pagando melhor que em {mês}. Tá voando!",
    "Você tá ganhando mais a cada km rodado que em {mês}.",
  ],
  "rpkm.down": [
    "Seu km tá valendo menos que em {mês}. Talvez dê pra escolher corridas melhores.",
    "Cada km rendeu menos que em {mês}. Fica esperto nas corridas curtas.",
  ],

  "hours.more": [
    "Você rodou {valor} a mais que em {mês}. Tá com pique!",
    "Mais {valor} na pista que em {mês}. Bom ritmo.",
  ],
  "hours.less": [
    "Você rodou {valor} a menos que em {mês} até agora. Bora pra pista?",
    "Faltam algumas horas pra alcançar {mês}. Dá tempo de correr atrás!",
  ],

  "category.down": [
    "Você gastou {valor} a menos com {categoria} que em {mês} {emoji}",
    "Economizou {valor} em {categoria} esse mês {emoji}",
  ],
  "category.up": [
    "Seus gastos com {categoria} subiram {valor} vs {mês} {emoji}",
    "Você gastou {valor} a mais com {categoria} que em {mês} {emoji}",
  ],
  "category.zero": [
    "Você ainda não anotou nenhum gasto com {categoria} esse mês {emoji}",
    "Tá zerado em {categoria} por aqui. Esqueceu de anotar? {emoji}",
  ],
  "category.new": [
    "Gasto novo esse mês: {valor} com {categoria} {emoji}",
  ],

  "platform.compare": [
    "A {plat1} te pagou mais que a {plat2} esse mês",
    "Você ganhou mais com a {plat1} que com a {plat2} em {mês}",
  ],
  "platform.up": [
    "A {plat} rendeu {valor} a mais que em {mês}. Boa!",
    "Seus ganhos com a {plat} subiram {valor} vs {mês}.",
  ],
  "platform.down": [
    "A {plat} rendeu {valor} a menos que em {mês}.",
    "Você ganhou menos com a {plat} que em {mês}. Vale testar outra.",
  ],
  "platform.share": [
    "A {plat} foi {valor}% dos seus ganhos esse mês.",
    "A maior parte do seu dinheiro veio da {plat} esse mês.",
  ],

  "record.bestMonth": [
    "Melhor mês de lucro até agora: {valor}! Mandou bem demais.",
  ],
  "record.bestDay": [
    "Seu melhor dia foi {data}: {valor} num dia só. Tá voando!",
  ],
  "record.bestRph": [
    "Recorde de ganho por hora esse mês. Tá afiado!",
  ],
};

export const TONE: Record<PhraseKey, Tone> = {
  "net.up": "good", "net.down": "warn", "net.flat": "info",
  "expenses.down": "good", "expenses.up": "warn", "expenses.flat": "info",
  "rph.up": "good", "rph.down": "warn",
  "rpkm.up": "good", "rpkm.down": "warn",
  "hours.more": "info", "hours.less": "info",
  "category.down": "good", "category.up": "warn",
  "category.zero": "info", "category.new": "info",
  "platform.compare": "info", "platform.up": "good",
  "platform.down": "warn", "platform.share": "info",
  "record.bestMonth": "good", "record.bestDay": "good", "record.bestRph": "good",
};

/** Ícone lucide sóbrio por assunto. Cor vem do TONE (não do ícone). */
export const INSIGHT_ICON: Record<PhraseKey, LucideIcon> = {
  "net.up": TrendingUp, "net.down": TrendingDown, "net.flat": Wallet,
  "expenses.down": TrendingDown, "expenses.up": TrendingUp, "expenses.flat": Receipt,
  "rph.up": Clock, "rph.down": Clock,
  "rpkm.up": Route, "rpkm.down": Route,
  "hours.more": Clock, "hours.less": Clock,
  "category.down": Wallet, "category.up": Wallet,
  "category.zero": Wallet, "category.new": Wallet,
  "platform.compare": BarChart3, "platform.up": BarChart3,
  "platform.down": BarChart3, "platform.share": BarChart3,
  "record.bestMonth": Trophy, "record.bestDay": Trophy, "record.bestRph": Trophy,
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

export function fillPhrase(tpl: string, vars: Record<string, string>): string {
  return tpl.replace(/\{(\w+)\}/g, (_, k) => (k in vars ? vars[k] : ""))
    // colapsa espaços duplos caso alguma variável esteja vazia
    .replace(/\s{2,}/g, " ")
    .trim();
}
