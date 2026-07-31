# Sprint 3 — Primeiros Passos: zonas divididas, chips de vídeo e tour

## O que muda para o usuário

- Cada tarefa do sheet "Primeiros passos" vira um cartão com duas zonas separadas por um divisor vertical:
  - Esquerda: a tarefa em si (navega, abre o registro ou dispara o tour). O chevron `›` volta a aparecer em toda tarefa pendente, inclusive nas que têm material de apoio.
  - Direita: bloco de apoio com cor e rótulo próprios — VÍDEO (verde) ou TOUR (azul para ganhos, vermelho para gastos).
- O bloco da direita nunca fica riscado nem apagado: mesmo com a tarefa concluída, continua clicável. É por ele que o usuário refaz um tour já visto.
- Na seção Aprendizado dos Ajustes, o item "Primeiros passos" some quando tudo estiver concluído, deixando só a Central de Tutoriais — igual à faixa da Home, que já some com `allDone`.

## Regras travadas

- `earnings` e `expenses` sempre exibem o bloco TOUR, mesmo que um dia exista vídeo mapeado.
- As demais tarefas exibem VÍDEO quando houver vídeo com `firstStep` correspondente em `videos.ts`, e nada quando não houver. Hoje só "Montar seu Planejamento Inteligente" tem.
- Tarefa concluída: zona esquerda com `opacity-60`, texto riscado, sem chevron, botão desabilitado.

## Arquivos alterados

1. `src/components/firstSteps/FirstStepsSheet.tsx` — substituição completa pelo código aprovado: helper `asideFor(task)` decidindo entre vídeo/tour/nada, `runTourOnHome(tourKey, force)` centralizando o disparo (navega para `/app` quando necessário), handlers de chip de vídeo e de tour, e o novo layout de duas zonas. Rodapé para a Central de Tutoriais mantido.
2. `src/pages/Settings.tsx` — envolver o botão "Primeiros passos" (linhas 933–950) em `{!firstSteps.allDone && ( ... )}` e simplificar o subtítulo para `${firstSteps.done} de ${firstSteps.total} concluídos`. O `<FirstStepsSheet />` montado no fim do arquivo permanece; o import de `ListChecks` continua em uso dentro do bloco condicional.

## Não altera

`firstSteps.ts`, `useFirstSteps.ts`, `FirstStepsStrip.tsx`, `TourContext.tsx`, `TourOverlay.tsx`, `EntryDrawer.tsx`, `earningsTour.ts`, `expensesTour.ts`, `videos.ts`, `CentralTutoriais.tsx`, `TutorialPlayerSheet.tsx`, `TutorialThumb.tsx`, `useTutorialsWatched.ts`, `Dashboard.tsx`, contextos de dados/auth, planejamento, admin.

Nenhum passo, texto, alvo ou disparo automático de tour muda. O chip de tour usa o parâmetro `force` que já existe no `startTour` desde a Sprint 2.

## Detalhes técnicos

- Tokens já existentes no design system: `--primary` (verde), `--info` (azul, `217 91% 60%`) e `--destructive` (vermelho). Nenhuma cor nova.
- O bloco de apoio é derivado da config: adicionar um vídeo em `TUTORIAL_VIDEOS` com `firstStep: "history" | "export" | "personalize"` faz o chip aparecer sem nova alteração de código.
- A lista de tarefas ganha `overflow-y-auto` para garantir rolagem no sheet em telas pequenas.

## Validação

- Tarefa pendente com vídeo mostra chevron e bloco VÍDEO; os toques não se sobrepõem.
- Tarefa concluída: esquerda apagada e riscada, direita colorida e ativa; TOUR reinicia mesmo já visto.
- Só a tarefa de Planejamento mostra VÍDEO hoje.
- Ajustes: item "Primeiros passos" visível com pendências, oculto quando tudo concluído.
