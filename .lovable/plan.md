## Objetivo

1. Separar "Lançar registros" em duas tarefas independentes de Primeiros Passos: **Ganhos** e **Gastos**.
2. Adicionar tarefa nova: **Histórico** (visitar a tela pelo menos uma vez).
3. Reordenar Primeiros Passos para: Ganhos → Gastos → Histórico → Planejamento → Exportar → Personalizar.
4. Redesenhar dois tours interativos e detalhados que **guiam o usuário passo a passo pelas funções reais** do formulário (horas, KM, valores, adicionar plataforma, salvar, e interagir com o herói/seção "Por gastos" da Home).
5. Manter o visual atual (glow pulsante nos alvos dentro do drawer, spotlight nos alvos da Home) e garantir que o tooltip **nunca cubra** o campo que o usuário precisa preencher/ler.

Nenhuma tabela nova. Só colunas novas em `profiles` para os flags dos novos tours e da tarefa "Histórico".

---

## 1) Backend — migração leve

Uma migração adiciona ao `profiles`:

- `fs_history_visited boolean not null default false`
- `tour_earnings_seen boolean not null default false`
- `tour_expenses_seen boolean not null default false`
- `tour_history_seen boolean not null default false` (fica pronto pra Sprint futura)

Sem alterar RLS, GRANT ou policies — a tabela `profiles` já as tem.

Não removemos `tour_entries_seen` / `entries` do modelo lógico agora (evita quebrar reset antigo); apenas paramos de usar.

---

## 2) Primeiros Passos — nova estrutura

`src/lib/firstSteps.ts`:

- `FirstStepKey`: `"earnings" | "expenses" | "history" | "planning" | "export" | "personalize"`.
- `FirstStepTask` ganha novos `action`: `"startEarningsTour"`, `"startExpensesTour"`.
- `computeFirstSteps({ hasEarning, hasExpense, historyVisited, planningStatus, fsExported, fsPersonalized })` retorna, **nesta ordem**:

  1. **Aprender a registrar ganhos** — done quando `hasEarning === true`. Action: `startEarningsTour`.
  2. **Aprender a registrar gastos** — done quando `hasExpense === true`. Action: `startExpensesTour`.
  3. **Aprender sobre o histórico** — done quando `fs_history_visited === true`. Rota: `/historico`.
  4. **Montar seu Planejamento Inteligente** — done quando `planningStatus === "configured"`. Rota: `/ajustes/planejamento`.
  5. **Exportar um relatório** — done quando `fs_exported === true`. Rota: `/relatorios`.
  6. **Personalizar a Home** — done quando `fs_personalized === true`. Rota: `/ajustes/personalizacao/cards`.

`src/hooks/useFirstSteps.ts`:

- Passa a ler também `fs_history_visited` e a expor `markHistoryVisited`.
- Recalcula `hasEarning`/`hasExpense` a partir de `entries`.
- Mantém o `CustomEvent("volant:first-steps-changed")` pra sincronizar entre telas.

`src/components/firstSteps/FirstStepsSheet.tsx`:

- Ao clicar numa task pendente, além de rota/`openEntryDrawer`, trata `action === "startEarningsTour" | "startExpensesTour"`: fecha o sheet, navega pra `/app` (se necessário) e chama `startTour("earnings", …)` / `startTour("expenses", …)` do `useTour`.

`src/pages/History.tsx`:

- Em `useEffect` de montagem, chama `markHistoryVisited()` (idempotente — só grava se ainda `false`).

`src/pages/Settings.tsx`:

- Botão "Usuário novo (reset)" passa a limpar também:
  - `fs_history_visited: false`
  - `tour_earnings_seen: false`, `tour_expenses_seen: false`, `tour_history_seen: false`
  - Mantém os flags antigos por retrocompatibilidade.

---

## 3) Motor do tour

`src/context/TourContext.tsx`:

- `TourId` expande para: `"earnings" | "expenses" | "history" | "planning" | "personalize" | "export"` (mantém `entries` como alias temporário pra não quebrar imports).
- `flagColumnFor` mapeia corretamente para as novas colunas.
- Cache inicial de flags inclui as novas colunas.
- Sem mudança na assinatura de `startTour` / `notifyAction` / `next` / `skip`.

`src/components/tour/TourOverlay.tsx`:

- **Anti-sobreposição**: quando `mode === "glow"` (alvo dentro do drawer), o Popover já usa `collisionPadding` — reforçamos usando `placement: step.placement ?? "bottom"` e `sideOffset={14}` pra o tooltip sempre ficar acima ou abaixo do campo, nunca por cima. Se o alvo for um input alto (horas, KM), forçamos `placement="bottom"` nos steps do script.
- Adicionamos um botão "Voltar" discreto (só aparece quando `currentStepIndex > 0` e o step anterior era `advance: "next"` — evita voltar por cima de ações já cumpridas).
- Mantém o `tour-glow-pulse` já existente no `index.css`.

---

## 4) Tour de **Ganhos** (`src/lib/tours/earningsTour.ts`)

9 passos, todos com placement calibrado pra não cobrir o campo:

1. **Home / FAB** — alvo `[data-tour="fab-new-entry"]`, spotlight. "Bora registrar seu primeiro ganho — toca no +". `advance: action / open-fab-menu`.
2. **Menu radial** — alvo `[data-tour="fab-earning"]`. "Escolhe Novo ganho". `advance: action / open-entry-drawer`.
3. **Horas trabalhadas** — alvo novo `[data-tour="entry-hours"]` (envolve o `HoursWheel`), glow, placement `bottom`. "Quantas horas você rodou hoje. Gira a roda e toque em Próximo." `advance: next`.
4. **KM do dia** — alvo novo `[data-tour="entry-km"]` (bloco que engloba o `Segmented` + `NumberField`), placement `bottom`. "Registra a quilometragem do dia — total ou início/fim." `advance: next`.
5. **Valores e corridas por app** — alvo já existente `[data-tour="entry-earning-value"]` (bloco de plataformas), placement `top`. "Preencha valor e corridas em cada app usado. Você pode somar quantos precisar." `advance: next`.
6. **Adicionar plataforma** — alvo novo `[data-tour="entry-add-platform"]` no `SelectTrigger` "Adicionar plataforma", placement `top`. "Rodou em outro app? Toca aqui pra somar (ou criar um novo)." `advance: next`.
7. **Salvar** — alvo `[data-tour="entry-save"]`, placement `top`. "Confere e toca em Salvar." `advance: action / saved-earning`.
8. **Herói da Home** — alvo `[data-tour="hero-metric"]` (o card do lucro líquido), spotlight, placement `bottom`. "Seu ganho já entrou aqui. Toca no chip pra alternar Bruto ↔ Líquido." `advance: action / toggle-hero`.
9. **Concluir** — sem target (mode `none`, tooltip central). "Prontinho! Você registrou seu ganho e viu o impacto na Home." `advance: next`.

Novos `data-tour` no `EntryDrawer.tsx`:
- `data-tour="entry-hours"` no wrapper do `HoursWheel`.
- `data-tour="entry-km"` no wrapper do bloco de quilometragem.
- `data-tour="entry-add-platform"` no `SelectTrigger` "Adicionar plataforma".

Novos `data-tour` no `Dashboard.tsx`:
- `data-tour="hero-metric"` no card do herói.
- `data-tour="hero-toggle"` no botão do chip Bruto/Líquido.
- Toggle dispara `notifyAction("toggle-hero")`.

---

## 5) Tour de **Gastos** (`src/lib/tours/expensesTour.ts`)

6 passos:

1. **Home / FAB** — `[data-tour="fab-new-entry"]`. "Agora um gasto." `advance: action / open-fab-menu`.
2. **Menu radial** — `[data-tour="fab-expense"]`. "Escolhe Novo gasto." `advance: action / open-entry-drawer`.
3. **Categoria** — alvo novo `[data-tour="entry-expense-category"]` no wrapper do `Select` de categoria, glow, placement `bottom`. "Escolhe a categoria (combustível, comida, manutenção…)." `advance: next`.
4. **Valor do gasto** — alvo já existente `[data-tour="entry-expense-value"]`, placement `top`. "Digita quanto saiu do bolso." `advance: next`.
5. **Salvar** — `[data-tour="entry-save"]`. "Toca em Salvar pra manter seu lucro real certinho." `advance: action / saved-expense`.
6. **Por gastos na Home** — alvo novo `[data-tour="home-expenses-section"]` (envolve a seção "Por gastos"), spotlight, placement `top`. "Seu gasto entrou aqui — vê como fica distribuído por categoria." `advance: next`.

Novos `data-tour` no `EntryDrawer.tsx`:
- `data-tour="entry-expense-category"` no wrapper do `Select` de categoria.

Novos `data-tour` no `Dashboard.tsx`:
- `data-tour="home-expenses-section"` no bloco "Por gastos" (seção `byExpense`).

---

## 6) Disparo automático dos tours

`src/pages/Dashboard.tsx`:

- Substitui o único gatilho de `entriesTourSteps` por uma cascata:
  - Se **ganhos** ainda não foi visto E a tarefa está pendente → `startTour("earnings", earningsTourSteps)` depois de 800ms.
  - Senão, se **gastos** ainda não foi visto E pendente → `startTour("expenses", expensesTourSteps)`.
- Só um tour ativo por vez (o `TourContext` já bloqueia).
- Também aceita disparo manual via `FirstStepsSheet` (clique em tarefa).

---

## 7) Verificação após implementação

- Reset "Usuário novo" → recarrega → aparece tour de Ganhos na Home.
- Cumprir o tour de Ganhos até o passo 8 (toggle hero) → passo 9 aparece central → concluir → tour de Gastos dispara na próxima renderização.
- Visitar `/historico` marca a task Histórico como feita e sincroniza entre telas.
- Nenhum tooltip cobre input de horas, KM, valor ou botão Salvar (testar em viewport 375×812).
- Build passa; sem regressão em `entriesTour.ts` (mantido só como shim que re-exporta `earningsTourSteps` pra evitar quebra de import antigo).
