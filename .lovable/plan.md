
# Sprint — Tours interativos de Novo ganho e Novo gasto + reorganização dos Primeiros passos

Objetivo: o usuário aprende de fato o app, campo a campo, dentro do drawer, e vê o resultado aparecer na Home antes de terminar. Histórico entra como task nos Primeiros passos (o tour dele fica pra sprint futura).

---

## 1) Primeiros passos — nova estrutura

### Ordem final (6 tasks)

1. Aprender a registrar ganhos
2. Aprender a registrar gastos
3. Aprender sobre histórico
4. Montar seu Planejamento Inteligente
5. Exportar um relatório
6. Personalizar a Home

### Como cada task é considerada concluída

| Task | Regra |
|---|---|
| Ganho | tour `earnings` visto **ou** já existe entry `type=earning` |
| Gasto | tour `expenses` visto **ou** já existe entry `type=expense` |
| Histórico | usuário visitou `/historico` (nova flag `fs_history_visited`) |
| Planejamento | `settings.planningStatus === "configured"` (igual hoje) |
| Exportar | `fs_exported` (igual hoje) |
| Personalizar | `fs_personalized` (igual hoje) |

Isso separa ganho de gasto (hoje contam como uma coisa só) e garante que só clicar em "Salvar" durante o tour já marca a task, sem precisar de segunda passada.

### Migração banco (Lovable Cloud)

- Adicionar em `profiles`:
  - `fs_history_visited boolean default false`
  - `tour_earnings_seen boolean default false`
  - `tour_expenses_seen boolean default false`
  - `tour_history_seen boolean default false` (reservado; sem tour ainda)
- Manter `tour_entries_seen` (legado) — evita perder o estado de quem já viu o tour antigo.

---

## 2) Tour de Novo ganho (interativo, dentro do drawer)

Passos (o balão nunca cobre o campo — ancoragem `top` quando o campo está na metade de baixo, `bottom` quando está no topo do drawer):

1. **Home — FAB `+`** · glow no botão · avança quando abre menu radial.
2. **Menu radial — "Novo ganho"** · glow no chip · avança ao clicar (abre drawer).
3. **Horas trabalhadas** · balão "Comece pelas horas rodadas" · glow no `HoursWheel` · **Próximo**.
4. **Quilometragem** · balão "Agora o KM do dia — Total ou Inicial/Final" · glow no bloco de KM · **Próximo**.
5. **Valores e corridas** · balão "Digita quanto recebeu em cada app e o número de corridas" · glow no card da primeira plataforma · **Próximo**.
6. **Adicionar plataforma** · balão "Rodou em mais de um app? Toca aqui pra somar outra plataforma" · glow no botão "Adicionar plataforma" · **Próximo** (não obriga adicionar).
7. **Salvar** · balão "Tá pronto. Salva pra ver aparecer na Home" · glow no botão Salvar · avança ao salvar (`notifyAction("saved-earning")`).
8. **Home — Herói (Líquido/Bruto)** · com o drawer fechado, glow no valor do herói · balão "Seu ganho já entrou aqui. Toca em Bruto/Líquido pra alternar a visão" · avança ao tocar no toggle (`notifyAction("toggled-hero")`).
9. **Conclusão** · balão central "Prontinho! É assim que seus números crescem." · botão **Concluir**.

### Novos `data-tour` no EntryDrawer

- `entry-hours` → wrapper das horas (linhas 490-493)
- `entry-km` → wrapper do bloco KM (linhas 495-540)
- `entry-earning-value` (já existe) → reutilizado no passo 5
- `entry-add-platform` → `SelectTrigger` do "Adicionar plataforma" (linha 583)
- `entry-save` (já existe) → passo 7

### Novos `data-tour` na Home (`Dashboard.tsx`)

- `hero-metric` → card do valor herói (líquido/bruto)
- `hero-toggle` → botão que alterna Líquido↔Bruto (dispara `notifyAction("toggled-hero")`)

---

## 3) Tour de Novo gasto

1. **Home — FAB `+`** · glow · avança ao abrir menu.
2. **Menu — "Novo gasto"** · glow no chip vermelho · avança ao abrir drawer.
3. **Categoria de gasto** · balão "Escolhe a categoria — combustível, comida, manutenção…" · glow no Select de categoria · **Próximo**.
4. **Valor** · balão "Digita quanto saiu do bolso" · glow no card vermelho do valor · **Próximo**.
5. **Salvar** · glow no botão Salvar · avança ao salvar (`saved-expense`).
6. **Home — "Por gastos"** · glow na seção de gastos por categoria · balão "Teu gasto entrou aqui, agrupado por categoria" · **Concluir**.

### Novos `data-tour`

- `entry-expense-category` → wrapper do Select de categoria no drawer
- `entry-expense-value` (já existe) → passo 4
- `home-expenses-section` → container do card "Por Gastos" no Dashboard

---

## 4) Motor do tour — ajustes

Arquivo: `src/context/TourContext.tsx`

- Expandir `TourId`: `"earnings" | "expenses" | "planning" | "personalize" | "export" | "history"`.
- `flagColumnFor` mapeia:
  - earnings → `tour_earnings_seen`
  - expenses → `tour_expenses_seen`
  - history → `tour_history_seen` (só reservado)
  - planning, personalize, export → como hoje.
- Leitura defensiva de `tour_entries_seen`: se `true`, não roda earnings nem expenses (usuário antigo que já viu o tour unificado não é bombardeado).

Arquivo: `src/components/tour/TourOverlay.tsx` — sem mudança visual, três modos (spotlight/glow/none) permanecem.

---

## 5) Disparo dos tours na Home

Arquivo: `src/pages/Dashboard.tsx`

Substituir o disparo único de `entries` por lógica sequencial:

```text
se task "ganhos" pendente → dispara tour "earnings"
senão se task "gastos" pendente → dispara tour "expenses"
```

Delay de 800ms mantido. Só um tour por vez (guard `activeTour` já existe no context).

---

## 6) Continuidade após salvar (drawer → Home)

O tour não pode morrer quando o drawer fecha. Fluxo:

1. Usuário toca Salvar → drawer chama `notifyAction("saved-earning")` (já existe) → `onOpenChange(false)`.
2. O passo 7 é `advance: "action"` → context avança pro passo 8 automaticamente.
3. Passo 8 tem `target: '[data-tour="hero-metric"]'` na Home. O `useTargetRect` já faz polling por 3s — tempo de sobra pra Home reconciliar.
4. Passo 8 avança em `notifyAction("toggled-hero")`, disparado pelo botão de troca Líquido/Bruto (Dashboard).

Mesma mecânica pra gasto (passo 5 → 6, alvo `home-expenses-section`).

---

## 7) Task "Histórico" (sem tour ainda)

- Marca automática: no `mount` de `src/pages/History.tsx`, se `fs_history_visited === false`, faz update no `profiles` e dispara `volant:first-steps-changed`.
- No `FirstStepsSheet`, task com `route: "/historico"` (comportamento padrão já existe).

Nada de tour agora — sprint futura.

---

## 8) Reset de "Usuário novo (reset)"

Arquivo: `src/pages/Settings.tsx` — incluir as novas flags na limpeza:

- `tour_earnings_seen`, `tour_expenses_seen`, `tour_history_seen`, `fs_history_visited` → false/null.
- Manter `tour_entries_seen` no reset (limpa junto, pra QA voltar do zero).

---

## 9) Copy dos balões (PT-BR, curto, direto)

Tom Volant: informal-profissional, sem exclamação exagerada. Sempre 1 frase de contexto + 1 ação clara.

---

## 10) Critérios de validação

1. Reset "Usuário novo" → Home dispara tour de ganhos automaticamente.
2. Tour de ganhos: 9 passos, cada campo do drawer é destacado sem sobrepor input, e ao salvar o tour continua na Home mostrando o herói e o toggle.
3. Trocar Líquido↔Bruto avança o passo 8; "Concluir" fecha o tour.
4. Task "Ganho" marca concluída.
5. Novo disparo automático inicia tour de gastos (6 passos, mesma mecânica).
6. Task "Gasto" marca concluída após salvar.
7. Visitar `/historico` marca task "Histórico" (sem tour).
8. Primeiros passos exibe 6 tasks na ordem: Ganhos, Gastos, Histórico, Planejamento, Exportar, Personalização.
9. Balão nunca cobre o campo ativo em nenhum passo (verificar iPhone SE-width e Pixel-width).
10. `prefers-reduced-motion`: glow estático, sem pulse.
