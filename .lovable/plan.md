## Mudanças

### 1. Ícone de Insights Inteligentes → lâmpada
- `src/pages/OrganizacaoCards.tsx`: no `labels` de `ReportsOrganizer`, trocar o ícone `Sparkles` de `insights` por `Lightbulb` (lucide-react). Ajustar o import.

### 2. Card de Jornada em descanso — voltar a exibir o tempo de descanso

Hoje, quando `state === "resting"`, o card mostra apenas o `workMs` à esquerda com o rótulo "Em descanso" — o `restMs` (já disponível no `useTimer`) não aparece. Ajuste em `src/components/JourneyModule.tsx` no bloco "Estados ativo / em descanso / encerrado":

- **Esquerda (inalterada de posição)**: continua o cronômetro grande com `formatHMS(workMs)`.
  - Em `running` → dot verde/azul + rótulo "Ao vivo" (atual).
  - Em `resting` → dot amarelo + rótulo "Trabalhado" (deixa claro que esse valor está congelado enquanto descansa).
- **Novo chip central** (só em `resting`): entre o cronômetro e o grupo de botões, um chip enxuto e premium:
  - `☕` (emoji real) + `formatHMS(restMs)` em `text-warning` com `tabular-nums`, tipografia menor que o principal, sem borda pesada — apenas um `rounded-full bg-warning/10 px-2.5 py-1`.
  - Micro-rótulo abaixo em `text-[9px] uppercase tracking-wider text-muted-foreground`: "Descanso".
  - No `running`, o chip não é renderizado (mantém o card totalmente enxuto).
- **Botões (direita)**: intactos. O botão "Pausar" continua com o mesmo estilo, apenas troca o glifo interno do lucide `Coffee` pelo emoji `☕` (span com `text-lg leading-none` para manter alinhamento). Isso responde à terceira pergunta.

Resultado: exatamente a mesma silhueta atual do card em `running`; em `resting`, o descanso reaparece de forma proporcional (chip amarelo pequeno), sem quebrar o layout mobile.

### 3. Sobre o emoji de caneca
Sim, dá para usar o emoji real `☕` (U+2615, "hot beverage"). Ele renderiza nativamente no Android/iOS/desktop com cor cheia (não a linha do lucide), sem dependência externa nem custo de bundle. Vou aplicar:
- No chip de descanso descrito acima.
- No botão "Pausar" do card (substitui o `Coffee` lucide dentro do `Button`).

Fora do escopo (mantém `Coffee` do lucide, contexto diferente): `TimerFab.tsx` e o estado "Dia de folga" do próprio JourneyModule. Se quiser, aplicar depois com um pedido específico.

## Critérios de aceite

1. No print 1 (Organização de cards > Relatórios), o item "Insights Inteligentes" aparece com o ícone de lâmpada.
2. No card de Jornada, ao entrar em descanso, o motorista vê simultaneamente o tempo trabalhado (congelado, à esquerda) e o tempo de descanso rodando (chip amarelo com caneca).
3. O ícone da caneca passa a ser o emoji real `☕` no chip de descanso e no botão de pausar.
4. O card mantém o mesmo tamanho compacto e o mesmo peso visual premium do estado `running`.

## Fora de escopo
- Não altera lógica de tempo, storage ou cálculos do `TimerContext`.
- Não altera outras telas nem o TimerFab.
