# Sprint — PainelResumo redesign + Step5 editável no isNext + fix homeRemainingNet

Escopo cirúrgico em 3 arquivos. Nada de novos campos no banco, migrations ou mudanças em Reports/stats/DataContext/AuthContext.

## Arquivos no escopo

- `src/lib/planningEngine.ts`
- `src/components/planejamento/PainelResumo.tsx`
- `src/components/planejamento/GuidedFlow.tsx`

## 1. `planningEngine.ts` — fix `homeRemainingNet`

Trocar 1 palavra na definição:

```ts
// antes
const homeRemainingNet = clampPos(homeNetTarget - currentGross);
// depois
const homeRemainingNet = clampPos(homeNetTarget - currentNet);
```

`currentNet` já existe (`agg.net = gross - expenses`). Nenhum outro campo afetado.

## 2. `PainelResumo.tsx` — remover seção "Meta do Mês · Composição"

Deletar a seção 5 inteira (eyebrow "META DO MÊS · COMPOSIÇÃO" + card de meta com toggle bruto/líquido + card de custos com barra empilhada + link "Editar custos").

Remover também as derivações que só serviam a essa seção — depois de conferir que não são consumidas em outro lugar:

- `viewLiquida` e `setViewLiquida`
- `metaProgressPct`
- `parcelasTotal`, `desgasteTotal`, `fixosSoma`, `parcelasPct`, `desgastePct`
- `combustivelItem`
- helper local `isDesgaste`

Efeito colateral: o Hero (seção 2) hoje usa `viewLiquida ? homeDailyNet : homeDailyGross`. Como o toggle sai do painel, o Hero passa a exibir sempre `homeDailyGross` (bruto), coerente com o "Já fiz" bruto do Plano vs Realizado.

## 3. `PainelResumo.tsx` — redesenhar "Plano vs Realizado" (seção 4)

5 linhas espelhadas nas duas colunas via componente local `PvRLine`:

```
PLANO DE {MÊS}  [REFEITO]      • ATÉ AGORA
Meta bruta   R$ 3.217          Já fiz    R$ 2.772
Dias         1                 Dias      9
KM est.      200 km            KM        914 km
R$/km alvo   R$ 16,09          R$/km     R$ 3,03
Custos       R$ 217            Falta     R$ 445
```

Derivações no componente:

```ts
const planMetaBruta = s.hasOriginalPlan
  ? (s.originalGoal! + s.consideredCosts)
  : s.homeGrossTarget;
const planDays = s.hasOriginalPlan ? s.originalDaysCount : s.selectedWorkdaysCount;
const planKmTotal = s.hasOriginalPlan
  ? (s.originalAvgKm ?? 0) * s.originalDaysCount
  : s.plannedKmTotal;
const planRpk = planKmTotal > 0 ? planMetaBruta / planKmTotal : 0;
const planCustos = s.consideredCosts;
// rpkAtual e s.homeRemainingGross já existem
```

Cores no lado "ATÉ AGORA":
- Já fiz → `text-primary` bold
- Dias / KM → `text-foreground`
- R$/km → `rpkColor` já existente
- Falta → `text-info` (azul)

Fallback quando `!s.hasOriginalPlan`: usar os valores ao vivo, sem crash. `planRpk === 0` → exibe "—". `homeRemainingGross === 0` → exibe "R$ 0".

Componente local (garante simetria):

```tsx
function PvRLine({ label, value, valueClass }: { label: string; value: string; valueClass?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-2 py-[3.5px] border-b border-border/30 last:border-b-0 last:pb-0">
      <span className="shrink-0 text-[10.5px] text-muted-foreground">{label}</span>
      <span className={cn("shrink-0 tabular-nums text-right text-[11px] font-medium text-foreground/80", valueClass)}>
        {value}
      </span>
    </div>
  );
}
```

Sem `truncate`/`overflow-hidden`. Badge REFEITO preserva o padrão âmbar já usado.

## 4. `PainelResumo.tsx` — eyebrow "PLANEJAMENTO FUTURO"

Adicionar acima do card do próximo mês (seção 8), dentro do container de borda superior existente:

```tsx
<div className="mb-3 flex items-center gap-1.5 px-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
  <CalendarArrowUp className="h-3 w-3" />
  Planejamento futuro
</div>
```

Ícone: tentar `CalendarArrowUp` do `lucide-react`. Se indisponível na versão instalada, fallback para `CalendarPlus` (já importado). Verificação antes de adicionar import.

Card do próximo mês em si não muda.

## 5. `GuidedFlow.tsx` — Step5 editável no `isNext`

Comportamento hoje: no `isNext`, Step5 mostra os custos do carro em modo leitura com link "Editar na Central de Veículos".

Novo: no `isNext`, Step5 exibe inputs pré-preenchidos com os valores do carro ativo. Ajustes ficam no draft e chegam ao `finish` via `patch.nextPlanCostFields`.

Campos editáveis (fixos mensais puros — óleo/pneus continuam derivando do KM e ficam fora):

- Situação do veículo: Financiado / Alugado / Quitado (reusar padrão `rentalPeriod` já usado em Custos)
- Financiamento mensal **ou** aluguel (mensal/semanal conforme situação)
- IPVA anual (÷ 12 no cálculo de exibição)
- Seguro mensal
- Outros custos mensais

Estado: o tipo `Draft` já possui `nextCostFields?: NextPlanCostFields` (linhas 70–77). Inicializar via `extractCostFields(activeCar)` quando o Step5 monta no modo `isNext` (se ainda não foi tocado). Cada input chama `setDraft` mesclando em `nextCostFields`.

No `finish` (`isNext`), o patch já grava `next_plan_cost_fields: draft.nextCostFields ?? null` (fluxo da sprint de custos anterior). Sem mexer na edge function.

UX do passo:

```
Custos do próximo mês
Valem a partir de {proxMes}. Seu plano de {mesAtual} não muda.
```

Sem barra de composição, sem link "Editar na Central de Veículos". Sem carro cadastrado → mantém o aviso atual.

**Guard**: toda a lógica nova só roda quando `isNext === true`. Modos `isRedo`, `isEdit` e fresh continuam idênticos.

## Casos de borda

- Sem plano original → grid usa valores ao vivo.
- `originalKmTotal === 0` → `planRpk` mostra "—".
- Meta batida → "Falta R$ 0".
- Hero sem toggle → sempre bruto (`homeDailyGross` / `homeSmartRpkGross`).
- `CalendarArrowUp` ausente → fallback `CalendarPlus`.
- `nextCostFields` nulo → edge function já blindada.

## Roteiro de validação

1. Painel: seção 5 removida, sem variáveis órfãs, sem console error.
2. Plano vs Realizado: 5 linhas por coluna; `Meta bruta − Já fiz = Falta`.
3. Badge REFEITO: aparece só após um Refazer.
4. Eyebrow "PLANEJAMENTO FUTURO" com ícone acima do card do próximo mês.
5. Step5 no `isNext`: inputs pré-preenchidos, edição persiste em `next_plan_cost_fields`.
6. Step5 nos demais modos: sem regressão.
7. `homeRemainingNet` = `homeNetTarget − currentNet` (checar via consumidores restantes).
8. Simetria: valores alinhados à direita mesmo com R$/km alvo > R$ 10,00.

Se durante a implementação surgir necessidade de tocar arquivo fora dos 3 listados, paro e valido antes.
