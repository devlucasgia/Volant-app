# Sprint K — Plano futuro: cálculo + card + alerta

Três mudanças localizadas, na ordem fonte → visual → UX. Sem tocar em `planningEngine.ts`, na Home, em auth, queries ou cores.

## Bloco 1 — Corrigir meta diária (`src/lib/planejamento.ts`)

Em `computePlan`, trocar a base de `metaDiaria` de líquido para bruto, alinhando com `requiredRpk`:

```ts
// antes
const metaDiaria = diasSelecionados > 0 ? monthlyGoal / diasSelecionados : null;
// depois
const metaDiaria = diasSelecionados > 0 ? faturamentoNecessario / diasSelecionados : null;
```

- Modo bruto: `faturamentoNecessario === monthlyGoal`, nada muda.
- Modo líquido: meta diária passa a incluir custos fixos diluídos, batendo com o R$/km mínimo.
- Único consumidor: Step6 do `GuidedFlow.tsx` (~linha 997). Home usa `planningEngine.ts`, intocado.
- Borda `diasSelecionados === 0` continua retornando `null`.

## Bloco 2 — Card do plano futuro repaginado (`PainelResumo.tsx`, estado B)

Substituir o grid 2×2 atual (caixinhas com bg/border) por grid limpo só de texto, com hairline vertical central. Header (CalendarCheck, título, Pencil/X) e linha de ativação ficam iguais.

Ordem das células (preenchimento por linha):

```text
Meta líquida    |   KM estimado
Dias            |   R$/km alvo
```

Anatomia:

```tsx
<div className="grid grid-cols-2 gap-x-4 gap-y-3.5 px-1 relative">
  <div className="absolute left-1/2 top-1.5 bottom-1.5 w-px bg-border/40" aria-hidden />
  <div>
    <p className="text-[10px] uppercase tracking-[0.1em] text-muted-foreground font-semibold mb-1">Meta líquida</p>
    <p className="text-[17px] font-semibold tabular-nums text-foreground">{fmtBRL(settings.nextPlanGoal)}</p>
  </div>
  {/* KM estimado, Dias, R$/km alvo — mesmo padrão */}
</div>
```

- Sem `bg-*`, `border-*` ou `ring-*` nas células.
- Unidade `km` em `<span className="text-xs font-medium text-muted-foreground">`.
- Valores: Meta = `fmtBRL(settings.nextPlanGoal)`; KM = `${(avgKm × dates.length).toLocaleString("pt-BR")} km`; Dias = `dates.length`; R$/km = `nextKmTotal > 0 ? fmtBRL2((nextPlanGoal + consideredCosts) / nextKmTotal) : "—"` (reaproveitar o cálculo já existente no card).
- Bordas: R$/km → "—" quando `nextKmTotal <= 0`.

## Bloco 3 — Confirmação ao cancelar plano futuro

Replicar o padrão do `AlertDialog` de "Refazer" já existente em `PlanejamentoInteligente.tsx`.

- Novo estado `confirmCancelNext`.
- `onCancelNext` passado ao `PainelResumo` vira `() => setConfirmCancelNext(true)`; o `handleCancelNext` atual (que limpa `nextPlan*` via `updateSettings`) só roda no botão destrutivo do dialog.
- Texto:
  - Título: `Cancelar o plano de ${capFirst(proxMes)}?` (mês dinâmico, mesma fonte do nome usada hoje no card/banner).
  - Descrição: "Você vai precisar montar o planejamento de novo do zero se quiser planejar esse mês outra vez."
  - Cancel: "Voltar". Action destrutivo: "Sim, cancelar".
- Fechar por ESC / clicar fora / Voltar não altera nada. Erro de rede no `updateSettings` já é tratado pelo await; só garantir que o dialog feche sem deixar estado pendurado.

## Critérios de aceite

- Step6 modo líquido: META "pra faturar" = `faturamentoNecessario / dias`, coerente com R$/km mínimo. Modo bruto e Home inalterados.
- Card futuro: 2×2 sem caixinhas, ordem Meta/KM em cima e Dias/R$/km embaixo, hairline central sutil, altura visivelmente menor.
- Cancelar abre confirmação; "Voltar" preserva, "Sim, cancelar" apaga; nome do mês dinâmico.
- `tsgo --noEmit` passa.
