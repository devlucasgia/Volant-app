## Sprint — Custos do plano: congelamento, rateio e custos do mês futuro

Resolve um defeito de arquitetura: hoje os custos do veículo são estado único e mutável, lido ao vivo por todos os planos. Editar custo altera retroativamente plano vigente, congelado e futuro. As 3 mudanças são inseparáveis: a sobrescrita do carro na virada (item 5) só é segura porque todo plano passa a congelar o próprio custo (itens 1–4).

### Modelo (travado)
- **Plano inicial / futuro**: fator = 1 → fixo cheio.
- **Refazer no meio do mês**:
  - `diasTrabalhadosMes` = dias distintos do mês corrente com ganho lançado (fuso local, mesmo bucketing de `getCurrentMonthRealData`).
  - `denom = |diasTrabalhadosMes ∪ diasNovosSelecionados|`
  - `fator = denom > 0 ? min(1, diasNovos / denom) : 1`
  - `fixoAplicado = monthlyPureTotal × fator + usageTotal`
- União evita super-cobrança em Refazeres sucessivos (não usa `planningOriginalDates` porque o Refazer sobrescreve). `min(1, …)` trava quando o Refazer adiciona dias.
- Óleo/pneus NÃO recebem fator (já rateados por km planejado) — aplicar duas vezes descontaria duplo.

### O que NÃO muda (declarado)
`stats.ts`, `insightPhrases.ts`, `Reports.tsx`, AuthContext, hooks DnD, painel admin, lógica de variáveis (combustível/alimentação seguem fora da meta), `summarize` e queries do DataContext (exceto inclusão dos novos campos no select/update).

### 1. Migration (`supabase/migrations/<nova>.sql`)
Aditivo, nulável, default null:
```sql
ALTER TABLE public.user_settings
  ADD COLUMN IF NOT EXISTS planning_original_fixed_applied numeric DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS planning_original_fixed_items   jsonb   DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS next_plan_fixed_applied         numeric DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS next_plan_fixed_items           jsonb   DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS next_plan_cost_fields           jsonb   DEFAULT NULL;
```
`next_plan_cost_fields` estrutura: `{ ownership_status, financing_monthly, rental_monthly, rental_weekly, ipva_yearly, insurance_monthly, other_monthly_costs }`.

### 2. Tipos
- `src/integrations/supabase/types.ts`: Row/Insert/Update de `user_settings` (gerado após migration aprovada).
- `src/types/index.ts` → `Settings` ganha `planningOriginalFixedApplied`, `planningOriginalFixedItems`, `nextPlanFixedApplied`, `nextPlanFixedItems`, `nextPlanCostFields` (camelCase).
- `DataContext`: mapear nos blocos de select e update (e só isso).

### 3. `src/lib/planejamento.ts` — `computeFixedMonthlyCosts` aditivo
Manter `total` e `items` idênticos. Adicionar:
- `monthlyPureTotal` = financiamento/aluguel + IPVA + seguro + outros.
- `usageTotal` = óleo + pneus.
- Invariante: `total === monthlyPureTotal + usageTotal`.
- Classificação por origem (não por label) na hora de empurrar o item, para robustez.

### 4. `src/lib/planningEngine.ts` (linha ~163)
```ts
const costsLive = computeFixedMonthlyCosts(activeCar, plannedKmTotal);
const consideredCosts = settings.planningOriginalFixedApplied != null
  ? Number(settings.planningOriginalFixedApplied)
  : costsLive.total; // fallback compat: plano antigo sem snapshot
const fixedCostItems = settings.planningOriginalFixedItems ?? costsLive.items;
```
Apenas troca a fonte do custo fixo. Nenhuma fórmula de meta/R$/km/redistribuição muda. Comentar o fallback no código.

### 5. `src/components/planejamento/GuidedFlow.tsx`

**5a. Refazer / fresh (ramo `else` do finish, ~linhas 260–278)**
```ts
const diasNovos = draft.selectedDates.length;
const diasTrabalhadosMes = distinctEarningDaysInMonth(entries, new Date()); // reusa bucketing local
const denom = new Set([...diasTrabalhadosMes, ...draft.selectedDates]).size;
const fator = denom > 0 ? Math.min(1, diasNovos / denom) : 1;

const c = computeFixedMonthlyCosts(activeCar, plan.plannedKmTotal);
const fixoAplicado = c.monthlyPureTotal * fator + c.usageTotal;
const itens = c.items.map(it => isUsoItem(it.label) ? it : { ...it, value: it.value * fator });

patch.planningOriginalFixedApplied = fixoAplicado;
patch.planningOriginalFixedItems   = itens;
```
`isUsoItem` cobre `"Óleo estimado"` e `"Pneus estimados"` (labels exatos de `planejamento.ts`); qualquer outro entra como mensal puro (conservador). Plano inicial: nada trabalhado, fator = 1, fixo cheio.

**5b. Ajustar (`isEdit`)**: NÃO grava snapshot. Custo permanece congelado (regra "Ajustar nunca sobrescreve o plano").

**5c. Fluxo futuro (`isNext`)** — passo de custos editáveis
Novo passo (ou bloco no resumo) pré-preenchido com os custos fixos do carro ativo. Edita só fixo mensal puro: situação do veículo + valor (financiamento OU aluguel mensal/semanal), IPVA, seguro, outros. Óleo/pneus/variáveis ficam de fora. No finish:
```ts
const costFields = { ownership_status, financing_monthly, rental_monthly,
                     rental_weekly, ipva_yearly, insurance_monthly, other_monthly_costs };
const carroFuturo = { ...activeCar, ...costFields };
const cFut = computeFixedMonthlyCosts(carroFuturo, draftPlannedKm);
patch.nextPlanFixedApplied = cFut.total; // cheio
patch.nextPlanFixedItems   = cFut.items;
patch.nextPlanCostFields   = costFields;
```

**5d. Preview do Step6 no Refazer**: o `useMemo` do plano (~linha 184) passa a usar o fixo já rateado em `computePlan({ custosFixos: monthlyPureTotal*fator + usageTotal })` quando estiver em modo Refazer. Hoje passa `costs.total` cheio e a meta diária do preview fica errada.

### 6. `supabase/functions/activate-next-plans/index.ts`
Após o `update` já existente do plano, em transação lógica:
```ts
if (r.next_plan_fixed_applied != null) {
  update.planning_original_fixed_applied = r.next_plan_fixed_applied;
  update.planning_original_fixed_items   = r.next_plan_fixed_items;
  if (r.next_plan_cost_fields) {
    await admin.from("cars").update(r.next_plan_cost_fields)
      .eq("user_id", r.user_id).eq("is_active", true);
  }
}
update.next_plan_fixed_applied = null;
update.next_plan_fixed_items   = null;
update.next_plan_cost_fields   = null;
```
Blindagens: sem snapshot → ativa como hoje (compat). Sem carro ativo → update em `cars` afeta 0 linhas, não quebra. Idempotente.

Comportamento aceito: se o motorista editar Custos manualmente entre criar o plano futuro e a virada, a sobrescrita vence — coerente (plano futuro é intenção explícita).

### 7. `src/components/planejamento/PainelResumo.tsx`
Exibir congelado/futuro via `planningOriginalFixedItems/Applied` e `nextPlanFixedItems/Applied` (com fallback ao cálculo ao vivo se nulo). Inserir linha (a) abaixo.

### 8. UX (só onde o comportamento muda; tom muted, sem alerta)
- **(a) Refazer com fator < 1**, no Step6: `Faltam {n} dias no mês. Os custos fixos entram proporcionais a esses dias.`
- **(b) Passo de custos do fluxo futuro**, cabeçalho + 1 linha: `Custos do próximo mês — Valem a partir de {próxMês}. Seu plano de {mêsAtual} não muda.`
- **(c) Confirmação ao concluir plano futuro** (só se `nextPlanCostFields` diferir do carro atual): `Os novos custos passam a valer quando {próxMês} começar.`

Sem truncamento, sem azul informativo, até 2 linhas a ~360px.

### 9. Casos de borda blindados
Plano antigo sem snapshot → fallback ao vivo. Plano futuro antigo sem `cost_fields` → virada não sobrescreve carro. `denom = 0` → fator = 1. Refazer adicionando dias → `min(1, …)`. Sem carro ativo → fixo 0. `activeCar` nulo → snapshot 0/[]. Falha de rede → patch único, nada parcial. Label de uso divergente → entra como mensal puro (não some custo).

### Arquivos no escopo
- `supabase/migrations/<nova>.sql`
- `src/integrations/supabase/types.ts`
- `src/types/index.ts`
- `src/context/DataContext.tsx` (apenas select/update dos novos campos)
- `src/lib/planejamento.ts`
- `src/lib/planningEngine.ts`
- `src/components/planejamento/GuidedFlow.tsx`
- `src/components/planejamento/PainelResumo.tsx`
- `supabase/functions/activate-next-plans/index.ts`

Qualquer arquivo fora desta lista será sinalizado antes da edição.

### Roteiro de validação
1. Plano inicial cheio → meta bruta = líquida + fixo cheio.
2. Congelamento: editar Custos não muda meta do plano vigente (só após Refazer).
3. Refazer 3 dias com 12 já trabalhados → fixo ≈ 3/15 do mensal puro + óleo/pneus do período.
4. Refazer duplo no mesmo mês → rateio segue correto (união auto-corretiva).
5. Plano futuro alterando aluguel → mês atual intacto; mensagem (b)/(c) aparece.
6. Forçar `activate-next-plans` → plano novo usa custo planejado; tela de Custos passa a refletir o valor novo.
7. Usuário com plano antigo (sem snapshot) → meta correta pelo fallback.

### Ordem de execução
1. Migration (aprovação do usuário).
2. Tipos + DataContext mapping.
3. `planejamento.ts` aditivo.
4. `planningEngine.ts` (fonte do custo).
5. `GuidedFlow.tsx` (5a, 5b, 5d primeiro; 5c por último).
6. `PainelResumo.tsx`.
7. Edge function.
8. Smoke test pelo roteiro acima.
