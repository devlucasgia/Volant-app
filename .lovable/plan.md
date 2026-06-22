# Sprint D — Plano Congelado (De/Para)

Implementação cirúrgica para gravar uma fotografia do plano no momento da criação (Refazer/fresh) e exibi-la no card "PLANO DE JUNHO", sem ser sobrescrita por Ajustes.

## 1. Migration SQL — novos campos em `user_settings`

Novo arquivo em `supabase/migrations/` com:

```sql
ALTER TABLE public.user_settings
  ADD COLUMN IF NOT EXISTS planning_original_goal       numeric     DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS planning_original_goal_type  text        DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS planning_original_avg_km     numeric     DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS planning_original_dates      jsonb       DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS planning_original_created_at timestamptz DEFAULT NULL;
```

Todos nullable — não quebra registros existentes. RLS/GRANT já existem na tabela.

## 2. `src/integrations/supabase/types.ts`

Adicionar os 5 campos nas seções `Row`, `Insert` e `Update` da tabela `user_settings` (opcionais em Insert/Update).

## 3. `src/types/index.ts` (interface `Settings`)

Adicionar:
```ts
planningOriginalGoal?: number | null;
planningOriginalGoalType?: GoalType | null;
planningOriginalAvgKm?: number | null;
planningOriginalDates?: string[] | null;
planningOriginalCreatedAt?: string | null;
```

## 4. `src/context/DataContext.tsx` — mapeamento read/write

- `DEFAULT_SETTINGS`: incluir os 5 campos como `null`.
- No bloco de leitura (`if (sRow)` ~linha 210): ler `planning_original_*` e setar no `setSettings(...)`.
- Em `updateSettings` (~linha 313): incluir os 5 campos no upsert (`planning_original_goal: next.planningOriginalGoal`, etc.). Isso é necessário para que o patch do GuidedFlow chegue ao banco.

## 5. `src/components/planejamento/GuidedFlow.tsx` — gravar no Refazer/fresh

No `finish()` (linhas 202–250), dentro do branch `else` (fluxo `!isEdit` = fresh ou Refazer), adicionar ao `patch`:

```ts
patch.planningOriginalGoal      = draft.monthlyGoal;
patch.planningOriginalGoalType  = draft.goalType;
patch.planningOriginalAvgKm     = draft.avgKmPerDay;
patch.planningOriginalDates     = draft.selectedDates;
patch.planningOriginalCreatedAt = new Date().toISOString();
```

Branch `if (isEdit)` permanece intacto — Ajustes nunca tocam nos campos `planning_original_*`.

## 6. `src/lib/planningEngine.ts` — expor no snapshot

- Adicionar à `PlanningSnapshot`:
  ```ts
  hasOriginalPlan: boolean;
  originalGoal: number | null;
  originalGoalType: GoalType | null;
  originalAvgKm: number | null;
  originalDaysCount: number;
  originalKmTotal: number;
  originalCreatedAt: string | null;
  ```
- Em `computePlanning`, derivar a partir de `settings.planningOriginal*` e incluir no return. `hasOriginalPlan = originalGoal != null && Array.isArray(originalDates) && originalDates.length > 0`.

## 7. `src/components/planejamento/PainelResumo.tsx` — card "PLANO DE JUNHO"

No card esquerdo de "Plano vs Realizado", trocar os valores ativos pelo plano original quando disponível, mantendo fallback:

```ts
const planGoal  = s.hasOriginalPlan ? s.originalGoal!     : s.homeNetTarget;
const planDays  = s.hasOriginalPlan ? s.originalDaysCount : s.selectedWorkdaysCount;
const planKmDay = s.hasOriginalPlan ? s.originalAvgKm!    : s.averageKmPerDay;
const planRpk   = s.hasOriginalPlan && s.originalKmTotal > 0
  ? (s.originalGoal! + s.consideredCosts) / s.originalKmTotal
  : s.requiredRpk;
```

Sem aviso/erro quando `hasOriginalPlan === false` — card mantém comportamento atual.

## Fora de escopo (intacto)
`AjustarSheet.tsx`, `EmptyState.tsx`, `Dashboard.tsx` (Home), summarize, AuthContext, demais queries, DnD hooks, painel admin, branch `isEdit` do GuidedFlow.

## Ordem de execução
1. `supabase--migration` (precisa de aprovação; types regerados depois).
2. Após migration aplicada: editar `types.ts` (caso não cubra os campos), `Settings`, `DataContext`, `GuidedFlow`, `planningEngine`, `PainelResumo`.
3. Verificar build TS limpo.

## Validação
1. Build TS limpo.
2. Refazer grava `planning_original_*` no banco.
3. Ajustar NÃO altera `planning_original_*`.
4. Card "PLANO DE JUNHO" mostra valores originais após Refazer + Ajuste.
5. Usuários antigos sem snapshot original continuam vendo valores ativos, sem quebra.
6. Home/EmptyState intactos.
