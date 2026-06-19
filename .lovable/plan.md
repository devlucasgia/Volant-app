# Sprint A — Jornada + Correções Visuais (v2)

Escopo: `src/components/JourneyModule.tsx`, `src/pages/Dashboard.tsx`, `src/index.css`. Sem mexer em queries, DataContext, planningEngine, useHomeOrder, AuthContext ou outras telas.

## Item 1 — Card Jornada "não iniciada"

Em `JourneyModule.tsx`, no ramo `state === "idle"`:
- Trocar o `<section>` raiz por `<button type="button">` full-width clicável que chama `openGoal(false)`.
- Remover o botão "Iniciar" da direita.
- Conteúdo centralizado: ícone `Play` + "Iniciar jornada" / "Toque no card para iniciar".
- Chevron `›` discreto no canto direito.
- Borda animada por modo (`heroView`):
  - Líquido → `border-success/70`
  - Bruto → `border-[hsl(var(--goal-gross))]/70`
- Animação "breathing" via utilitário novo em `src/index.css`:
  ```css
  @keyframes breath { 0%,100% { opacity: 1 } 50% { opacity: .45 } }
  .animate-breath { animation: breath 2s ease-in-out infinite; }
  @media (prefers-reduced-motion: reduce) { .animate-breath { animation: none; } }
  ```
- `aria-label="Iniciar jornada"`.

## Item 2 — Estados "ativo" e "em descanso"

- Botão encerrar com ícone `Square` (lucide), `aria-label`, mantendo `AlertDialog` existente. Título: "Encerrar a jornada de hoje?" / botões "Cancelar" e "Encerrar".
- Reequilibrar layout: esquerda com dot + cronômetro + label compactos; direita agrupa Pausar/Retornar e Encerrar com `size="sm"` (mesma altura `h-9`) e `gap-2`. Trocar o `size="icon"` do encerrar por `size="sm"` para igualar peso visual.

## Item 3 — Modal Meta da Jornada (redesign)

- `goalValue` inicia `null` ao abrir (sem pré-preenchimento). Placeholder `R$ 0,00`.
- Chip clicável abaixo do campo:
  ```
  💡 Sugestão do Volant: R$ {suggestedDaily} — toque para usar
  ```
  Visual: `inline-flex rounded-full border border-success/40 bg-success/10 px-3 py-1.5 text-[12px] font-semibold text-success`. `onClick={() => setGoalValue(suggestedDaily)}`.
- Feedback condicional (com `min-h-[16px]` para evitar layout shift):
  - `> sugestão` → "Boa! Os próximos dias ficam mais tranquilos." (`text-success`).
  - `0 < valor < sugestão` → "Os próximos dias vão precisar compensar." (`text-warning`).
  - igual / vazio / zero → nada.
- Substituir `DrawerDescription`:
  > "Sua meta sugerida é calculada pelo Volant com base no que ainda falta pro mês. Você pode ajustar para hoje — se passar da sugestão, os próximos dias ficam mais leves. Se ficar abaixo, eles compensam."

## Item 4 — Lógica de dia de folga

### 4a. Override de sessão (sem mexer no planningEngine)

Flag local: `localStorage` chave `volant_folga_worked_${todayIso}` + custom event `volant:folgaWorkedChanged` (mesmo padrão de `volant:dayGoalChanged`).

Em `Dashboard.tsx`:
```ts
// Apontamento 1 — duas condições: flag local OU jornada já em andamento
const isFolgaTodayEffective =
  isFolgaToday && !folgaWorkedToday && timerState === "idle";
```
Substituir os usos de `isFolgaToday` que controlam UI da Home (card Meta, card KM Inteligente, card Jornada) por `isFolgaTodayEffective`. `isFolga` para dias passados permanece intacto.

### 4b. Card Jornada — visual de folga

Passar `isFolgaToday` como prop ao `JourneyModule`. Quando `isFolgaToday && state === "idle"`:
- Card clicável (mesmo padrão Item 1), sem borda pulsante e sem cor de modo.
- Borda `border-border`, bg `bg-muted/20`.
- Ícone `Coffee` no lugar do `Play`.
- "Dia de folga" / "Se quiser rodar hoje mesmo assim, toque aqui".

### 4c. Modal em dia de folga

Aviso no topo do drawer (antes do label "Meta (R$)"):
```tsx
<div className="mb-3 rounded-xl border border-warning/30 bg-warning/10 px-3 py-2 text-[12px] leading-snug text-warning">
  Hoje é dia de folga no seu planejamento. Se trabalhar, o que você ganhar vai aliviar as metas dos próximos dias.
</div>
```

Em `confirmGoalAndStart`, se `isFolgaToday`: setar `localStorage` e disparar `volant:folgaWorkedChanged` antes de `start()`.

### 4d. Card Meta — folga passada

Quando `isFolga && !isFolgaToday`: manter label "Dia de folga" + chip "Descanso" + texto "Este dia não está no seu planejamento." Ocultar `Progress` e linha de valor/total.

### 4e. Limpeza

Remover o chip antigo "Trabalhar hoje mesmo assim" do card de Meta (linhas 401-428 de Dashboard.tsx) — substituído integralmente pelo card de Jornada.

## Item 5 — KM Inteligente ajustes

No bloco `smartKm`:
- Remover `w-[88%] mx-auto` (em todos os três sub-estados); usar `w-full`.
- Layout label/valor:
  ```tsx
  <span className="text-[12px] text-muted-foreground">R$/km mínimo</span>
  <span className="text-muted-foreground/40">·</span>
  <span className="text-[17px] font-bold tabular-nums text-foreground">
    {brl(smartKmValue)}<span className="ml-0.5 text-[11px] font-normal text-muted-foreground">/km</span>
  </span>
  ```
- Não alterar lógica, navegação, nem tela de detalhe.

## Item 6 — Unificar "Por aplicativo" e "Por gastos"

Criar um node renderizado uma única vez no slot do **primeiro** entre `byApp` e `byExpense` na ordem do usuário (Apontamento 2):

```ts
const appsIdx = orderedKeys.indexOf("byApp");
const expIdx  = orderedKeys.indexOf("byExpense");
const bothVisible = widgets.byApp && widgets.byExpense;
const unifiedSlotKey =
  bothVisible
    ? (appsIdx >= 0 && expIdx >= 0
        ? (appsIdx < expIdx ? "byApp" : "byExpense")
        : "byApp")
    : null;
```

Render:
- Quando `bothVisible`: no slot `unifiedSlotKey` renderizar o card unificado; no slot do outro retornar `null`.
- Quando apenas um estiver visível: render isolado com o eyebrow original (comportamento atual).

Card unificado:
```tsx
<section key="appsExpenses">
  <div className="mb-2 flex items-center gap-2 px-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
    <ArrowLeftRight className="h-3.5 w-3.5" /> Ganhos e gastos
  </div>
  <div className="rounded-2xl border border-border bg-card p-4 space-y-4">
    {/* bloco apps — listagem atual intacta */}
    <div className="border-t border-border/30" />
    {/* bloco gastos — listagem atual intacta */}
  </div>
</section>
```

Sem mexer em `useHomeOrder`. Cálculos de barra/percentuais inalterados.

## Critérios de aceite

1. Card jornada idle: card inteiro clicável, conteúdo centralizado, sem botão separado, chevron à direita.
2. Borda pulsante respeita `prefers-reduced-motion`.
3. Encerrar com ícone `Square` + diálogo.
4. Modal: campo vazio, chip clicável, feedback condicional, texto reescrito.
5. Folga hoje: card neutro com ícone `Coffee`.
6. Modal em folga: aviso no topo.
7. Após iniciar em folga: Home volta ao estado de trabalho via flag local **ou** se a jornada já estiver rodando, sem alterar `planningSelectedDates`.
8. Folga passada: só label/texto, sem barra/valor.
9. KM Inteligente: largura full, separador `·`, número médio bold.
10. Card "Ganhos e gastos" unificado, posicionado no primeiro slot entre `byApp` e `byExpense` da ordem do usuário.

## Não altera

Queries Supabase, DataContext, summarize, useHomeOrder, planningEngine (cálculos), AuthContext, Performance, Relatórios, Histórico, Ajustes, Admin, tela de detalhe do KM Inteligente.
