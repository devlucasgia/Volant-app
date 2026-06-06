## Contexto

No Passo 5 do Planejamento Inteligente ("Custos considerados") só aparecem os custos fixos. Os variáveis (combustível + alimentação) já são calculados (`variable.items` / `variable.total`) e passados para o `Step5`, mas o componente nunca os renderiza. Por isso, depois de cadastrar combustível/alimentação na Central de Veículos e voltar, o motorista não vê os valores.

Outros pontos:
- Empty state só dispara quando NÃO há custos fixos, ignorando o caso "tem fixos, mas zero variáveis" (e vice-versa).
- Nome do veículo aparece como subtítulo cinza sem destaque.
- "Alugado" só aceita valor semanal. Precisa aceitar mensal OU semanal (mutuamente exclusivos).
- Botão "Continuar" do fluxo guiado às vezes exige scroll.
- Textos "KM restante" / "dias restantes" abaixo do card de R$/KM Inteligente são pequenos e cinza; o sistema de cores (amber/emerald/ok) hoje só pinta o card grande, não esses textos.

## Mudanças

### 1. Passo 5 — custos variáveis visíveis + empty states inteligentes
**`src/components/planejamento/GuidedFlow.tsx`** (`Step5`):
- Renderizar duas seções dentro do mesmo card:
  - "Custos fixos" — `costsItems` + subtotal
  - "Custos variáveis" — `variableItems` + subtotal (combustível, alimentação)
- "Total mensal" = fixos + variáveis.
- Para cada bloco vazio, mostrar inline um aviso curto + CTA:
  - Sem fixos: "Nenhum custo fixo cadastrado" + "Cadastrar custos fixos →"
  - Sem variáveis: "Nenhum custo variável cadastrado" + "Cadastrar custos variáveis →"
- Ambos os CTAs reusam `onEditCosts` (já navega para `/ajustes/veiculos/custos` com `planningResume`, que restaura o draft ao voltar).
- Remover o early-return `if (costsItems.length === 0)` — avisos passam a viver dentro do layout normal.

### 2. Destaque do veículo no Passo 5
**`GuidedFlow.tsx` (`Step5`)**: substituir o subtítulo "Chevrolet Onix" cinza por um chip com ícone de carro + marca/modelo em peso semibold e tom primário suave, logo abaixo do título.

### 3. Aluguel mensal opcional
**Banco** (`supabase--migration`):
- `ALTER TABLE public.cars ADD COLUMN rental_monthly numeric NULL;`

**`src/lib/planejamento.ts`** (`computeFixedMonthlyCosts`):
- Bloco "alugado": se `rental_monthly > 0` usar esse valor; senão, se `rental_weekly > 0` usar `rental_weekly * 4.33`. Nunca soma os dois.

**`src/components/vehicle/VehicleCostsSection.tsx`**:
- Adicionar `rental_monthly` ao `VehicleCosts` + `EMPTY_VEHICLE_COSTS`.
- No bloco "alugado", Segmented "Mensal / Semanal" controlando qual campo aparece. Ao trocar, zerar o outro campo para evitar duplicidade.

**`src/components/vehicle/VehicleCostsCard.tsx`** e **`src/context/DataContext.tsx`**: propagar `rental_monthly` no map/save (mesmo padrão do `rental_weekly`).

**`src/types/index.ts`**: adicionar `rental_monthly?: number | null` em `Car`.

### 4. Fluxo guiado sem scroll para o botão Continuar
**`GuidedFlow.tsx`**:
- Reduzir o `pb-28` do container central e o `py-3` do footer (ou aplicar `pb-20` + `py-2`) para que o conteúdo + botão caibam em viewports ≥ 640px de altura.
- Garantir que o container interno (`flex-1 flex flex-col justify-center`) tenha `min-h-0` para conteúdos médios não estourarem.
- Reduzir levemente paddings/margens internos dos passos densos (Step 4 e Step 5) para folga visual.
- Validar em viewport 375×667 (iPhone SE) e 390×844.

### 5. Mini-cards coloridos abaixo do R$/KM Inteligente
**`src/components/planejamento/PainelResumo.tsx`** (Hero 2):
- Trocar a linha única de texto "KM restante: X · Y dias restantes" por dois mini-chips lado a lado:
  - Chip "KM a alcançar" → `s.remainingPlannedKm`
  - Chip "Dias para meta" → `s.remainingWorkdaysCount`
- Cada chip pinta-se conforme `rpkTone` (mesma regra já existente do card):
  - `behind` (smartRpk > requiredRpk × 1.10) → amber
  - `ahead`  (smartRpk < requiredRpk × 0.90) → emerald
  - `ok`     → neutro (border/bg do card)
- Visual discreto: `rounded-xl`, padding pequeno (`px-2.5 py-1.5`), label uppercase 10px, valor semibold 13px. Sem sombra forte.
- Adicionar tooltip simples (title) explicando a regra: "Acima do plano: você precisa render mais por km" / "Folga: você pode render menos por km que o mínimo".

## Como funciona o sistema de cores (referência para o usuário)
Tudo é baseado em `rpkTone` em `PainelResumo.tsx`:
- Compara o **R$/KM Inteligente atual** (`smartRpk` = quanto falta faturar ÷ km restantes) com o **R$/KM mínimo necessário** (`requiredRpk` = faturamento total ÷ km planejado).
- `smartRpk > requiredRpk × 1.10` → **amarelo (behind)**: rodando o mesmo km, precisa ganhar mais por km para bater a meta.
- `smartRpk < requiredRpk × 0.90` → **verde (ahead)**: já está com folga.
- Entre 90% e 110% → **neutro (ok)**: dentro do plano.

## Fora de escopo

- Step 6 / Dashboard (variáveis já entram lá via `homeGrossTarget`).
- Refator do sistema de tons; só estendemos o uso atual.
- Migração de dados (aluguel mensal nasce vazio).

## Resultado visível

- Passo 5 com duas seções claras (Fixos / Variáveis), cada uma com CTA quando vazia, e veículo destacado no topo.
- "Alugado" passa a oferecer Mensal ou Semanal.
- Botão "Continuar" visível sem scroll em telas comuns.
- Abaixo do R$/KM Inteligente, dois mini-cards "KM a alcançar" e "Dias para meta" mudam de cor junto com o card principal.
