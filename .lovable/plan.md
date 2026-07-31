# Sprint 2 — Chip de vídeo nos Primeiros Passos + Tours interativos na Central

## O que muda para o usuário

- Cada tarefa dos Primeiros Passos que tenha um vídeo correspondente ganha um chip "▶ Vídeo" que abre o player ali mesmo, sem sair do fluxo. No lançamento, só "Montar seu Planejamento Inteligente" terá chip.
- Rodapé discreto no sheet: "Quer ver tudo? Abra a Central de Tutoriais".
- Na Central de Tutoriais, nova seção "Tours interativos" com dois botões: refazer o tour de lançamento de ganhos e o de gastos — ambos levam para a Home e reiniciam o tour guiado.

## Correções incluídas

1. Mapeamento de vídeo x tarefa: hoje `videos.ts` define um tipo `FirstStepKey` próprio (install/personalize/entry/history/export) que não bate com o tipo real de `firstSteps.ts` (earnings/expenses/history/planning/export/personalize). O vídeo de instalação está marcado como `install` (tarefa inexistente) e o de Planejamento está sem marcação. Passa a importar o tipo real e mapear o vídeo de Planejamento para `planning`.
2. `startTour()` em `TourContext.tsx` retorna silenciosamente quando o tour já foi marcado como visto. Sem mudança, os botões "Refazer" não fariam nada. Ganha um parâmetro opcional `{ force?: boolean }` que pula a checagem — usado apenas por esses dois botões novos.

## Arquivos alterados

1. `src/lib/tutorials/videos.ts` — importar `FirstStepKey` de `@/lib/firstSteps`, remover o tipo local, remover `firstStep: "install"` do vídeo de instalação, adicionar `firstStep: "planning"` ao vídeo de Planejamento e criar o helper `videoForFirstStep(key)`.
2. `src/components/firstSteps/FirstStepsSheet.tsx` — reescrita completa: cada item vira um contêiner com o botão da tarefa e, quando houver vídeo, o chip ao lado; estado local para o `TutorialPlayerSheet`; link de rodapé para `/ajustes/tutoriais`. Chip visível mesmo em tarefa concluída (apenas o botão principal fica desabilitado).
3. `src/context/TourContext.tsx` — assinatura `startTour(id, steps, opts?: { force?: boolean })` e o corpo pulando a checagem de "já visto" quando `force` for verdadeiro.
4. `src/pages/CentralTutoriais.tsx` — imports de `useTour`, dos passos dos tours e dos ícones `Wallet`/`Receipt`; handler `handleReplayTour` que navega para `/app` e dispara o tour com `force: true` após 500 ms; nova seção "Tours interativos" logo abaixo de "Rever apresentação do Volant".

## Não altera

`Dashboard.tsx`, `Settings.tsx`, `useFirstSteps.ts`, `firstSteps.ts`, `FirstStepsStrip.tsx`, `TourOverlay.tsx`, `EntryDrawer.tsx`, `earningsTour.ts`, `expensesTour.ts`, `TutorialPlayerSheet.tsx`, `TutorialThumb.tsx`, `useTutorialsWatched.ts`, contextos de dados/auth, planejamento e admin. Nenhum passo, texto ou alvo de balão muda. Todo disparo sem `force` mantém o comportamento atual, incluindo o encadeamento automático ganho→gasto.

## Detalhes técnicos

- `force: true` pula inteiramente a checagem de flag (não consulta o banco); `force` ausente mantém cache + fallback de consulta como hoje.
- O chip usa o mesmo `useTutorialsWatched()` da Central, então assistir por ali reflete o "Assistido" nas duas telas.
- Cores semânticas já usadas no app: ganhos em `text-info`, gastos em `text-destructive`.

## Validação

- Só a tarefa de Planejamento mostra o chip; toque no chip abre o player sem navegar.
- Toque no corpo da tarefa mantém o comportamento atual (tour, drawer ou rota).
- Rodapé fecha o sheet e navega para a Central.
- Os dois botões novos reiniciam os tours mesmo já vistos; disparos automáticos seguem inalterados.
