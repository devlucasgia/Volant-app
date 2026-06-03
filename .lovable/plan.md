## Modelo confirmado

A meta cadastrada é só **um número**. O toggle decide se os custos entram na conta:

- **Visão bruta** = número cadastrado, **sem custos**. Sempre o menor.
- **Visão líquida** = número cadastrado **+ custos fixos do veículo**. Sempre o maior — representa quanto o motorista precisa faturar para levar para casa o valor da meta.

Vale para qualquer `goalType` cadastrado. Exemplos com custos = R$2.000:

| Meta cadastrada | Visão bruta | Visão líquida |
|---|---|---|
| R$5.500 (líquida) | R$5.500 | R$7.500 |
| R$5.500 (bruta) | R$5.500 | R$7.500 |

Progresso e R$/KM Inteligente em **ambas as visões** usam **bruto faturado vs alvo da visão atual**:
- Progresso = `currentGross / alvoView`
- R$/KM = `(alvoView − currentGross) / remainingPlannedKm`
- Meta diária = `(alvoView − currentGross) / diasRestantes`

Resultado natural: na visão líquida o alvo é maior → meta diária maior, R$/KM maior, progresso percentual menor. Coerente com o raciocínio do motorista.

## Mudanças

### 1. `src/lib/planningEngine.ts`

Redefinir os dois alvos de forma simétrica, ignorando `goalType`:

```ts
const registeredGoal = Number(settings.monthlyGoal) || 0;
const grossTarget = registeredGoal;                    // visão bruta
const netTarget   = registeredGoal + consideredCosts;  // visão líquida (faturamento necessário)
```

Recalcular tudo que depende de alvo, mantendo bruto faturado como base de progresso:

- `remainingGross = max(0, grossTarget − currentGross)`
- `remainingNet   = max(0, netTarget   − currentGross)` *(usa currentGross, não currentNet)*
- `suggestedDailyGrossGoal = remainingGross / remainingWorkdaysCount`
- `suggestedDailyNetGoal   = remainingNet   / remainingWorkdaysCount`
- `smartRpkGross = remainingGross / remainingPlannedKm`
- `smartRpkNet   = remainingNet   / remainingPlannedKm`
- `requiredRpkGross = grossTarget / plannedKmTotal`
- `requiredRpkNet   = netTarget   / plannedKmTotal`

Manter `requiredGrossRevenue = netTarget` e `estimatedNetProfit = grossTarget − consideredCosts` como infos do painel do Planejamento (não afetam Home). Manter aliases `baseRpk`, `requiredKm`, `remainingKm` apontando para os campos brutos (compat).

Status (`on_track` / `behind` / `ahead`) passa a comparar sempre `currentGross` com o alvo da visão principal cadastrada (mantém comportamento atual da tela de Planejamento).

### 2. `src/pages/Dashboard.tsx`

Toggle = lente única, todos os itens da Home seguem `showGrossView`:

- `monthlyTargetForView` = `showGrossView ? plan.grossTarget : plan.netTarget`
- `dailyForView` = `showGrossView ? plan.suggestedDailyGrossGoal : plan.suggestedDailyNetGoal`
- `smartKmValue` = `showGrossView ? plan.smartRpkGross : plan.smartRpkNet`
- Progresso do card meta = `s.gross / monthlyTargetForView` em ambas as visões
- Hero card mantém `s.gross` vs `s.net` (já está correto — esse é o realizado, não o alvo)

Label do R$/KM permanece neutro: **"R$/KM Inteligente"**.

### 3. `src/components/planejamento/PainelResumo.tsx`

A tela do Planejamento Inteligente é planejamento estratégico — mantém como está: mostra meta principal (do `goalType` cadastrado), faturamento necessário, lucro líquido estimado, custos, R$/KM mínimo e R$/KM Inteligente. Sem toggle aqui.

## Fora de escopo

- Redesign premium do Planejamento (remover ícones Sparkles, etc.) — fica para sprint separada, conforme solicitado anteriormente.
- "Folga programada" na Home — fica para sprint separada.
- KM Inteligente, Metas Inteligentes, custos variáveis, auth — intactos.

## Arquivos

- `src/lib/planningEngine.ts` — novo cálculo simétrico de alvos + `smartRpkGross`/`smartRpkNet` + `suggestedDailyGrossGoal`/`Net`.
- `src/pages/Dashboard.tsx` — consumir os novos campos via `showGrossView`.
