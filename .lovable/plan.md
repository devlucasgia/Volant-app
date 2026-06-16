# Refatoração visual — Relatórios + Seletores globais

Mudanças exclusivamente de apresentação. Nenhuma query, contexto, lógica de drag-and-drop, persistência (`useReportOrder`/`useReportWidgets`) ou cálculo (`summarize`) é alterada.

## Bloco 1 — Segmented Control flat global

Arquivo: `src/components/Segmented.tsx`.

- Adicionar uma terceira variante `tone="flat"` (mantém `default` e `contextual` intactas para não impactar outras telas que dependem do verde, ex: hero da Home).
- `flat`:
  - Track: sem fundo, sem borda (`bg-transparent border-0 p-0 gap-1`).
  - Item inativo: `text-muted-foreground/60`, sem fundo.
  - Item ativo: `text-foreground` sólido + indicador sutil — `after:` underline de 2px com cor `bg-foreground/70` largura ~60% centralizada, e leve `bg-foreground/[0.04]` no item para evidenciar toque.
  - Sem ring, sem shadow, sem gradiente.
- Aplicar `tone="flat"` em todos os usos de navegação/filtro:
  - `src/pages/Reports.tsx` — Por mês / Por ano / Personalizado.
  - `src/pages/History.tsx` — Todos / Ganhos / Gastos e Hoje / Semana / Mês (todos os Segmented da tela).
  - `src/pages/Dashboard.tsx` — período (Hoje / Semana / Mês) e qualquer outro Segmented da Home.
  - `src/pages/OrganizacaoCards.tsx` — Tela inicial / Relatórios.
  - `src/components/vehicle/VehicleCostsSection.tsx` — caso seja seletor de filtro/categoria.
- Não tocar: botão "Iniciar" da Jornada, FABs, CTAs primários.

## Bloco 2 — Seletor de data do Relatório

Arquivo: `src/pages/Reports.tsx` (linhas 424–481).

- Trocar `variant="outline"` (que aplica borda) por uma classe flat nos botões "‹", "›", trigger do mês, trigger do ano (`SelectTrigger`) e botão de período personalizado:
  - `border-0 bg-transparent hover:bg-foreground/[0.04] text-foreground rounded-xl`.
  - Setas em `text-muted-foreground`.
  - Trigger central com label em `font-medium text-foreground` e ícone em `text-muted-foreground`.
- Garantir que o `SelectTrigger` do ano use override `border-0 bg-transparent` (a classe base do componente vem com `border border-input bg-background`).

## Bloco 3 — Herói do Relatório

`src/pages/Reports.tsx` — função `renderHero` (linhas 537–581).

- Remover o bloco do mini AreaChart (linhas 550–562) e os imports `Area, AreaChart, ResponsiveContainer` se ficarem sem uso após Bloco 4 (manter se ainda referenciados pelo gráfico principal).
- Hero permanece: eyebrow "LUCRO LÍQUIDO", valor `text-5xl/6xl`, linha "Bruto {valor} · Gastos {valor}".
- Para `grossExpenses`, manter como está (não tem sparkline).

## Bloco 4 — Gráfico interativo

`src/pages/Reports.tsx` — `renderChartBlock` (620–644) e `renderChart` (332–372).

- **Posição preservada**: continua sendo renderizado pela ordem do usuário (`reportOrder`), sem mudanças no walker (677–690).
- Substituir o `Select` (627–636) por uma linha horizontal de chips:
  - `div` com `flex gap-2 overflow-x-auto no-scrollbar -mx-1 px-1 snap-x` contendo botões para cada `CHARTS[i]`.
  - Chip: `rounded-full px-3.5 py-1.5 text-xs font-medium whitespace-nowrap snap-start`.
    - Ativo: `bg-success/15 text-success ring-1 ring-success/30`.
    - Inativo: `bg-foreground/[0.04] text-muted-foreground hover:text-foreground`.
  - Default `chart = "net"` (já é o estado inicial — `useState<ChartKey>("net")`).
- Reescrever `renderChart()` para AreaChart:
  - `AreaChart` com `margin={{ top: 8, right: 8, bottom: 0, left: 0 }}`.
  - `<defs>` com `linearGradient id="reportAreaFill"` de `hsl(var(--success))` 0.35 → 0.
  - `<Area type="monotone" dataKey={dataKey} stroke="hsl(var(--success))" strokeWidth={2} fill="url(#reportAreaFill)" dot={false} />`.
  - `XAxis dataKey="name"` com tick `fontSize: 10`, `axisLine={false}`, `tickLine={false}`, sem alterar formatos do `dailySeries` (já usa "dd/MM").
  - **Sem** `CartesianGrid` e **sem** `YAxis`.
  - `Tooltip` mantido com `tooltipStyle` e `formatter` por tipo (R$ para net/expenses, número para km/horas).
- Header do bloco: manter eyebrow "Visualização" + label `chartMeta.label`, com chips abaixo. Cor da label segue a métrica ativa (mantém comportamento).
- **Estado vazio**: se `dailySeries.every(d => !d[dataKey])` ou `dailySeries.length === 0`, renderizar no lugar do gráfico:
  - `<div className="h-64 flex items-center justify-center text-sm text-muted-foreground">Sem dados para este período.</div>`.

## Bloco 5 — Consolidação da lista (camada de apresentação)

`src/pages/Reports.tsx` — apenas dentro do IIFE de render (527–693). O array `reportOrder` e `widgets` permanece intacto na persistência.

Construir um set de chaves "absorvidas" para esconder cards autônomos quando duplicados em subtítulos:

```
const absorbed = new Set<ReportCardKey>();
if (heroKey === "net") absorbed.add("grossExpenses");
// kmGroup absorve "KM total" no sub de "R$ / km" — mas hoje KM total e R$/km estão
// dentro do mesmo kmGroup; o ajuste é apenas reescrever as labels/subtítulos:
//   - linha "R$ / km": sub = `${num(s.totalKm,0)} km rodados` e remover a linha "KM total".
//   - linha "R$ / corrida": sub = `${s.totalRides} corridas` e remover a linha "Corridas".
//   - linha "Média / dia": sub = `${workedDays} ativos` e remover a linha "Dias ativos".
```

Reescrever `rowsFor`:

- `net` → mantém uma linha "Lucro líquido" (usada quando `net` aparece mas NÃO é o herói).
- `grossExpenses` → se `heroKey === "net"`, retorna `[]` (não renderiza). Caso contrário, mantém duas linhas.
- `perHour` → mantém com sub `${num(s.totalHours,1)}h trabalhadas`.
- `kmGroup` → **uma única linha** "R$ / km", value `brl(s.perKm)`, sub `${num(s.totalKm,0)} km rodados` (omitir sub quando `s.totalKm === 0`).
- `tripsGroup` → **uma única linha** "R$ / corrida", value `brl(s.perRide)`, sub `${s.totalRides} corridas` (omitir sub quando `s.totalRides === 0`).
- `daysGroup` → **uma única linha** "Média / dia", value `brl(avgPerDay)`, sub `${workedDays} ativos` (omitir quando `workedDays === 0`).

Tratamento defensivo:

- Se um grupo retorna `[]`, o item é ignorado no walker (sem push em `rowGroup`).
- Keys do `.map()` derivadas de `r._key` (já é único por `${groupKey}-${idx}`), preservando estabilidade após o filtro.
- `flushRowGroup` ignora grupos vazios (já implícito pelo `flat.length === 0` que torna o container vazio — adicionar early return se `flat.length === 0`).

## Bloco 6 — Ícones monocromáticos

`rowsFor` em `src/pages/Reports.tsx`.

- Padronizar todos os ícones (`Wallet`, `Receipt`, `Gauge`, `Route`, `Flag`, `Clock`, `CalendarDays`) para `className="h-4 w-4 text-success/70"`.
- Pílula contêiner (`bg-muted/40`) pode permanecer ou ser ajustada para `bg-success/10` — manter `bg-muted/40` para neutralidade.
- Remover quaisquer cores específicas (`text-info`, `text-destructive`, `text-[hsl(265_85%_70%)]`) dos ícones da lista. O Hero mantém suas cores (verde/foreground) — não é afetado.

## Não alterar

- `useReportOrder`, `useReportWidgets`, `localStorage`, persistência.
- `OrganizacaoCards.tsx` (apenas o Segmented muda para `tone="flat"`).
- Cálculos em `src/lib/stats.ts`.
- Botão "Iniciar" (`JourneyModule`), FABs, CTAs.
- Posição do gráfico (continua respeitando `reportOrder`).

## Critérios de aceite

1. Todos os Segmented de navegação/filtro do app aparecem sem fundo/borda; o ativo tem só texto + underline sutil.
2. Seletor de data em Relatórios sem bordas; navegação ‹/› e label central com toque suave.
3. Hero sem mini-gráfico.
4. Gráfico exibe chips horizontais com scroll; AreaChart verde com gradiente, sem grid/YAxis; tooltip ativo; mensagem "Sem dados para este período." quando vazio; posição respeita Ajustes.
5. Quando o herói for "Lucro líquido", cards "Bruto" e "Gastos" não aparecem na lista.
6. Linhas "R$/km", "R$/corrida" e "Média/dia" exibem o subtítulo correto e os cards autônomos correspondentes não aparecem duplicados; se o usuário desativar o grupo, nada quebra.
7. Ícones da lista todos em verde com opacidade reduzida.
8. Reordenar/ocultar cards em Ajustes continua funcionando.
