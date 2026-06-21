## Sprint 4 — Refino: KM Inteligente, Redundância de Período e Header/Filtros

Sprint puramente visual sobre o que já foi entregue na Sprint 3. Nada de `planningEngine`, DataContext, queries, hooks de DnD, AuthContext, Admin, Ganhos, Gastos, Jornada.

---

### Item 1 — Card KM Inteligente (`src/pages/Dashboard.tsx`, linhas 595-633)

**1a. Linha inferior (`lines 620-628`)**

Trocar a estrutura atual (`{num(kmDriven,0)} km rodados · pra cobrir todos os custos` + `%` solto) por padrão "atual/meta" espelhando o card de Meta:

- Esquerda: `{num(kmDriven, 0)} km` em `font-bold text-foreground tabular-nums`, seguido de `<span class="mx-1 text-muted-foreground/60">/</span>` (ou `· Meta`) e `{num(kmRequired, 0)} km` em `text-muted-foreground tabular-nums`. Formato final: `320 km · Meta 150 km`.
- Direita: percentual mantido, sem badge colorida nem texto de alerta. Quando `kmDriven > kmRequired`, o valor pode passar de 100% (ex.: `213%`) — usa a cor de status já existente (`rpkStatusTextClass`), sem mudança extra.
- Remover por completo o trecho `· pra cobrir todos os custos`. Sem realocação — informação já está implícita no label "R$/km mínimo pra aceitar corrida".
- Manter o `Progress` acima (linhas 616-619) e o `ring-1` discreto de excesso intactos.

**1b. Alinhamento do ícone (`linha 603`)**

Trocar `items-start` por `items-center` no `<div class="flex items-start gap-2">`, e remover o `mt-0.5` do `Gauge` (linha 604) e o `mt-1` do `ChevronRight` (linha 612). Resultado: ícone, label, valor e chevron na mesma baseline vertical, igual ao card de Meta (linhas 430-454).

### Item 2 — Remover período do título (`src/lib/stats.ts`)

No `goalForPeriod`, encurtar todos os títulos:

- `Meta {kind} — hoje` → `Meta {kind}`
- `Meta {kind} — semana` → `Meta {kind}`
- `Meta {kind} — mês` → `Meta {kind}`
- `Meta {kind} — período` → `Meta {kind}`

Resultado: sempre `Meta líquida` ou `Meta bruta`, sem sufixo. O período fica a cargo do PeriodBar.

Card de KM (`Dashboard.tsx:605-607`) já não tem sufixo de período — mantém "R$/km mínimo pra aceitar corrida" como está. Nada a fazer.

### Item 3 — Header e filtros de período

**3a. Saudação compacta (`Dashboard.tsx:377-393`)**

Reduzir ~15% a altura do bloco `greeting`:

- Container: `pt-0.5 pb-1` → `pt-0 pb-0.5`.
- Título "Olá, {nome}": `text-[22px]` → `text-[19px]`, mantém `font-bold leading-tight`.
- Mensagem opcional: `mt-1 text-[13px]` → `mt-0.5 text-[12px]`.
- Data contextual: `mt-0.5 text-[12px]` → `mt-0 text-[11px]`.

Específico da Home; nenhum outro arquivo afetado por este item.

**3b/3c/3d. Filtros de período — alinhamento, tamanho, altura e trilho**

Aplicar em todos os locais que usam o padrão de tabs flat (Home `PeriodBar`, Reports `Segmented tone="flat"`, History `Segmented tone="flat"`, OrganizacaoCards `Segmented`):

1. **`PeriodBar` (`Dashboard.tsx:1141-1186`)** — único caso de componente local:
   - Wrapper: `flex w-full items-stretch gap-1 bg-transparent` → `flex w-full items-stretch justify-start gap-3 border-b border-border/30`.
   - Tabs (`linha 1146-1163`): trocar `flex-1` por `shrink-0`; padding `py-2` → `py-1.5`; texto `text-sm` → `text-[15px]`; aumentar a área de toque com `px-1`. Resultado: tabs alinhados à esquerda (mesma margem `px-4` do container pai), maiores, ocupando largura natural sem vazio à esquerda.
   - Underline: `after:bottom-0.5` → `after:-bottom-px` para o traço ativo se apoiar sobre o `border-b` do grupo. `after:w-8` → `after:w-full` (underline acompanha o tab inteiro, padrão de tab bar).
   - Botão de calendário (`linha 1166-1184`): empurrar para a direita com `ml-auto`; manter `w-11`, `py-1.5`.

2. **`Segmented tone="flat"` (`src/components/Segmented.tsx`)** — atualização compartilhada do tone `flat`:
   - `trackClass` flat (`linha 41-42`): `bg-transparent p-0 gap-1` → `bg-transparent p-0 gap-3 border-b border-border/30 justify-start`.
   - Botão (`linha 84-87`): no caso flat, trocar `flex-1` por `shrink-0` e ajustar `sizeClass` md para `py-1.5 text-[15px]`; sm permanece como hoje (usado em History/Reports — tamanho já confortável).
   - `activeClass` flat (`linha 60-61`): underline `after:bottom-0.5 after:w-8` → `after:-bottom-px after:w-full`, ancorando o underline no novo trilho.
   - Os tones `default` e `contextual` permanecem inalterados (não usados em filtros de período).

3. **Reports (`src/pages/Reports.tsx:1061-1072`)** — já usa `tone="flat" size="sm"`; recebe automaticamente o trilho + alinhamento à esquerda da mudança no `Segmented`. Remover `className="flex-1"` (não cabe mais com `shrink-0` interno) para deixar o grupo no fluxo natural. O `Download` à direita continua via `flex items-center gap-2` no pai.
4. **History (`src/pages/History.tsx:227`)** — recebe a mudança automaticamente do `Segmented`. Nada a editar localmente.
5. **OrganizacaoCards (`src/pages/OrganizacaoCards.tsx:72`)** — usa `Segmented` (provável `tone="default"`). Confirmar tone; se for `flat`, herda; se for `default`, não é filtro de período/abas equivalentes e fica fora do escopo desta sprint (não foi pedido alterar tons não-flat). Verificar no momento da execução.

**Observação:** `VehicleCostsSection` usa `Segmented` para tipo de custo (fixo/variável), não é filtro de período — fora do escopo.

### Item 4 — Card de Jornada idle (`src/components/JourneyModule.tsx`)

Estado idle (linha 138-175): reduzir altura do card sem perder área de toque.

- `py-6` → `py-4` (de 24px para 16px de padding vertical). Isso reduz a altura total significativamente mantendo o ícone Play confortavelmente centralizado e a área de toque acima de 56px efetivos (considerando borda + padding + conteúdo).
- Largura `w-full` inalterada. Borda pulsante (`animate-breath`, `pulseBorder`) e cores por modo (`playColor`, `bg-card`, `bg-muted/20` no folga) preservados.
- `ChevronRight` posicionado igual (`absolute right-4 top-1/2 -translate-y-1/2`).

### Item 5 — Card "Ganhos e Gastos" (`src/pages/Dashboard.tsx`)

Ajustes de respiro na área unificada `byApp` + `byExpense` (linhas 638-724):

1. Espaço entre blocos: quando `insideUnified === true`, o elemento `<span>` de separação vertical (h-px gradiente) que separa a lista de apps da lista de gastos tem `mt-4 mb-4` hoje; reduzir para `mt-2.5 mb-2.5` — respiro mais enxuto.
2. Barras de progresso (linhas 661, 717): `h-2` → `h-[7px]` (~15% mais finas, ainda visíveis e legíveis). Manter cores, `rounded-full` e posicionamento absoluto.
3. Micro-labels "Por app" / "Por gastos" (linhas 642, 690) inalterados. Badges de plataforma/categoria, cores, valores à direita, tudo inalterado.

---

### Arquivos tocados

- `src/pages/Dashboard.tsx` — Itens 1a, 1b (card KM), 3a (greeting), 3b/3c/3d (PeriodBar), Item 5 (respiro Ganhos e Gastos + barras finas).
- `src/components/Segmented.tsx` — Item 3b/3c/3d para tone `flat` (propagação para Reports + History).
- `src/lib/stats.ts` — Item 2 (titles sem sufixo de período).
- `src/components/JourneyModule.tsx` — Item 4 (padding idle reduzido).

### Não tocados

`planningEngine`, DataContext, queries Supabase, hooks de DnD, AuthContext, herói, Jornada (estados ativo/descanso/encerrado), Histórico (lógica de filtros/grupos), Ajustes, Admin, Sprint 3 (eyebrow, conexão de cor de status, animação, mensagem comparativa na Performance).

### Verificação

Playwright em 360×800:
1. Home com meta batida: greeting compacto, eyebrow "Planejamento Inteligente" + Meta + KM + topo de Performance sem scroll.
2. Card KM: linha "X km · Meta Y km" + percentual, sem "pra cobrir todos os custos", ícone alinhado com label.
3. Trocar período Hoje/Semana/Mês/Custom: título da Meta continua "Meta líquida" (sem sufixo); nenhuma quebra de linha.
4. Filtros: tabs encostados na margem esquerda (alinhados com cards), maiores, altura menor, linha sutil border-b atravessando todo o grupo, underline ativo apoiado no trilho.
5. Jornada idle: card mais enxuto verticalmente, ícone Play centrado, área de toque confortável.
6. Ganhos e Gastos: respiro entre blocos reduzido, barras de progresso finas, labels e valores legíveis.
7. Repetir verificação visual em /relatorios e /historico — mesmo trilho e alinhamento de tabs.
