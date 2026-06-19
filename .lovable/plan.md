## Sprint — Correções Pós Sprint A + Fix Relatórios

Alterações pontuais em três arquivos: `src/pages/Dashboard.tsx`, `src/components/JourneyModule.tsx` e `src/pages/Reports.tsx`. Sem mexer em queries, contextos, planningEngine, useHomeOrder, cálculos ou demais telas.

---

### Item 1 — KM Inteligente: linha única com km restantes

**Arquivo:** `src/pages/Dashboard.tsx` (bloco `smartKm`, ~linhas 547-553)

Adicionar terceiro elemento na linha, lendo `plan.remainingPlannedKm` (mesmo dado já calculado pelo planningEngine, sem novo cálculo):

```
⚡ R$/km mínimo  ·  R$ 1,46 /km  ·  2.985 km restantes  ›
```

Estrutura:
- "R$/km mínimo" → `text-[12px] text-muted-foreground` (mantido)
- `·` separador → `text-muted-foreground/40`
- "R$ 1,46 /km" → `text-[17px] font-bold tabular-nums` (mantido)
- `·` separador → `text-muted-foreground/40`
- "X km restantes" → `text-[12px] text-muted-foreground tabular-nums` (formato `num(remainingPlannedKm, 0)`)
- `›` à direita (mantido)

Renderiza o terceiro elemento somente quando `plan.remainingPlannedKm > 0`. Em telas estreitas o flex já gerencia overflow do bloco central.

---

### Item 2 — KM Inteligente: ocultar em folga passada

**Arquivo:** `src/pages/Dashboard.tsx` (bloco `smartKm`, início ~linha 483)

Adicionar guarda no topo do bloco `smartKm`: se `isFolga && !isFolgaToday`, retornar `null` (mesmo critério já usado no card de Meta para folga passada). Não altera o comportamento de folga de hoje (`isFolgaTodayEffective`) já existente.

---

### Item 3 — Card Jornada idle: centralizar conteúdo

**Arquivo:** `src/components/JourneyModule.tsx` (botão idle)

Hoje o botão usa um `<span>` spacer de 16px à esquerda + bloco central `flex-1 justify-center` + chevron de 16px à direita. A simetria de spacers deveria centralizar, mas o conteúdo parece deslocado. Corrigir trocando para layout absoluto:

- Botão: `relative flex items-center justify-center` (sem `justify-between`)
- Remover o spacer esquerdo
- Bloco central: `flex items-center gap-3` (sem `flex-1`, conteúdo se centraliza naturalmente no flex parent)
- Chevron: `absolute right-4 top-1/2 -translate-y-1/2`

Garante centralização horizontal real do ícone + textos; chevron permanece ancorado à direita sem afetar o cálculo de centro.

---

### Item 4 — Modal Meta da Jornada: estabilizar abertura

**Arquivo:** `src/components/JourneyModule.tsx` (`renderGoalDrawer`)

Adicionar altura mínima e scroll no `DrawerContent`:
- `DrawerContent className="min-h-[60vh] max-h-[92vh]"`
- Wrapper interno `mx-auto w-full max-w-md` → adicionar `flex flex-col` e `overflow-y-auto` no bloco do conteúdo (entre header e footer), garantindo que o chip de sugestão e os botões "Cancelar" / "Iniciar jornada" fiquem sempre visíveis mesmo com teclado virtual aberto.

Sem alterar conteúdo, textos ou lógica do modal.

---

### Item 5 — Ganhos e Gastos: micro-labels por bloco

**Arquivo:** `src/pages/Dashboard.tsx` (~linhas 562-654 — blocos `byApp` e `byExpense`)

Quando os blocos renderizam dentro do card unificado (`widgets.byApp && widgets.byExpense`), adicionar no topo de cada `block` (antes do conteúdo) um micro-label:

```tsx
<div className="mb-2 text-[10px] font-medium text-muted-foreground">Por app</div>
```

e equivalente "Por gastos" no bloco de gastos. Renderizar somente quando estiverem dentro do unificado (i.e. quando o outro também está visível) — quando isolados, o eyebrow externo já identifica.

---

### Item 6 — Ganhos e Gastos: divisória no estado vazio

**Arquivo:** `src/pages/Dashboard.tsx` (~linha 977, render do card unificado)

A divisória `<div className="border-t border-border/30" />` deve aparecer somente quando pelo menos um bloco tem dados. Quando `activeApps.length === 0 && activeExp.length === 0`, omitir a divisória — os dois textos "Nenhum registro" ficam empilhados sem separador.

Calcular `bothEmpty = activeApps.length === 0 && activeExp.length === 0` e renderizar a divisória condicionalmente.

---

### Item 7 — Relatórios: corrigir capitalização da data

**Arquivo:** `src/pages/Reports.tsx` (linha 1107)

`format(monthRef, "MMMM 'de' yyyy", { locale: ptBR })` retorna "junho de 2026" em minúsculo. A classe `capitalize` do Tailwind está forçando "Junho De 2026" (Title Case word-by-word).

Solução: remover a classe `capitalize` do `<span>` na linha 1107. Resultado: "junho de 2026". As demais formatações da tela (`yyyy`, `dd/MM/yy`) não exibem mês textual, então não precisam de ajuste.

---

### Critérios de aceite

1. KM Inteligente exibe `R$/km mínimo · R$ X,XX /km · N km restantes ›`.
2. KM Inteligente não renderiza em dia de folga passado.
3. Conteúdo do card Jornada idle visualmente centralizado; chevron à direita.
4. Modal de Meta abre com `min-h-[60vh]`; botões sempre acessíveis com teclado aberto.
5. Micro-labels "Por app" e "Por gastos" presentes dentro do card unificado.
6. Divisória interna some quando ambos blocos vazios.
7. Cabeçalho mensal dos Relatórios em minúsculo: "junho de 2026".

### Não altera

Queries Supabase, DataContext, summarize, useHomeOrder, planningEngine (cálculos), AuthContext, lógica de folga (Sprint A), JourneyModule em estados ativo/descanso/encerrado, cálculos do smartRpk, tela de detalhe do KM Inteligente, Histórico, Ajustes, Admin.
