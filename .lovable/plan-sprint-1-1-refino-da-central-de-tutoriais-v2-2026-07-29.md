# Sprint 1.1 — Refino da Central de Tutoriais (v2)

## O que corrige

1. IDs de vídeo placeholder → ids reais (`8iBQwbRZZyw` para o Short de instalação, `Pq8LPSFkG9o` para o Planejamento Inteligente).
2. Durações erradas → reais: 0:49 e 5:26.
3. Três seções (uma vazia, uma repetindo o título do vídeo) → duas: "Comece por aqui" e "Aprenda cada função".
4. Player desalinhado (vídeo cortado/empurrado pro lado) → iframe forçado a preencher 100% do quadro.
5. Thumbnail no Padrão A: banner horizontal para os dois vídeos, ícone marca d'água, play verde, título dentro da arte, selo "VOLANT"/"Assistido" e duração.

## Arquivos alterados (substituição completa, conteúdo já definido no briefing)

1. `src/lib/tutorials/videos.ts` — novas chaves de seção (`comece`, `funcoes`), campo `Icon: LucideIcon` por vídeo, ids e durações reais.
2. `src/components/tutorials/TutorialThumb.tsx` — thumb sempre em banner `aspect-[16/7.5]`, gradiente radial, ícone marca d'água, título e duração dentro da arte.
3. `src/pages/CentralTutoriais.tsx` — card vira banner (thumb no topo + descrição abaixo), títulos de seção em caixa alta/tracking, subtítulo do header atualizado. Mantém `isWatched`/`markWatched` e a prop `onMarkWatched`.
4. `src/components/tutorials/TutorialPlayerSheet.tsx` — `width/height: "100%"` no `YT.Player`, quadro `relative` com `[&_iframe]:absolute inset-0 h-full w-full`, host `absolute inset-0`.

## Não altera

`useTutorialsWatched.ts`, a migration de `tutorials_watched`, a rota em `App.tsx`, a seção "Aprendizado" em `Settings.tsx`, e tudo que a Sprint 1 já listou como intocável (DataContext, AuthContext, Tour*, FirstSteps*, planningEngine, admin).

## Detalhes técnicos

- `TutorialVideo` ganha `Icon: LucideIcon` (import de `lucide-react`), usado só pela thumb. `orientation` passa a afetar apenas o player.
- Seções antigas (`instalacao`, `planejamento`, `uso_diario`) deixam de existir; nada persistido depende delas — só `video.id` é gravado em `tutorials_watched`, e os ids não mudam, então o progresso existente continua válido.
- O fix do player usa seletor arbitrário do Tailwind sobre o iframe gerado pela API, já que o nó é criado fora do React.

## Validação

- Cada card abre o vídeo correto, inteiro e centralizado no quadro.
- Durações 0:49 e 5:26; duas seções, sem seção vazia.
- Thumbs das duas em banner horizontal idêntico.
- Planejamento em 16:9, instalação em vertical estreito.
- Assistir ~90% marca "Assistido" e persiste após recarregar.
