# Sprint F — Planejamento: 4 blocos

Spec do usuário já está detalhada e pronta para execução. Confirmo o escopo abaixo.

## Arquivos tocados (só estes)
- `src/components/planejamento/GuidedFlow.tsx` — blocos 1, 3, 4
- `src/pages/PlanejamentoInteligente.tsx` — blocos 2, 4
- `src/components/planejamento/PainelResumo.tsx` — bloco 2 (texto)
- `src/lib/planningInsights.ts` — bloco 2 (texto)

Inviolável: `planningEngine.ts`, `planejamento.ts`, `smartKm.ts`, `DataContext`, queries Supabase, hooks DnD, `stats.ts`, painel admin, fluxo motorista novo, Ajustar.

---

## Bloco 1 — Corrigir Step6 do GuidedFlow

**1.1 — Combustível fora do faturamento necessário.** No `useMemo` do `plan`, trocar:
```
custosFixos: costs.total + (draft.goalType === "liquido" ? variable.total : 0),
```
por `custosFixos: costs.total,` — alinha com `homeGrossTarget` do engine.

**1.2 — Dados reais via helper em fuso local.** Substituir os três `useMemo` (`currentGrossReal`, `currentKmReal`, `daysWorkedReal`) por:
```
const realMes = useMemo(() => getCurrentMonthRealData(entries), [entries]);
```
Importar `getCurrentMonthRealData` de `@/lib/smartKm`. Atualizar props do `<Step6/>` para `realMes.grossThisMonth`, `realMes.kmThisMonth`, `realMes.daysWorkedThisMonth`.

**1.3 — `diasFuturos` por string local.** Dentro de `Step6`, importar `toIsoDate, startOfDay` de `@/lib/planejamento` e trocar a comparação por `Date` por:
```
const hojeIso = toIsoDate(startOfDay(new Date()));
const diasFuturos = draft.selectedDates.filter((iso) => iso >= hojeIso);
```

Resultado esperado (com meta 5.000, 8 dias, KM 200, R$ 2.283 em 6 dias): bruto 7.142, meta/dia 607, R$/km 3,04, dias trabalhados 6 — iguais ao PainelResumo.

---

## Bloco 2 — Tirar travessões de frase

- **`PlanejamentoInteligente.tsx`** (modal Refazer): novo corpo, dois parágrafos sem travessão, mantendo destaque vermelho em "substitui seu plano atual de {mês}".
  - P1: "Isso substitui seu plano atual de {mês} por um novo. O De/Para que está sendo acompanhado é zerado."
  - P2: "Seus registros de ganhos, gastos e veículo não mudam. O plano atual continua valendo até você concluir o novo."
- **`PainelResumo.tsx`**: trocar três frases (Fixos…aí recalculam / zerados nesta visão, esse dinheiro / fora da meta, só referência).
- **`planningInsights.ts`**: três frases (quantidade de km não resolve. Qualidade de corrida, sim / rendendo {x}/km, abaixo do mínimo / fez {y} km, {z} km abaixo).

`—` que são placeholder de valor vazio ficam.

---

## Bloco 3 — Redesign do Step5 ("Passo 4 de 5")

Mexer apenas no JSX do `Step5` quando `car` existe. Manter `StepHeader`, chip do veículo, estados vazios e botão "Editar na Central de Veículos".

Substituir card interno por anatomia espelhando o card "Custos do carro na sua meta" do PainelResumo:
1. Header: ícone `Route` em quadrado `bg-muted/40` + título "Custos do carro na meta" + sublinha "{fmtBRL(costsTotal)} empurram seu bruto pra cima".
2. Barra empilhada Financiamento/Desgaste com split por regex `/óleo|oleo|pneu/i` sobre `costsItems`, fatias `bg-sky-500/70` e `bg-primary/70`, legenda com bolinhas e percentuais. Só renderiza se `fixosSoma > 0`.
3. Lista de itens fixos (label muted + valor `tabular-nums`).
4. Divisória + variáveis (combustível e demais) sob sublinha "fora da meta, só referência".
5. Remover o bloco destacado "TOTAL MENSAL NA META".

Props, cálculos e estados vazios inalterados.

---

## Bloco 4 — Trava de meta no Refazer

**4.1 — `PlanejamentoInteligente.tsx`:** adicionar `isRedo?: boolean` em `FlowConfig`. No "Sim, refazer" do AlertDialog: `setFlowConfig({ variant: "fresh", isRedo: true })`. Passar `isRedo={flowConfig.isRedo}` para `<GuidedFlow/>`. Outros pontos (EmptyState, planningResume) não recebem `isRedo`.

**4.2 — `GuidedFlow.tsx`:** aceitar prop opcional `isRedo?: boolean` (default false). Em `canNext` para `step === 2`:
```
if (step === 2) {
  if (draft.monthlyGoal <= 0) return false;
  if (isRedo && draft.monthlyGoal === settings.monthlyGoal) return false;
  return true;
}
```
Passar `isRedo` e `currentGoal={settings.monthlyGoal}` para `Step2`. Em `Step2`, quando `isRedo && draft.monthlyGoal > 0 && draft.monthlyGoal === currentGoal`, mostrar aviso inline `border-amber-500/30 bg-amber-500/[0.07] text-amber-300`, `text-[12px] leading-snug`, texto: "Essa já é a meta do seu plano atual. Pra mudar só os dias ou o KM, use o Ajustar. Pra refazer do zero, defina uma meta diferente."

Refazer continua com draft em branco. Motorista novo e Ajustar sem trava.

---

## Validação manual
1. Refazer com cenário do print → Step6 = PainelResumo (607, 3,04, 6 dias).
2. Passo 4 com novo visual de custos (barra + combustível como referência).
3. Refazer + meta igual à atual → "Continuar" travado + aviso; meta diferente → destrava.
4. Plano novo → sem trava no Passo 1.
5. Sem travessões longos em modal Refazer, PainelResumo e insights.
