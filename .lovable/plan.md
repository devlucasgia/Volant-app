# Sprint A — Fix R$/km Dinâmico

## Escopo
- Arquivo único: `src/lib/planningEngine.ts`
- Risco: baixo — mudança cirúrgica em 2 trechos de cálculo.
- Nenhum componente de UI, query, contexto, hook ou rota será alterado.

## Contexto
O cálculo do `smartRpk` usa `remainingPlannedKm` (`plannedKmTotal - currentKm`) como denominador. Isso inclui KM de dias já passados não rodados, inflando o denominador. O correto é usar o KM que ainda vai ser rodado nos dias restantes: `avgKmPerDay × remainingWorkdaysCount`.

## Mudança 1 — `smartRpk`
Logo após os cálculos de meta diária, substituir:

````ts
const requiredRpk =
  plannedKmTotal > 0 ? requiredGrossRevenue / plannedKmTotal : 0;
const smartRpk =
  remainingPlannedKm > 0 ? remainingGrossToTarget / remainingPlannedKm : 0;
````

Por:

````ts
const requiredRpk =
  plannedKmTotal > 0 ? requiredGrossRevenue / plannedKmTotal : 0;

// smartRpk usa o KM que ainda VAI ser rodado (avgKmPerDay × dias restantes),
// não o KM residual do plano (plannedKmTotal - kmFeito).
const smartKmRemaining =
  averageKmPerDay > 0 && remainingWorkdaysCount > 0
    ? averageKmPerDay * remainingWorkdaysCount
    : remainingPlannedKm; // fallback seguro
const smartRpk =
  smartKmRemaining > 0 ? remainingGrossToTarget / smartKmRemaining : 0;
````

## Mudança 2 — `homeSmartRpkGross` e `homeSmartRpkNet`
No bloco da Home lens, substituir:

````ts
const homeSmartRpkGross =
  remainingPlannedKm > 0 ? homeRemainingGross / remainingPlannedKm : 0;
const homeSmartRpkNet =
  remainingPlannedKm > 0 ? homeRemainingNet / remainingPlannedKm : 0;
````

Por:

````ts
const homeSmartRpkGross =
  smartKmRemaining > 0 ? homeRemainingGross / smartKmRemaining : 0;
const homeSmartRpkNet =
  smartKmRemaining > 0 ? homeRemainingNet / smartKmRemaining : 0;
````

## O que NÃO muda
- `remainingPlannedKm`: continua calculado e exposto (usado em outros contextos).
- `requiredRpk`: continua usando `plannedKmTotal` como base estática.
- Nenhum outro arquivo (`DataContext`, `summarize`, `stats.ts`, componentes de UI, queries Supabase, etc.).

## Validação
1. TypeScript build passa sem erros.
2. Com dados de jun/2026 (8 dias restantes, 250 km/dia):
   - `smartRpk`: ~R$ 1,50/km → ~R$ 3,02/km
   - `homeSmartRpkGross`/`homeSmartRpkNet`: ~R$ 1,50/km → ~R$ 3,02/km
   - `requiredRpk`: R$ 1,47/km (inalterado)
3. Verificar visualmente em Ajustes > Planejamento que o R$/km dinâmico subiu para ~R$ 3,02.