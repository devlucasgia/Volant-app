## Correções do Tour

### 1. Tour dispara durante o Onboarding (print 1)
**Causa:** `Dashboard.tsx` chama `startTour(...)` num `useEffect` com timeout de 800ms assim que `dataLoading` termina. Isso acontece mesmo quando o `OnboardingFlow` ainda está aberto por cima da Home.

**Fix:**
- Em `src/components/onboarding/OnboardingFlow.tsx`, expor o estado "onboarding aberto" via evento (`volant:onboarding-finished` já é disparado no `finish`; adicionar também `volant:onboarding-open` quando `setOpen(true)`).
- Em `src/pages/Dashboard.tsx`:
  - Ler `profiles.onboarded` (mesma query que já faz em outros pontos) e só disparar o cascade quando `onboarded === true`.
  - Adicionar guarda extra: se `document.querySelector('[data-onboarding-root]')` existir (marcador novo no `OnboardingFlow`), adiar. Ouvir `volant:onboarding-finished` pra re-tentar.
  - Aumentar o delay pra 1200ms pra dar tempo da Home pintar 100%.

### 2. Botão "Próximo" travado no passo 3 (Horas)
**Causa real (vista no print 2):** o drawer de ganhos fechou antes do passo 3 aparecer (o glow ficou preso em elementos da Home). O seletor `[data-tour="entry-hours"]` não existe mais no DOM, mas o `TourOverlay` mantém o popover com anchor central e o "Próximo" fica visível. Como o step atual referencia um alvo que sumiu, algo re-renderiza em loop e o clique não avança (o `useTargetRect` fica em polling e mede `null` continuamente, mas o `Next` em si deveria funcionar — o problema visível é que o tour continua fora de contexto).

**Fix combinado com item 3:** se o drawer fechar durante um passo cujo alvo está dentro dele, o tour finaliza (`finish()`). Isso remove o estado inconsistente que trava a UX. Além disso:
- Em `TourOverlay.tsx`: quando `mode !== "none"` e `rect === null` por mais de ~800ms consecutivos, chamar `skip()` pra não deixar o tour órfão.
- Garantir que `next()` no `TourContext` sempre execute — hoje ele depende de `steps.length` no `useCallback`; validar que nada bloqueia (nenhuma alteração esperada, apenas verificação).

### 3. Fechar o formulário mata o contexto do tour
**Escolha do usuário:** impedir o fechamento enquanto o tour estiver ativo (opção 2).

**Fix em `src/components/EntryDrawer.tsx`:**
- Ler `activeTour` via `useTour()`.
- Quando `activeTour === "earnings" || activeTour === "expenses"`:
  - Esconder o botão **Cancelar** (linha ~749). Só resta "Salvar" ou "Pular" (do balão do tour).
  - Manter `dismissible={false}` (já está) e bloquear `onOpenChange(false)` vindo de qualquer origem que não seja `notifyAction("saved-*")`.
- Como salvaguarda: no `TourContext`, se o tour estiver ativo e o passo atual apontar pra um alvo dentro do drawer, e o drawer for desmontado, executar `finish()` (via o timeout no `TourOverlay` proposto acima).

### Arquivos a alterar
- `src/components/onboarding/OnboardingFlow.tsx` — disparar evento `volant:onboarding-open` e marcar root com `data-onboarding-root`.
- `src/pages/Dashboard.tsx` — gate por `profiles.onboarded` + escuta de `volant:onboarding-finished` antes do `startTour`.
- `src/components/EntryDrawer.tsx` — esconder botão Cancelar enquanto tour ativo; travar `onOpenChange`.
- `src/components/tour/TourOverlay.tsx` — auto-`skip()` se o alvo sumir por mais de ~800ms (tour órfão).

Nada de mudança em banco, cálculos, RLS ou visual fora do tour.