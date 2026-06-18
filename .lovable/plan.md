
# Sprint Final — Relatórios (consolidado + 3 ajustes + 4 garantias)

Mudanças **somente** em `src/pages/Reports.tsx` (reusa `src/hooks/useCountUp.ts`). Não toca `summarize`, `DataContext`, queries Supabase, `useReportOrder`/`useReportWidgets`, nem outras telas.

---

## PARTE 1 — Correções críticas

### 1.1 Posição estável do Insights
Walker respeita `visibleKeys`. `renderInsightBlock()` retornando `null` apenas omite o slot — sem reordenar nem depender de `chart`.

### 1.2 Comparação mesmo período (MTD / YTD)
Helper local `getCompareIntervals(mode, monthRef, yearRef, today)`:
- `month`: mês corrente → atual `01..hoje`, anterior `01..min(hoje.dia, último dia mês anterior)`. Encerrado → ambos cheios.
- `year`: análogo (clamp 29/Fev).
- Retorna `{ curInterval, prevInterval, label, isPartial }`.

**Apenas Insights usa esses intervalos** — o `interval` que alimenta `s` (totais, gráfico, lista) não muda.

Texto: `isPartial` → `"vs mesmo período de {label}"`; encerrado → `"vs {label}"`.

### 1.3 Herói bidirecional
- `case "net":` → `[]` se `heroKey === "grossExpenses"`.
- `case "grossExpenses":` → `[]` se `heroKey === "net"`.

### 1.4 Herói com cores semânticas
Tokens: `text-info` (azul), `text-destructive` (vermelho), `text-success` (verde).
- `grossExpenses`: eyebrow `"GANHO BRUTO"`, número grande `text-info`, subtítulo `Gastos {destructive} · Líquido {success}`.
- `net`: eyebrow `"LUCRO LÍQUIDO"`, número `text-success`, subtítulo `Bruto {info} · Gastos {destructive}`.

### 1.5 Tooltip em PT
`formatter` via `CHARTS_LABEL_PT`: `net`→"Lucro" (R$), `expenses`→"Gastos" (R$), `km`→"KM" (`${num(v,0)} km`), `hours`→"Horas" (`${num(v,1)}h`). `labelFormatter`: `"dd/MM"` diário, `"MMM/yy"` anual.

---

## PARTE 2 — Comportamento dos Insights

### 2.1 Rotação inteligente (9s) com pausa e retomada dinâmica
Estado: `rotationIdx`, `lastShownIdx`.
- `setInterval(9000)` ativo quando `queue` tem >1 item **e** `insightChip == null`.
- Toque em chip pausa por 10s. Ao retomar: NÃO reseta `rotationIdx`. Recalcula `queue` por relevância atual e continua de `(lastShownIdx + 1) % total`. Loop natural.
- Primeira montagem: começa do índice 0.
- Frase: `<span key={insight.id}>` com `animate-fade-in motion-reduce:animate-none`.

### 2.2 Ocultar card sem comparação **e G2 (estado vazio)**
`renderInsightBlock` → `null` quando:
- `mode === "range"`, ou
- `prevSummary == null`, ou
- `mode === "year"` sem ano anterior com dados, ou
- **Fila final vazia** (nenhum numérico relevante + nenhuma categoria relevante após todas as travas).

Sem fallback "Sem histórico" / sem placeholder.

---

## PARTE 3 — Insights por categoria (Ajustes 1 e 3)

Agrega `expenseByCategory` em `curInterval` e `prevInterval` (Parte 1.2). Para cada categoria:
- `cur`, `prev`, `delta`, `absDelta`.
- **Ajuste 3 — trava de base pequena:**
  - `prev < MIN_BASE_MONEY`: sem `%`. Só entra se `cur >= 30`. Frase: `"Você gastou R$ X com {categoria} — categoria nova vs {label}"`.
  - Caso contrário: calcula `pct`; `> MAX_PCT (999)` → variante qualitativa ("subiu/caiu bastante"), sem número.
- **Relevância (numérico/normal):** `absDelta >= 30 && |pct| >= 15`.
- Cor: subiu → `destructive`; caiu → `success`. Ícone `TrendingUp/Down`. `chartChip: "expenses"`.

### G1 — Estrutura única `buildQueue` (final, coerente)
**Único formato em todo o código** — nunca array plano:
```
buildQueue(numerics, categories): { numerics: N, categories: C, cIdx }
  N = [...numerics].sort((a,b) => b.absPct - a.absPct)
  C = [...categories].sort((a,b) => b.absDelta - a.absDelta)
  cIdx = 0 (estado externo, persistido entre ciclos)

getCurrent(rotationIdx, queue):
  if rotationIdx < N.length: return N[rotationIdx]
  if rotationIdx === N.length && C.length > 0: return C[cIdx % C.length]
  return null

total = N.length + (C.length > 0 ? 1 : 0)
advance: rotationIdx = (rotationIdx + 1) % total
  if rotationIdx === 0: cIdx++
```
Resultado: cada ciclo completo mostra todos os numéricos + 1 categoria (rotativa). Sem categorias → fila puramente numérica. Sem numéricos mas com categorias → ciclo de 1 (a categoria atual, rotacionando entre ciclos).

`insightMetricLabel` ganha case `"category"`.

### G3 — Coerência chip ↔ insight
Quando `insightChip != null` (pausa 10s):
- `getByChip(chip)`: busca em `N ∪ C` o insight cuja `metric === chip` (para `"expenses"`, prioriza maior `absDelta` entre categorias; senão, o numérico de gastos).
- Render usa esse insight diretamente, **ignorando `rotationIdx`** durante a pausa.
- Ao fim dos 10s: `insightChip = null` → retoma rotação dinâmica (2.1).

---

## PARTE 4 — Destaque e animação

- Eyebrow `"INSIGHTS INTELIGENTES"` (`text-[10px] uppercase tracking-[0.18em] text-muted-foreground`).
- Container: `bg-card/60 ring-1 ring-border/50`.
- Frase: `animate-fade-in` por `key`.
- Número: `InsightValue` existente (count-up + pulse, respeita reduced-motion).

---

## PARTE 5 — Count-up na troca de período

`<AnimatedNumber value format duration={500} />` usando `useCountUp` (ease-out, `prefers-reduced-motion`), wrapper `tabular-nums`.

Aplica em:
- Herói (`s.net` / `s.gross` / saldo / subs financeiros).
- `rowsFor`: `value` vira `{ amount, format }`; row renderiza com `<AnimatedNumber>`.

Subtítulos textuais (`{workedDays} ativos`, `${num(s.totalKm,0)} km rodados`) **não animam**.

---

## G4 — Não regredir (confirmação explícita)
Mantém intactos:
- Cores/gradientes do gráfico por métrica (verde/vermelho/azul/roxo) — **só o tooltip vira PT**.
- Chips do gráfico em grid 4 colunas sem scroll.
- Título contextual "Evolução diária/mensal/no período".
- Consolidação da lista (subtítulos absorvendo totais).
- Integração do card "insights" no sistema de Organização (toggle + DnD).

---

## CHECKLIST DE TESTE MANUAL
1. Promover Bruto+Gastos → herói azul grande, eyebrow correto, subtítulo bicolor, Líquido some da lista.
2. Mês corrente: insight "vs mesmo período de maio" (MTD vs MTD).
3. Mês encerrado: "vs {mês}" (cheio vs cheio).
4. "Por ano" sem ano anterior → card oculto.
5. ~30s parado → rotação 9s, máx 1 categoria por ciclo, sem repetir/travar.
6. Tocar "Gastos" → insight de gastos/categoria; após 10s avança no fluxo (não reseta).
7. Categoria nova ≥ R$ 30 → sem `%`, frase "categoria nova"; nunca "+9999%".
8. Trocar mês/ano → count-up ~500ms; subtítulos trocam direto.
9. `prefers-reduced-motion` → sem rotação automática, sem count-up.
10. Sem nenhum insight relevante (G2) → card oculto, sem placeholder.

## NÃO ALTERA
Queries Supabase, `DataContext`, `summarize`, DnD, cores/chips/título do gráfico (só tooltip), botões "Iniciar"/FAB, outras telas.
