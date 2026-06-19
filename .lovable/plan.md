## Sprint — Redesign Card Jornada + Fix KM Inteligente

Escopo: `src/components/JourneyModule.tsx` e `src/pages/Dashboard.tsx`. Sem tocar em queries, contextos, planningEngine, useHomeOrder, cálculos, AuthContext ou outras telas.

---

### Item 1 — Eyebrow "JORNADA · Toque para iniciar" só no idle

Em `Dashboard.tsx`, no eyebrow da seção Jornada:
- Quando `timerState === "idle"`: texto `JORNADA · Toque para iniciar`.
- Demais estados: `JORNADA`.
- Mantém ícone, caps, tracking e cor (`text-muted-foreground`) atuais.

Implementação: ler o estado do timer (já disponível via `useTimer()` que o Dashboard usa para `timerState`) e renderizar string condicional.

---

### Item 2 — Card idle: só ícone Play grande, sem textos

Em `JourneyModule.tsx`, bloco `if (state === "idle")`:
- Remover todo o texto interno ("Iniciar jornada" + "Toque no card para iniciar").
- Substituir por um único `Play` (h-10 w-10) centralizado vertical e horizontalmente.
- Cor do ícone: verde (`text-success`) no modo Líquido, azul (`text-[hsl(var(--goal-gross))]`) no modo Bruto — mesma cor da borda pulsante.
- Padding vertical do botão ajustado para dar presença visual (≈ py-6) mantendo proporção.
- Chevron `ChevronRight` continua absoluto à direita.
- Borda pulsante (`animate-breath` + `pulseBorder`) e comportamento clicável preservados.
- `aria-label="Iniciar jornada"` no botão.

Estado folga: mantém o conteúdo atual (Coffee + texto), pois o item se refere apenas ao card "não iniciada". Apenas o ramo não-folga é simplificado.

---

### Item 3 — Estados ativo e em descanso: botões só com ícone

Em `JourneyModule.tsx`, bloco final dos estados ativos:
- **Pausar** (`state === "running"`): botão tamanho icon, `Coffee` h-5 w-5, cor `text-warning`, fundo neutro/outline. `aria-label="Pausar jornada"`.
- **Retornar** (`state === "resting"`): botão tamanho icon, `Play` h-5 w-5, cor verde (gradiente success atual ou `text-success` sobre fundo claro). `aria-label="Retornar à jornada"`.
- **Encerrar** (running/resting): botão tamanho icon, `Square` h-5 w-5 branco sobre fundo `bg-destructive`. `aria-label="Encerrar jornada"`.
- Todos com mesma altura (h-10 w-10) e mesmo border-radius, alinhados em `gap-2`.
- Confirmação `AlertDialog` antes de encerrar permanece intacta.

---

### Item 4 — Estado encerrado: ícone + resumo compacto

- **Nova jornada**: substituir botão "Nova" texto+ícone por icon-only `RotateCcw` h-5 w-5, mesma cor/estilo atual (gradiente accent). `aria-label="Nova jornada"`.
- O botão `reset` (limpar tempos) atual já é icon-only — mantém.
- **Resumo**: substituir `Trab. {formatHMS(workMs)} · Pausa {formatHMS(restMs)}` por helper local `formatCompactDuration(ms)`:
  - `< 60s` → `Xs`
  - `< 60min` → `Xm`
  - `>= 1h` → `XhYm` (sem segundos; omitir `Ym` se 0)
- Renderização: 
  - Se `restMs === 0`: `{work} trabalhados`
  - Senão: `{work} trab. · {rest} pausa`
- Classe `text-[11px] text-muted-foreground tabular-nums whitespace-nowrap` para não quebrar linha.

---

### Item 5 — KM Inteligente: label e sem truncamento

Em `Dashboard.tsx`, no bloco compacto do card KM Inteligente:
- Trocar label `R$/km mínimo` por `R$/km`.
- Remover quaisquer `truncate` / `overflow-hidden` na linha; garantir `whitespace-nowrap` nos chips numéricos e `min-w-0` controlado para que o `·`, valor `R$ X,XX /km`, `X.XXX km restantes` e chevron `›` fiquem 100% visíveis.
- Ajustar font-size se necessário (ex.: reduzir o valor de `17px` para `15px`/`text-sm`) apenas o suficiente para caber em 360–375px de largura.
- Lógica, valor calculado e navegação preservados.

---

### Critérios de aceite

1. Eyebrow muda só no idle.
2. Card idle: apenas Play grande centralizado + chevron + borda pulsante.
3. Ativo/descanso: botões icon-only (Coffee/Play/Square) com aria-labels.
4. Encerrado: `RotateCcw` icon-only + resumo compacto sem quebra de linha.
5. KM Inteligente: "R$/km" sem "mínimo", linha inteira visível sem `...`.
6. Nenhuma outra tela tocada.

### Não altera

Queries, DataContext, useHomeOrder, planningEngine, cálculos do KM Inteligente, tela de detalhe, AuthContext, lógica de folga, modal de Meta, demais cards, Relatórios, Histórico, Ajustes, Admin.
