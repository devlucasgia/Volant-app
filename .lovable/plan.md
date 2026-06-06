# Plano: Planejamento Inteligente alinhado à Home

## Objetivo
Corrigir a inconsistência entre Home e `/ajustes/planejamento`: hoje o Planejamento ignora custos variáveis (combustível + alimentação) no cálculo de "Faturamento necessário" e no R$/km, e não responde ao toggle Bruto/Líquido. Vamos alinhar a semântica e a UX com a Home, mantendo Planejamento como a visão "detalhada".

## 1. Onboarding (GuidedFlow)
- Remover a etapa de escolha Bruto/Líquido.
- Ir direto para **meta líquida** com um texto curto explicando: *"Líquido é o que sobra no seu bolso depois de pagar todos os custos do carro (fixos + variáveis)."*
- Restante do onboarding (dias, horas, km) permanece igual.
- `goal_type` passa a ser sempre `"liquido"` para novos usuários (sem migração — base atual é desprezível).

## 2. Engine (`planningEngine.ts`)
Ajustar para que **Bruto = Líquido + custos fixos + custos variáveis** em todos os lugares:

- `requiredGrossRevenue` = `metaLiquida + fixedMonthlyCosts + variableMonthlyCosts` (hoje só soma fixos).
- `smartRpk`, `dailyGross`, `minRpk` recalculados a partir desse novo bruto.
- `homeGrossTarget` já usa fixos + variáveis — vira a mesma fonte de verdade do Planejamento (números casam entre as duas telas).
- Exposição clara no snapshot: `fixedCosts`, `variableCosts` (com breakdown combustível/alimentação) e `totalCosts`.

## 3. PainelResumo (`/ajustes/planejamento`)
Mirror leve da Home, **sem replicar o design inteiro**:

- Adicionar **toggle Bruto/Líquido** no topo, sincronizado com `useHeroMetric()` (mesmo estado da Home).
- Card principal clicável: clicar alterna a lente (igual Home).
- KM inteligente segue a lente ativa (bruto usa `dailyGross`, líquido usa `dailyNet`).

### Modo Bruto
Mostrar a composição completa que chega no faturamento necessário:
- Meta líquida desejada
- **Custos fixos** (lista detalhada: IPVA, seguro, financiamento, etc. — como hoje)
- **Custos variáveis** (combustível estimado + alimentação, com label "estimado")
- Total = Faturamento bruto necessário
- R$/km bruto, R$/dia bruto, horas, etc. (como hoje, mas recalculados)

### Modo Líquido
Mesmo formato, mostrando o que compõe o líquido:
- Faturamento bruto previsto
- (–) Custos fixos
- (–) Custos variáveis
- = Meta líquida
- R$/km líquido, R$/dia líquido, etc.

## 4. "Custos considerados"
Passa a listar **fixos + variáveis** juntos, com combustível e alimentação marcados como "estimado". Total reflete a soma real usada no cálculo.

## Arquivos afetados
- `src/lib/planningEngine.ts` — somar variáveis em `requiredGrossRevenue` e derivados
- `src/components/planejamento/GuidedFlow.tsx` — remover escolha bruto/líquido, ir direto pra meta líquida
- `src/components/planejamento/PainelResumo.tsx` — toggle, card clicável, breakdown por lente
- `src/components/planejamento/CustosConsiderados.tsx` (ou equivalente) — incluir variáveis

## Fora de escopo
- Home permanece como está (já está correta).
- Nenhuma mudança em schema/banco.
- Sem migração de `goal_type` de usuários antigos.
