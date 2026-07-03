
## Objetivo
Três correções no calendário enriquecido (drawer "Selecionar período") sem alterar cálculo nem regras de dados:

1. Refletir a lente em vigor (líquido/bruto) — hoje Home só usa `settings.goalType`, ignorando o toggle do herói; Relatórios idem.
2. Mostrar folgas do plano vigente também no futuro (mês em vigor).
3. Definir explicitamente o comportamento para quem não tem plano.

---

## 1) Cor por lente ativa

Nova prop em `EnrichedCalendar` e `classifyDay`:
- `valueMode: "net" | "gross"`.

Regras visuais:
- `valueMode = "net"` → verde para lucro, vermelho para prejuízo (comportamento atual).
- `valueMode = "gross"` → **azul** em todo dia com registro (bruto não tem prejuízo). Usa um novo estado `"work-gross"` com anel/valor em `text-primary` (azul do design system).

Wiring:
- `Dashboard.tsx`: passar `valueMode={heroView === "gross" ? "gross" : "net"}` no `EnrichedCalendar`.
- `Reports.tsx`: derivar da posição 0 de `reportOrder` — `valueMode = reportOrder[0] === "grossExpenses" ? "gross" : "net"`.
- Também usar esse `valueMode` para escolher `stat.gross` vs `stat.net` na formatação (hoje usa `goalType`).

## 2) Folgas do plano ativo no mês vigente (inclui futuras)

Ajuste em `classifyDay`:
- Se `showPlanSemantics` e o dia pertence ao **mês** do plano (mesmo `yyyy-MM` que qualquer data em `plannedSet`):
  - Dia **sem registro** e **fora** de `plannedSet` → `"off"` (rótulo "folga"), tanto para passado quanto futuro.
  - Dia **sem registro**, **passado** e **dentro** de `plannedSet` → `"miss"` (borda tracejada) — igual hoje.
  - Dia **sem registro**, **futuro** e **dentro** de `plannedSet` → `"future"` (célula neutra) — igual hoje.
- Meses que não pertencem ao plano continuam sem semântica de plano (só fatos).

Wiring:
- `Dashboard.tsx`: reativar `plannedDates={settings.planningSelectedDates ?? []}` e `showPlanSemantics` no `EnrichedCalendar` do drawer da Home.
- `Reports.tsx`: manter `showPlanSemantics` também ligado, pelas mesmas regras (só afeta o mês do plano).

## 3) Usuário sem plano

Regra explícita e documentada no `calendarDayStats.ts`:
- Sem plano ativo → `plannedSet` vazio → semântica de plano não dispara → o calendário mostra **apenas** dias com registro (ganho/prejuízo) e o restante permanece neutro (nem "folga", nem "miss"). É o comportamento desejado.
- Adicionar comentário curto no topo do arquivo para deixar essa contrato claro.

---

## Detalhes técnicos

Arquivos alterados:
- `src/lib/calendarDayStats.ts`
  - `ClassifyOpts` ganha `valueMode: "net" | "gross"` (opcional; default `"net"` p/ compat).
  - Novo `DayClass = "work-gross"` além dos existentes.
  - Lógica de `classifyDay`:
    - Se `valueMode === "gross"` e `stat.hasEarnings` → `"work-gross"`.
    - Se `valueMode === "net"` e tem registro → `"work-profit"` / `"work-loss"` como hoje.
    - Semântica de plano ampliada conforme item 2.
- `src/components/ui/EnrichedCalendar.tsx`
  - Prop `valueMode` (default `"net"`), removido acoplamento de cor ao `goalType`.
  - Novo `stateClass` e cor do label para `"work-gross"` usando `text-primary` / `ring-primary/40` / `bg-primary/[0.08]`.
  - Seleção de `value` = `stat.gross` quando `valueMode="gross"`, senão `stat.net`.
- `src/pages/Dashboard.tsx`
  - Passar `valueMode`, `plannedDates`, `showPlanSemantics` corretamente.
- `src/pages/Reports.tsx`
  - Passar `valueMode` derivado do herói (`reportOrder[0]`), `plannedDates`, `showPlanSemantics`.

Sem mudanças em: dados, cálculos, filtros, tabelas, RLS, planejamento, seleção de intervalo.

## Verificação manual sugerida
- Home com herói Líquido → valores verdes/vermelhos.
- Home com herói Bruto → valores azuis.
- Relatórios com herói Líquido → verde/vermelho; trocar herói para Bruto → azul.
- Mês do plano ativo: dias futuros não planejados aparecem como "folga".
- Meses anteriores ao plano: só registros; sem "folga".
- Usuário sem plano: só registros; sem "folga" ou "miss".
