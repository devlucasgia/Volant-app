Sprint (pequena) — Fix virada prematura do plano futuro + texto do insight R$/km + banner de ativação

### Escopo

Três arquivos:

1. `supabase/functions/activate-next-plans/index.ts`
2. `src/lib/planningInsights.ts`
3. `src/components/planejamento/PainelResumo.tsx` (bloco do banner de plano futuro ativado, linhas ~210–232)

Sem migrations, DataContext, stats, auth, planningEngine ou outros.

---

### 1. Fix virada prematura no edge function

**Problema:** `firstDayOfMonth` constrói um `Date` com `new Date(y, m-1, 1)`, que no runtime Deno/UTC cria meia-noite UTC. Meia-noite UTC do dia 1 = 21:00 BRT do dia anterior. Isso faz o plano do mês seguinte ativar às 21:00 BRT do último dia do mês atual, três horas antes da virada real.

**Solução:** substituir a comparação de objetos `Date` por comparação de strings `yyyy-MM-dd`, que é fuso-independente.

```ts
// REMOVER
function firstDayOfMonth(iso: string): Date {
  const [y, m] = iso.split("-").map((x) => Number(x));
  return new Date(y, (m ?? 1) - 1, 1);
}

// ADICIONAR
function firstDayOfMonthIso(iso: string): string {
  const [y, m] = iso.split("-");
  return `${y}-${m}-01`;
}
```

No loop de ativação:

```ts
// ANTES
const targetMonthStart = firstDayOfMonth(earliest);
if (now < targetMonthStart) continue;

// DEPOIS
const todayIso = now.toISOString().slice(0, 10); // "yyyy-MM-dd" em UTC
if (todayIso < firstDayOfMonthIso(earliest)) continue;
```

**Validação lógica:**

- 23:00 BRT do dia 30 = 02:00 UTC do dia 1 → `todayIso = "2026-07-01"`. `firstDayOfMonthIso("2026-07-01") = "2026-07-01"`. `"2026-07-01" < "2026-07-01"` → false → não ativa.
- 00:00 BRT do dia 1 = 03:00 UTC → `todayIso = "2026-07-01"` → ativa.
- Meio do mês anterior → `todayIso = "2026-06-15"`, `firstDayOfMonthIso = "2026-07-01"` → true → não ativa.

A guarda on-demand do frontend (`planExpired`) não muda; ela usa fuso local do browser e não era o problema.

---

### 2. Fix texto do insight GOOD 2 (R$/km acima do mínimo)

**Problema:** o texto atual (`"Seu R$/km está em R$ 3,03 — acima do mínimo..."`) deixa dois números adjacentes quando se tenta mostrar o delta (`"R$ 3,03, R$ 0,81"` fica ruim de ler).

**Solução:** reformular para um único número na frase, usando `/km` para ancorar a unidade.

```ts
// ANTES
const diffRpk = rpkAtual - rpkMinimo;
const diffFmt = diffRpk.toLocaleString("pt-BR", {
  style: "currency",
  currency: "BRL",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
const diasLabel = remainingWorkdaysCount === 1
  ? "no dia restante"
  : `nos ${remainingWorkdaysCount} dias restantes`;
good.push({ icon: "⚡", tone: "good",
  text: `Seu R$/km está em ${fmt2(rpkAtual)}, ${diffFmt} acima do mínimo. Se mantiver esse resultado ${diasLabel}, você fecha o mês no alvo.`,
});

// DEPOIS
const diffNum = (rpkAtual - rpkMinimo).toLocaleString("pt-BR", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
const diasLabel = remainingWorkdaysCount === 1
  ? "no dia restante"
  : `nos ${remainingWorkdaysCount} dias restantes`;
good.push({ icon: "⚡", tone: "good",
  text: `Você está ${diffNum}/km acima do mínimo. Mantendo esse ritmo ${diasLabel}, você fecha o mês no alvo.`,
});
```

**Resultado:** `"Você está 0,81/km acima do mínimo. Mantendo esse ritmo no dia restante, você fecha o mês no alvo."`

- Apenas um número na frase.
- `/km` substitui o `R$` antes do delta, mantendo a unidade clara.
- O valor absoluto (R$ 3,03) e o mínimo já estão visíveis no card de R$/km acima; o insight não precisa repetí-los.
- `diffRpk` é sempre positivo neste bloco (`!rpkAbaixo && rpkAtual > 0`), então não precisa de `Math.abs`.

---

### 3. Banner de ativação do plano futuro (PainelResumo.tsx)

**Local:** bloco do banner, linhas ~210–232.

**Capitalização:**

```tsx
// ANTES
{nextMonthLabel} Entrou Em Vigor 💰

// DEPOIS
{nextMonthLabel} entrou em vigor
```

- Só a primeira letra do mês fica maiúscula (já vem assim do `toLocaleDateString`).
- As demais palavras em minúsculo.
- Remover o emoji `💰`.

**Ícone:**

```tsx
// ANTES
<Sparkles className="..." />

// DEPOIS
<CalendarCheck className="..." />
```

- Usar `CalendarCheck` do `lucide-react`, já importado no arquivo.
- Manter a cor `text-primary` (verde) no container do ícone.

---

### Roteiro de validação

1. **Virada:** abrir o app às 23:00 BRT (com plano futuro do mês seguinte cadastrado) e confirmar que o banner e a ativação não aparecem. Após meia-noite BRT, confirmar que ativam normalmente.
2. **Insight:** com R$/km acima do mínimo e projeção cobrindo a meta, o card exibe `"Você está X/km acima do mínimo. Mantendo esse ritmo..."` sem dois números adjacentes. O valor bate: `rpkAtual − rpkMinimo` formatado em pt-BR.
3. **Banner:** quando um plano futuro acabou de ativar, o banner exibe `"Julho entrou em vigor"` (ou mês correspondente) com ícone `CalendarCheck` verde, sem emoji e sem maiúsculas fora do nome do mês.
4. **Demais insights:** os outros textos de `planningInsights.ts` não mudam.
5. **Typecheck:** garantir que o TypeScript compila após as alterações.

Se surgir necessidade de tocar em qualquer arquivo fora dos três listados, sinalizarei antes de executar.