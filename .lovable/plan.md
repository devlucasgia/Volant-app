## Sprint 3 — Planejamento Inteligente: Evidência, Conexão Visual e UX

Sprint puramente de apresentação. Sem mexer em `planningEngine`, queries Supabase, DataContext, summarize, useHomeOrder, AuthContext, herói, Ganhos, Gastos, Jornada, header/filtros, Relatórios, Histórico, Ajustes, Admin. Tudo acontece em `src/pages/Dashboard.tsx` (+ pequenos auxiliares em `src/lib/stats.ts` ou inline).

---

### Item 1 — Eyebrow "PLANEJAMENTO INTELIGENTE" agrupando Meta + KM

Hoje cada card vive num slot independente do reorder (`useHomeOrder`). Não vou alterar a ordem nem o DnD. Em vez disso, no loop de render (linhas ~1030-1066), quando `widgets.goal` e `widgets.smartKm` estiverem ambos visíveis E `smartKm` aparecer imediatamente após `goal` na ordem efetiva (que é o default e o caso normal), o slot de `goal` passa a injetar antes do botão um eyebrow:

```
◎ PLANEJAMENTO INTELIGENTE
```

- Ícone: `Target` (mesmo já importado).
- Classes: `text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground` — idêntico ao padrão de "Por aplicativo"/"Por gastos".
- O margin entre `goal` e `smartKm` continua `mt-2` (já existe na regra de marginClass).
- Performance (`stats`) mantém seu eyebrow próprio atual (linha 482-484), inalterado.
- Fallback: se `smartKm` estiver oculto ou reordenado para longe de `goal`, o eyebrow não aparece e cada card volta a se virar sozinho (`goal` sem eyebrow, igual hoje).

### Item 2 — KM Inteligente: km rodados sempre visível, sem "acima do plano"

Bloco linhas 587-603 do `Dashboard.tsx`. Substituir:

- Texto "X km acima do plano" / "Faltam X km" + sufixo "· pra cobrir todos os custos" → linha única e neutra: `{num(kmDriven, 0)} km rodados` à esquerda, com micro-texto `pra cobrir todos os custos` ao lado (ou em segunda linha curta se não couber — nunca truncar).
- Remover o badge `+X%` / `+X km` que aparecia no excesso (Item 6 — sem alertas de excesso).
- Manter `{num(kmPct, 0)}%` à direita como indicador discreto. Quando `kmDriven > kmRequired`, o percentual exibido pode passar de 100% (ex: `120%`) sem badge nem cor de alerta. A `<Progress>` continua travada em 100 visualmente (já tem `Math.min(100, ...)`), com uma leve borda/anel sutil no trilho indicando excesso (sem texto).

### Item 3 — R$/km mínimo: evidência de norteador

Bloco linhas 572-580 do `Dashboard.tsx`.

- Label: `R$/km mínimo` → `R$/km mínimo pra aceitar corrida`. Mantém numa única `<span>`; remove `whitespace-nowrap` se existir; deixa quebrar em duas linhas em telas estreitas. Classe continua `text-[13px] font-semibold text-foreground`, mas com `leading-tight` para quebra agradável.
- Valor `{brl(smartKmValue)}/km`: subir de `text-[15px]` para `text-[17px]` (~13% maior). `tabular-nums font-bold`. Continua sempre em branco/preto (`text-foreground`) — cor de status NÃO afeta o número, só ícone/barra (Item 4).
- Pulso suave em sincronia no `Gauge` e no `<span>` do valor: aplicar a classe utilitária já existente `animate-breath` (`src/index.css:181`) em ambos. Como o ciclo padrão pulsa demais para um número, ajustar/criar variante `animate-breath-soft` em `index.css` com keyframe `{ 0%,100%: opacity 1; 50%: opacity 0.72 }` em ciclo de ~2s. Já respeita `prefers-reduced-motion` (regra `@media` em `index.css:184`).

### Item 4 — Conexão visual R$/km mínimo ↔ R$/km real

Criar helper local no topo do componente (ou em `src/lib/stats.ts`):

```ts
type RpkStatus = "none" | "ok" | "warn" | "bad";
function rpkStatus(real: number, min: number, hasData: boolean): RpkStatus {
  if (!hasData || min <= 0) return "none";
  const ratio = real / min;
  if (ratio >= 1) return "ok";
  if (ratio >= 0.8) return "warn";
  return "bad";
}
```

`hasData` = `s.totalKm > 0`. `min` = `plan.homeSmartRpkGross`. `real` = `s.perKm`.

Mapa de cor (tokens semânticos existentes):
- `none` → `text-muted-foreground` / `[&>div]:bg-muted-foreground/50`
- `ok` → `text-success` / `[&>div]:bg-success`
- `warn` → `text-warning` / `[&>div]:bg-warning`
- `bad` → `text-destructive` / `[&>div]:bg-destructive`

Aplicações:
1. **KM Inteligente** (linhas 573, 584-585): ícone `Gauge` e a `<Progress>` deixam de ser fixos `text-info`/`[&>div]:bg-info`; recebem a cor de status. O `text-foreground` do número e o `text-muted-foreground` do label permanecem.
2. **Performance · R$/km** (linhas 500-506):
   - Ícone `Route` e label "R$ / km": cor do status.
   - Valor `{brl(s.perKm)}`: hoje é `text-foreground`. Vira a cor do status (substitui o azul fixo mencionado pelo usuário — hoje na verdade já é `text-foreground`, mas o label/ícone `text-info` é o "azul fixo"). Tanto faz: ícone, label e número usam a mesma cor de status.
   - Linha de baixo hoje mostra `{num(s.totalKm, 1)} km rodados`. Trocar por mensagem comparativa:
     - `ok`: `R$ X,XX acima do mínimo` (text-success)
     - `warn`/`bad`: `R$ X,XX abaixo do mínimo` (text-warning/text-destructive)
     - `none` ou `plan` não configurado: `Aguardando registros` (muted-foreground)
     - Cálculo: `diff = s.perKm - plan.homeSmartRpkGross`; usa `Math.abs(diff)` no texto.
   - O "km rodados" agora vive no card de KM Inteligente (Item 2), conforme pedido.
3. Transição: adicionar `transition-colors duration-300` em ícones/valores afetados e na `<Progress>` (já tem `transition-all duration-700` — mantém).

Se `plan.isPlanningConfigured === false`, o card de Performance/R$/km cai no estado `none` (sem comparação, sem mensagem comparativa) — preserva comportamento atual para quem não tem planejamento.

### Item 5 — Reduzir altura dos containers de Meta e KM

- **Goal** (linha 390): `p-4` → `px-4 py-3`. `mt-3` da Progress (linha 436) → `mt-2.5`. `mt-1.5` da linha de status (linha 439) → `mt-1`. `mt-2 pt-2` da projeção (linha 471) → `mt-1.5 pt-1.5`.
- **SmartKm** (linha 570): `px-4 py-3` permanece (já enxuto); `mt-2.5` da Progress (linha 585) → `mt-2`; `mt-1.5` da linha inferior (linha 587) → `mt-1`.
- Sem alterar `rounded-2xl`, `border`, sombras ou tipografia principal — só respiro.
- Validar em 360×800 com meta batida (visão Hoje) que herói + eyebrow + Meta + KM + topo do eyebrow de Performance cabem sem scroll.

### Item 6 — Nenhum texto truncado

- **`periodGoal.title`** (linha 414): substitui `truncate` por `leading-tight break-words` no `<span>`. Em `src/lib/stats.ts`, encurtar os títulos longos: `Meta líquida da semana` → `Meta líquida — semana`; `Meta líquida do mês` → `Meta líquida — mês`; `Meta líquida do dia` → `Meta líquida — hoje`; equivalente para `bruta`. Mantém intenção, sem reticências.
- **KM Inteligente — linha inferior**: redistribuir a flex row para `flex-wrap` ou estrutura em duas linhas curtas quando necessário, garantindo que `pra cobrir todos os custos` apareça por inteiro. Estratégia: micro-texto vira segunda linha discreta abaixo do "X km rodados" se a primeira linha já ocupar a largura disponível.
- **Eyebrows**: adicionar `min-w-0` onde necessário e remover `truncate` de spans que precisam ser lidos por completo.
- Revisão geral nos três cards desta sprint: nenhum `truncate`/`overflow-hidden` em texto informativo.

---

### Arquivos tocados

- `src/pages/Dashboard.tsx` — todos os itens (renderização dos blocos goal/smartKm/stats, eyebrow agrupador no loop de render, helper `rpkStatus` inline).
- `src/index.css` — adicionar `animate-breath-soft` (ou ajustar `animate-breath` se compartilhado em outros lugares; verificar antes — se houver outros usos, criar variante nova).
- `src/lib/stats.ts` — encurtar `periodGoal.title` para evitar truncamento.

Nada em `planningEngine`, DataContext, queries, hooks, Admin ou outras telas.

### Verificação

Playwright em viewport 360×800 com sessão restaurada:
1. Visão Hoje com meta batida → screenshot confirma herói + eyebrow "Planejamento Inteligente" + Meta + KM + topo de Performance sem scroll.
2. Visão Semana → label "Meta líquida — semana" inteiro, sem reticências.
3. Forçar cenários `ok`/`warn`/`bad`/`none` (variando entradas) → checar cores correspondentes em ícone+barra do KM e em ícone+label+valor+mensagem da Performance; checar transição suave.
4. `prefers-reduced-motion: reduce` no contexto Playwright → confirmar que `Gauge` e número do R$/km mínimo não animam.
