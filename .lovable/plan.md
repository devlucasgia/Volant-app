## Objetivo

Garantir que o herói da tela de Relatórios seja **sempre** "Lucro líquido" ou "Bruto e Gastos" — nunca Insights, R$/hora, Gráfico etc. Reset controlado para que todo usuário (novo ou existente vindo do update) veja **Líquido como herói** por padrão, podendo trocar apenas entre esses dois.

## Diagnóstico

Hoje, em `src/pages/Reports.tsx` (linha 1209), o herói é `reportOrder[0]` — mas só vira herói visual se for `net` ou `grossExpenses`; senão, nenhum herói é renderizado e o primeiro card da lista (ex.: Insights) ocupa o topo. Como `Mais > Organização de cards` deixa o usuário arrastar qualquer card para a posição 0, é possível "quebrar" o herói. Precisamos travar isso no modelo e na UI.

## Mudanças

### 1. `src/lib/reportOrder.ts` — herói fixo e migração v3
- Novo storage key `volant.reportOrder.v3` (mantém migração idempotente lendo v2 antigo e descartando).
- Introduzir helper `HERO_KEYS = ["net", "grossExpenses"]`.
- Ao ler/normalizar:
  - Garantir que **posição 0 seja um HERO_KEY**. Se não for, mover o primeiro HERO_KEY encontrado para o índice 0; se nenhum estiver presente, inserir `"net"` no início.
  - Preservar ordem escolhida dos demais cards.
- Na migração v2→v3: forçar `net` como primeiro item (independente do que o usuário tinha), preservando a ordem relativa do restante. Isso satisfaz o critério de aceite #2 (todo usuário do update passa a ver Líquido no herói na primeira abertura pós-atualização).
- `move` e `reorder`: bloquear operações que
  - tirariam ambos HERO_KEYS da posição 0, ou
  - moveriam um card não-herói para o índice 0, ou
  - trocariam a ordem relativa de forma que resulte num não-herói em posição 0.
  Em caso de bloqueio, retornar `prev` (no-op silencioso — a UI já vai desabilitar os controles inválidos).

### 2. `src/lib/reportWidgets.ts` — herói nunca oculto
- Garantir invariante: pelo menos um de `net` ou `grossExpenses` está ativo. Se o usuário tentar desligar o que estiver no herói, ignorar (no-op). A UI vai refletir isso via `disabled` no toggle.

### 3. `src/pages/OrganizacaoCards.tsx` — ReportsOrganizer em duas seções

Reformatar a aba "Relatórios" para deixar a regra visualmente óbvia:

**Seção "Card em destaque (herói)"** — no topo
- Segmented control com duas opções: `Lucro líquido` / `Bruto e Gastos`.
- Selecionar troca qual dos dois ocupa `reportOrder[0]` (o outro vai para o topo da lista abaixo, mantendo visibilidade). Toast "Alterações salvas".
- Texto auxiliar curto: "Escolha o valor principal exibido no topo da tela de Relatórios."

**Seção "Demais cards"** — abaixo
- Renderiza os itens de `reportOrder` a partir do índice 1 (todos os não-herói + o herói alternativo).
- Setas ↑/↓ e drag continuam funcionando, mas:
  - Setas do primeiro item da lista têm `↑` desabilitada (não pode subir para o herói se não for HERO_KEY).
  - Drag-and-drop: `onDragEnd` valida com a lógica travada de `reorder`; se o destino final quebraria a regra, ignora.
- HERO_KEYS que estão nesta lista (o "não escolhido") ficam com um pequeno chip `Pode ir para o herói` e permitem "promover" via um botão dedicado (equivalente ao segmented acima).
- Toggle de visibilidade do herói (`net` ou `grossExpenses` quando estiver ocupando a posição 0) fica desabilitado com tooltip curto "O card em destaque não pode ser ocultado."

### 4. `src/pages/Reports.tsx` — simplificação do herói
- Como agora `reportOrder[0]` é garantidamente `net` ou `grossExpenses`, remover o `heroKey = null` fallback. `heroKey = reportOrder[0]` diretamente.
- Não muda a renderização visual dos heróis (mantém tipografia e composição atuais).

## Critérios de aceite atendidos

1. Impossível colocar qualquer card que não seja Líquido ou Bruto/Gastos no herói — travado no modelo (`reportOrder`) + UI (segmented dedicado + validação de drag/setas).
2. Todo usuário (novo ou vindo do update) abre Relatórios com Líquido no herói graças à migração v2→v3 forçando `net` na posição 0.
3. Todos os demais cards continuam livremente reordenáveis entre si.

## Observações

- Nenhuma mudança em cálculos, banco, filtros ou navegação.
- Sem alterações em Home/Personalização fora da aba "Relatórios" de Organização de cards.
- Sem impacto em plano/planejamento/edge functions.
