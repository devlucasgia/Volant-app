
## Objetivo

Ao abrir o calendário do filtro "Selecionar período" (na **Home** e em **Relatórios**), o motorista deve identificar imediatamente quais dias trabalhou, quanto lucrou, quais faltaram ao plano e quais foram folga programada — sem precisar fechar o calendário para consultar o histórico.

## Onde aplica

- **Home** (`src/pages/Dashboard.tsx`, popover "Selecionar período") — versão completa, com semântica de plano (folga/falta).
- **Relatórios** (`src/pages/Reports.tsx`, popover "Selecionar período") — mesma linguagem visual, **sem** folga/falta (Relatórios não interpreta plano).

Não mexemos no calendário de Planejamento (`CalendarGrid.tsx`) — ele tem outra função (seleção de dias planejados) e já tem sua própria linguagem visual.

## Design das células (dia trabalhado)

Layout dentro de cada célula:

```text
┌──────────┐
│    15    │   ← número do dia (mantém tamanho atual)
│  R$ 342  │   ← valor pequeno (10px), tabular-nums, sem "R$" se não couber
└──────────┘
```

Estados visuais:

| Estado | Visual | Aplica em |
|---|---|---|
| **Trabalhado com lucro** | Glow verde sutil (`ring-1 ring-success/40 bg-success/8`) + valor líquido embaixo em `text-success` | Home + Relatórios |
| **Trabalhado com prejuízo** | Glow vermelho (`ring-1 ring-destructive/40`) + valor negativo em `text-destructive` | Home + Relatórios |
| **Falta no plano** (dia planejado sem registro, já passado) | Borda pontilhada vermelha sutil (`border-destructive/50 border-dashed`), sem valor | **Home only** |
| **Folga programada** (não estava no plano, já passado) | Cinza neutro + label "folga" em 9px `text-muted-foreground/60` embaixo | **Home only** |
| **Dia futuro / sem plano** | Sem alteração (comportamento atual) | Ambos |
| **Selecionado no range** | Overlay do range preserva (fica por cima do estado do dia) | Ambos |

Para caber o valor, altura das células passa de `h-9 w-9` (36px) para `h-11 w-9` (44×36) — largura preservada, altura +8px. Testado mentalmente: 7 colunas × 44px = ~330px, cabe em mobile.

## Implementação técnica

### 1) Novo helper `src/lib/calendarDayStats.ts`
- Função `buildDailyStats(entries, monthRef)` → `Map<isoDate, { net: number, gross: number, hasEntries: boolean }>` para o mês visível.
- Função `classifyDay(iso, stats, plannedDates?, today)` → `"work-profit" | "work-loss" | "miss" | "off" | "future" | "none"`.
- Isolar aqui evita duplicar lógica entre Home e Relatórios.

### 2) Novo componente `src/components/ui/EnrichedCalendar.tsx`
- Wrapper fino do `Calendar` (shadcn) que aceita props extras: `dailyStats`, `plannedDates?`, `showPlanSemantics?: boolean`, `goalType: "liquido" | "bruto"`.
- Usa o slot `components={{ Day: CustomDay }}` do react-day-picker para renderizar cada célula:
  - Mantém `onClick`/`aria-selected`/`selected` originais (passa `day-picker` props via `...props`).
  - Adiciona o valor abaixo do número (formato: `< 1000 → "342"`, `>= 1000 → "1,2k"`), cor por tipo.
  - Aplica classes de estado condicionais (glow/borda).
- Ajusta `classNames.day`, `classNames.cell` para `h-11` e `flex-col justify-center`.
- Preserva 100% do range-selection behavior — não reimplementa lógica de seleção.

### 3) Integração Home (`Dashboard.tsx`)
- Substitui o `<Calendar mode="range" ... />` do popover (~linha 868) por `<EnrichedCalendar mode="range" ... showPlanSemantics dailyStats={stats} plannedDates={settings.planningSelectedDates ?? []} goalType={settings.goalType} />`.
- Calcula `stats` com `useMemo` a partir de `entries` filtrado pelo mês exibido (`monthRef` do popover).
- **Não altera** filtros, cálculos, seleção de range, ou qualquer outra lógica.

### 4) Integração Relatórios (`Reports.tsx`)
- Substitui os dois `<Calendar>` do popover "Selecionar período" (~linhas 1111 e 1169) por `<EnrichedCalendar>` **sem** `showPlanSemantics` (não mostra folga/falta).
- Mesmo cálculo de stats via `useMemo`.

### 5) Métrica
- Segue `settings.goalType`: se `"liquido"` → mostra líquido (bruto − gastos); se `"bruto"` → mostra bruto. Cor verde/vermelho segue o sinal do valor exibido.

## O que NÃO muda

- Nenhum cálculo, filtro, agrupamento, timezone ou lógica de plano.
- `CalendarGrid.tsx` (Planejamento) permanece intocado.
- Nenhuma alteração em banco, hooks, contexto ou navegação.
- Comportamento de seleção de range, mês navegável, disabled dates: idênticos.

## Verificação pós-implementação

- Abrir "Selecionar período" na Home num mês com histórico misto → conferir glow verde em dias com lucro, valor legível, folga em cinza, falta com borda tracejada.
- Abrir o mesmo popover em Relatórios → conferir mesmos glows/valores mas sem folga/falta.
- Selecionar um range → seleção continua funcionando; overlay do range se sobrepõe corretamente.
- Testar em mobile (viewport 375px) → altura +8px por célula não causa overflow no popover.
- Alternar `goalType` bruto/líquido em Ajustes → valores nas células trocam corretamente.
- Mês sem nenhum registro → calendário aparece limpo (comportamento atual preservado).
