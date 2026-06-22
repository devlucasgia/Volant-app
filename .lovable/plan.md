# Sprint D.2 — Correções De/Para + Insights v2 + Alerta de Viabilidade

Executar exatamente as 7 mudanças do brief, com **duas alterações** vs. a versão anterior do plano: o conteúdo de `planningInsights.ts` vem do arquivo enviado `volant-planningInsights-v2.ts` (não do banco de frases descrito no brief), e a chamada de `computePlanningInsights` no `PainelResumo` passa `currentKm: s.currentKm`. Nenhuma outra alteração silenciosa.

## Arquivos

### 1. `src/components/planejamento/PainelResumo.tsx`
- **M1 — Timeline (linhas 44–101):** trocar `((diaAtual - 1) / diasNoMes)` por progresso de dias do plano:
  ```ts
  const planDaysTotal = s.hasOriginalPlan ? s.originalDaysCount : s.selectedWorkdaysCount;
  const timelinePct = planDaysTotal > 0
    ? Math.min(100, (daysWorkedThisMonth / planDaysTotal) * 100)
    : 0;
  ```
  JSX: à esquerda `{daysWorkedThisMonth} de {planDaysTotal} dias`; à direita mantém `{remainingWorkdaysCount} dia(s) restante(s)`. Remover `diaAtual`/`diasNoMes` se ficarem órfãos.
- **M2a:** remover `<BookMarked />` do label "Plano de {mesLabel}" (linha 172). Remover `BookMarked` do import se ficar órfão.
- **M2b:** remover o `<p>` "Gravado no início do plano · não muda com Ajustes" (linhas 200–202).
- **M2c — Card esquerdo:** `border-dashed border-border/30 bg-muted/[0.06] p-3.5`; `dimClass = "text-muted-foreground/60 font-normal"`.
- **M2d — Card direito:** `border-primary/30 bg-primary/[0.05] p-3.5`; "Já fiz" usa `text-primary font-bold text-[15px]`; "Dias rodados" e "KM rodado" usam `text-foreground font-semibold` via `valueClass`; "R$/km atual" mantém `rpkColor`.
- **M3 — Herói META:** envolver número em `flex items-baseline gap-1` com `<span>` "R$" pequeno (`text-lg text-emerald-200/70 font-semibold self-end mb-0.5`) e número via `fmtBRL(...).replace("R$","").trim()`, mantendo gradiente atual.
- **M4 — Insights:** importar `computePlanningInsights` de `@/lib/planningInsights`. Após dados derivados:
  ```ts
  const insights = computePlanningInsights({
    rpkAtual,
    rpkMinimo: s.requiredRpk,
    homeRemainingGross: s.homeRemainingGross,
    homeDailyGross: s.homeDailyGross,
    remainingWorkdaysCount: s.remainingWorkdaysCount,
    currentGross: s.currentGross,
    homeGrossTarget: s.homeGrossTarget,
    daysWorkedThisMonth,
    selectedWorkdaysCount: s.selectedWorkdaysCount,
    currentKm: s.currentKm, // ← adicionado conforme pedido
  });
  ```
  Substituir o placeholder (linhas 152–160) por: cabeçalho "Insights inteligentes" + até 2 cards (ícone + texto, cor por `tone` → `good`=primary, `warn`=amber, `bad`=rose, `info`=muted). Fallback "Registre seus primeiros dados pra ver insights do seu plano." quando `insights.length === 0`.

### 2. `src/pages/PlanejamentoInteligente.tsx` — M5
Substituir o `AlertDialogContent` do Refazer:
- Título: "Refazer o planejamento?"
- Parágrafo 1 (com destaque destrutivo em "substituir seu plano atual de {mesAtual}…").
- Parágrafo 2: registros não são afetados; plano atual vale até concluir o novo.
- `AlertDialogCancel` = "Manter plano atual" (botão primário).
- `AlertDialogAction` = "Sim, refazer" com `bg-destructive text-destructive-foreground hover:bg-destructive/90`.
- Adicionar `const mesAtual = new Date().toLocaleDateString("pt-BR", { month: "long" });`.

### 3. `src/components/planejamento/GuidedFlow.tsx` — M6
Após o card "COM SUA ROTINA PLANEJADA" (depois da linha 615) e antes do `<p>` final, adicionar bloco condicional usando `plan.requiredRpk` (já existente — sem novo cálculo):
- `> 5` → vermelho (`border-rose-500/30 bg-rose-500/[0.07] text-rose-300`) com texto "⚠️ R$ X,XX/km é muito difícil de atingir no dia a dia. Considere aumentar os dias ou reduzir a meta."
- `> 3.5` → âmbar (`border-amber-500/30 bg-amber-500/[0.07] text-amber-300`) com texto "💡 R$ X,XX/km é exigente. Possível, mas vai precisar de corridas bem selecionadas."
- `<= 3.5` → não renderiza.

### 4. `src/lib/planningInsights.ts` — M7 (novo)
**Conteúdo = arquivo enviado `volant-planningInsights-v2.ts` (146 linhas, na íntegra).** Inclui `InsightTone`, `PlanningInsight`, `PlanningInsightsInput` (com `currentKm` obrigatório e `hoursWorked?` opcional) e `computePlanningInsights` com as regras v2: meta batida (early return), KM alto/rendimento baixo, R$/km acima, projeção da meta, quase lá, poucos dias restantes. Retorna `slice(0, 2)`. Copiar via `code--copy user-uploads://volant-planningInsights-v2.ts src/lib/planningInsights.ts`.

## Fora de escopo
`planningEngine.ts`, `smartKm.ts`, `AjustarSheet.tsx`, `EmptyState.tsx`, `Dashboard.tsx`, herói (gradiente já correto), toggle bruto/líquida, animação de custos, DataContext, AuthContext, queries Supabase, DnD hooks, admin.

## Validação
1. Build TS limpo.
2. Timeline exibe "X de Y dias" baseado em dias trabalhados vs plano original.
3. "PLANO DE JUNHO" sem ícone.
4. Card esquerdo apagado, direito vivo com fundo verde sutil; "Já fiz" verde/bold/maior.
5. "R$" pequeno à esquerda do número da META no herói.
6. Insights v2 mostram até 2 cards com tom correto; fallback quando sem dados; insight de "KM alto / rendimento baixo" usa `currentKm`.
7. Modal Refazer com tom destrutivo e botão primário "Manter plano atual".
8. Alerta de viabilidade aparece no passo de KM quando R$/km > 3,50.
