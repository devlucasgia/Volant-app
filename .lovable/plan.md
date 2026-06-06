# Sprint — Otimização do Planejamento Inteligente

## Vocabulário (canônico após esta sprint)

- **Líquido** = sobra no bolso do motorista (o que vai cadastrar como meta).
- **Bruto** = faturamento necessário = Líquido + Custos fixos + Custos variáveis estimados.
- **Custos fixos** = mensalidades do veículo (aluguel, financiamento, seguro, IPVA, óleo/pneus prorrateados).
- **Custos variáveis** = combustível e alimentação estimados a partir do plano (KM × dias).

---

## 1.1 — Inverter rótulos Bruto ↔ Líquido [DECIDIDO]

**Estado hoje (errado semanticamente):** `homeGrossTarget = monthlyGoal` e `homeNetTarget = monthlyGoal + custos`. Resultado: a meta "Bruta" é menor que a "Líquida", invertendo o significado financeiro.

**Mudança:** trocar apenas a atribuição semântica, sem mexer na matemática nem nos KMs planejados.

```ts
// planningEngine.ts — homeLens
homeGrossTarget = monthlyGoal + consideredCosts;   // faturamento necessário
homeNetTarget   = monthlyGoal;                     // sobra desejada
homeRemainingGross = clampPos(homeGrossTarget - currentGross);
homeRemainingNet   = clampPos(homeNetTarget   - currentGross);
homeSmartRpkGross  = homeRemainingGross / remainingPlannedKm;  // maior
homeSmartRpkNet    = homeRemainingNet   / remainingPlannedKm;  // menor
```

Resultado no exemplo (meta cadastrada 6.000, custos 2.000):
- Bruta = R$8.000 → R$/KM inteligente **maior**
- Líquida = R$6.000 → R$/KM inteligente **menor**

**Padronizar `goalType` como `"liquido"`** daqui pra frente (a meta cadastrada passa a ser sempre a sobra). Para usuários antigos com `goalType="bruto"`, fazer migração one-shot: o valor cadastrado vira `monthlyGoal_legacy_bruto` e o novo `monthlyGoal` é recalculado como `legacy − custos`, ou exibir banner pedindo recadastro (decidir no momento da migração; default = conversão automática preservando o bruto original).

**Onboarding:** ajustar copy e exemplo para "quanto você quer SOBRAR no mês".

**Arquivos:** `src/lib/planningEngine.ts`, `src/components/planejamento/GuidedFlow.tsx`, `src/components/PlanningOnboardingDialog.tsx`, textos das cards da Home (toggle bruto/líquido).

---

## 1.2 — Custos variáveis [DECIDIDO: Variação da Opção A]

### Minha recomendação (justificativa)

| Opção | Prós | Contras |
|---|---|---|
| A pura (no fluxo do planejamento) | UX guiada | Duplica conceito com Custos do Veículo; difícil editar depois |
| **A-variação (em "Custos", renomear)** | Fonte única de verdade; editável fora do onboarding; planejamento só consome | Pequena refatoração de nome |
| B (sem estimativa, só gastos reais) | Zero atrito | Meta bruta e R$/KM Inteligente oscilam a cada lançamento → UX ruim, sem âncora no início do mês |

**Recomendo A-variação.** Razões: (i) o motorista tem um único lugar para revisar todos os custos; (ii) o Planejamento fica determinístico e estável; (iii) reaproveita a UI/rota `MeusCarros` → `VehicleCostsCard` que já existe; (iv) permite que o app, no futuro, compare estimado vs real automaticamente.

### Escopo

**Renomear** "Custos do Veículo" → **"Custos"** (label, breadcrumb, título de página, callbacks `costs_onboarded`). Manter rota atual.

**Nova seção "Custos variáveis"** no `VehicleCostsCard` com dois campos:

1. **Combustível**
   - `fuel_consumption_kml` (number, ex.: 8.0)
   - `fuel_type` (enum: gasolina | etanol | diesel | gnv | flex)
   - `fuel_price` (R$/litro)
2. **Alimentação**
   - `food_avg_per_day` (R$/dia)

**Schema:** novas colunas em `public.cars` (todas nullable, default null) — migração simples, sem quebrar dados existentes.

### Cálculo (somente no `homeGrossTarget`)

```
litros_mes      = (averageKmPerDay * selectedWorkdaysCount) / fuel_consumption_kml
custo_combust   = litros_mes * fuel_price
custo_alimenta  = food_avg_per_day * selectedWorkdaysCount
custosVariaveis = custo_combust + custo_alimenta

homeGrossTarget = monthlyGoal + custosFixos + custosVariaveis
```

Custos variáveis **não entram** no líquido (líquido = meta cadastrada cru) e **não alteram** `consideredCosts` antigo usado por outros consumidores — criar novo campo `variableCosts` na snapshot para não quebrar callers.

### Resumo do Planejamento (UI)

Quebrar a card "Custos considerados" em duas linhas:
- **Custos fixos** — R$ X (do veículo)
- **Custos variáveis** — R$ Y (combustível estimado + alimentação estimada)

Tooltip explicando o cálculo por trás de cada um.

---

## Critério de aceite

- [ ] Home: toggle Bruto mostra valor MAIOR (= meta + custos); Líquido mostra valor MENOR (= meta cadastrada).
- [ ] R$/KM Inteligente do Bruto > R$/KM Inteligente do Líquido em todos os cenários.
- [ ] Onboarding do planejamento pergunta "quanto quer sobrar" (líquido).
- [ ] "Custos do Veículo" passa a se chamar "Custos" em toda a UI.
- [ ] Nova seção "Custos variáveis" em Custos, com combustível (km/L + tipo + preço) e alimentação (R$/dia).
- [ ] Snapshot expõe `variableCosts` separado de `consideredCosts` (fixos).
- [ ] Resumo do planejamento mostra fixos e variáveis em linhas separadas.
- [ ] Usuários beta existentes continuam com metas coerentes após migração (script de conversão `bruto → liquido`).
- [ ] Nenhuma regressão em Histórico, Relatórios ou Performance (não tocamos nesses módulos).

---

## Fora de escopo

- Itens 3, 6 e 8 do plano de go-live (continuam reservados).
- Alterar fórmulas de R$/h, R$/km histórico, ou qualquer cálculo de Relatórios.
- Mexer no fluxo de pagamento, paywall, e-mails.
- Comparativo automático "estimado vs real" (fica para sprint futura).

---

## Ordem de execução

1. Migração SQL: novas colunas em `cars` + migração one-shot `goalType bruto → liquido`.
2. `planningEngine.ts`: inversão de rótulos + cálculo de `variableCosts`.
3. `VehicleCostsCard` + renomeação "Custos do Veículo" → "Custos".
4. `GuidedFlow` + `PlanningOnboardingDialog`: copy nova (sobra desejada).
5. Home (toggle bruto/líquido) — textos e tooltips.
6. Verificação manual no preview com o exemplo R$6.000 / R$2.000.
