# Patch D.2 v2 — Insights empáticos + Refeito badge + viabilidade

Escopo restrito aos 3 arquivos listados. Nada fora disso será tocado.

## 1. `src/lib/planningInsights.ts` — substituir pelo arquivo anexo

Sobrescrever o arquivo inteiro com o conteúdo de `volant-planningInsights-v2-3.ts` (188 linhas), via `code--copy user-uploads://volant-planningInsights-v2-3.ts src/lib/planningInsights.ts`.

Mudanças vs versão atual:
- `PlanningInsightsInput` ganha 2 campos obrigatórios: `plannedKmProportional: number` e `totalHoursWorked: number`.
- Tom empático adaptado para `rpkMinimo > 3.5` (difícil) e `rpkMinimo > 5` (impossível) — textos com "Sabemos que é puxado", recomendação de ajustar dias/meta em vez de cobrança.
- Regras BAD 1 (R$/km abaixo) e BAD 2 (KM proporcional muito abaixo) coletadas em arrays; depois rotação por `getRotationIndex` com TTL 24h em `localStorage("planning_insight_rotation")`.
- Nova WARN 3: viabilidade em horas (usa `totalHoursWorked` / `currentGross` → R$/h → horas necessárias > tempo restante).
- Retorna o grupo mais crítico (bad → warn → good) e dentro dele rotaciona; sempre 1 insight no array final.

Observação sobre o brief: o brief menciona TTL de 48h, mas o arquivo anexado v2-3 usa 24h. **Vou usar o arquivo anexado como fonte da verdade** (ordem explícita do usuário: "Substituir o arquivo pelo anexado"). Se quiser 48h, alterar `ROTATION_TTL` depois.

## 2. `src/components/planejamento/PainelResumo.tsx`

### 2a. Badge "Refeito" inline no card esquerdo
Substituir o `<div>` do label "Plano de {mesLabel}" (linhas 249–251) por:
```tsx
<div className="mb-3 flex items-center gap-2">
  <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/50">
    Plano de {mesLabel}
  </span>
  {foiRefeito && (
    <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-amber-400">
      Refeito
    </span>
  )}
</div>
```

### 2b. Remover rodapé "Refeito em DD/MM"
Remover o bloco `{dataRefazendo && (...)}` nas linhas 277–283 e a variável `dataRefazendo` (linhas 78–84). Manter `foiRefeito`.

### 2c. Novos campos para `computePlanningInsights`
Antes da chamada `computePlanningInsights` (linha 115), adicionar:
```ts
const plannedKmProportional = s.averageKmPerDay * daysWorkedInPlan;
const totalHoursWorked = useMemo(
  () =>
    entries
      .filter((e) => e.type === "earning" && new Date(e.date).getTime() >= planStartTs)
      .reduce((sum, e) => sum + (e.hours ?? 0), 0),
  [entries, planStartTs],
);
```
E passar na chamada:
```ts
plannedKmProportional,
totalHoursWorked,
```

## 3. `src/components/planejamento/GuidedFlow.tsx`

O bloco condicional de viabilidade já existe (linhas 617–629). Apenas atualizar os textos para a versão do brief:
- `> 5`: `⚠️ R$ X,XX/km é muito difícil de atingir. Considere aumentar os dias de trabalho ou reduzir a meta para um plano mais realista.`
- `> 3.5`: `💡 R$ X,XX/km é exigente. É possível, mas vai exigir corridas bem selecionadas e consistência.`

Nenhuma alteração em estrutura, classes ou condição (`plan.requiredRpk > 3.5`).

## Fora de escopo
`planningEngine`, `smartKm`, `AjustarSheet`, `EmptyState`, Dashboard, DataContext, AuthContext, queries Supabase, toggle bruto/líquida, animação de custos, herói, timeline, totais financeiros.

## Validação esperada
1. Build TS limpo.
2. Card "PLANO DE JUNHO" com badge âmbar "REFEITO" inline ao lado do título quando aplicável.
3. Rodapé "Refeito em DD/MM" removido — altura simétrica com card direito.
4. Insight com `rpkMinimo > 3,50` usa tom empático ("Sabemos que é puxado…"); `≤ 3,50` mantém tom direto.
5. Quando há 2+ insights elegíveis do mesmo tom, rotaciona a cada 24h via `localStorage`.
6. Alerta âmbar/vermelho no passo de KM do GuidedFlow com os novos textos.
