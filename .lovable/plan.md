# Sprint 1 — Central de Tutoriais (fundação)

## Objetivo

Criar a Central de Tutoriais: tela nova acessível pelo "Mais" (Ajustes), reunindo vídeos tutoriais (embed do YouTube) e a opção de rever a apresentação do Volant. Arquitetura data-driven: adicionar um vídeo no futuro = editar um único arquivo de config.

**Fora de escopo (Sprint 2):** chip de vídeo nos Primeiros Passos, link no rodapé do sheet de Primeiros Passos, botões "Refazer tour de ganhos/gastos" na central. Nada do sistema de Primeiros Passos ou de Tours é tocado agora.

## O que muda

### Arquivos novos
1. `supabase/migrations/<timestamp>_tutorials_watched.sql` — adiciona coluna `tutorials_watched jsonb not null default '[]'` em `profiles`.
2. `src/lib/tutorials/videos.ts` — config dos vídeos (fonte da verdade), com tipos `TutorialVideo`, `TutorialSectionKey`, `FirstStepKey` (o último já preparado pra Sprint 2 mas não usado agora). Seed: "Instalar no Android" (Short) + "Planejamento Inteligente".
3. `src/hooks/useTutorialsWatched.ts` — lê/grava a coluna nova; atualização otimista, idempotente, resiliente a null.
4. `src/components/tutorials/TutorialThumb.tsx` — thumbnail desenhada no app (Padrão A: gradiente + ícone marca d'água + play central + duração + selo "Assistido").
5. `src/components/tutorials/TutorialPlayerSheet.tsx` — bottom sheet com YouTube IFrame Player API (script carregado uma vez, player destruído ao fechar, marca como assistido em ENDED ou 90%).
6. `src/pages/CentralTutoriais.tsx` — tela da central: header no padrão `CentralVeiculos`, seções renderizadas a partir da config (esconde seção vazia), seção final "Boas-vindas" com botão que dispara o evento `volant:open-onboarding` (já existente).

### Arquivos alterados (só o trecho indicado)
7. `src/App.tsx` — `const CentralTutoriais = lazy(() => import("./pages/CentralTutoriais"))` + `<Route path="/ajustes/tutoriais" element={<CentralTutoriais />} />` dentro do grupo autenticado.
8. `src/pages/Settings.tsx` —
   - Criar seção "Aprendizado" contendo a entrada existente "Primeiros passos" (movida) + nova entrada "Central de Tutoriais" que navega pra `/ajustes/tutoriais`.
   - Remover o botão "Refazer tour de boas-vindas" (linhas ~959-961). O rever-apresentação agora vive na Central.

### Não altera
`DataContext`, `AuthContext`, `TourContext`, `TourOverlay`, `EntryDrawer`, `useFirstSteps`, `FirstStepsSheet`, `FirstStepsStrip`, `Dashboard`, `OnboardingFlow`, hooks DnD, admin, `planningEngine`, `smartKm`, queries Supabase existentes, `client.ts`, `types.ts`.

## Detalhes técnicos

- **Migration:** RLS de `profiles` já cobre owner select/update; nenhuma policy nova. Default `'[]'::jsonb` garante compatibilidade com perfis antigos.
- **Types Supabase:** como `types.ts` é auto-gerado e a coluna é nova, o hook usa cast `(supabase.from("profiles") as any)` até o próximo regen — mesmo padrão já utilizado em outros lugares do projeto.
- **YouTube API:** carregada via `<script src="https://www.youtube.com/iframe_api">` com promise global cacheada. Player criado ao abrir o sheet, destruído no cleanup do `useEffect`. Marca assistido via `onStateChange`: ENDED imediato ou polling 1s pra detectar `currentTime/duration >= 0.9`. Flag `markedRef` impede dupla gravação.
- **Orientação:** `landscape` → `aspect-video w-full`; `portrait` (Shorts) → `aspect-[9/16] max-w-[260px]` centralizado.
- **PlayerVars:** `rel=0, modestbranding=1, playsinline=1`.
- **Thumb assistido:** substitui marca "VOLANT" por pill verde com check.
- **Central:** seções vindas de `TUTORIAL_SECTIONS`, `videosBySection(key)` filtra; seção sem vídeo não renderiza.

## Validação

- Build passa; rota `/ajustes/tutoriais` abre.
- Seed exibe os dois vídeos nas seções corretas; player abre em 16:9 e 9:16 conforme orientação.
- Ao terminar (ou passar 90%), a thumb passa a mostrar "Assistido" após reabrir.
- Fechar o sheet no meio do vídeo interrompe o áudio (player destruído).
- "Primeiros passos" continua funcional na nova seção Aprendizado; botão antigo "Refazer tour de boas-vindas" removido do Settings.
- Botão "Rever apresentação" na Central dispara o onboarding.
