# Adendo 3 à Sprint 2 — tour reconhece o menu radial do FAB

## Causa
O `+` (`data-tour="fab-new-entry"`) não abre o drawer direto: abre um menu radial com "Novo ganho" / "Novo gasto". O `notifyAction("open-entry-drawer")` só dispara ao escolher um deles. Resultado: o tour trava no passo 1, a sombra continua no `+`, e os botões radiais ficam no escuro sem como clicar.

## Mudanças

### 1. `src/components/BottomNav.tsx`
- Adicionar `data-tour="fab-earning"` no botão "Novo ganho".
- Adicionar `data-tour="fab-expense"` no botão "Novo gasto".
- No `onClick` do FAB central, disparar `notifyAction("open-fab-menu")` quando o menu abre (transição `false → true`).

### 2. `src/context/TourContext.tsx`
- Adicionar método `prev()` que decrementa `currentStepIndex` (mínimo 0), sem finalizar o tour.
- Expor `prev` no `TourContextValue` e no `value` do provider.
- Observação: voltar não desfaz ações já executadas (drawer aberto, registro salvo). É navegação de leitura do tutorial, não undo.

### 3. `src/components/tour/TourOverlay.tsx`
- Consumir `prev` do `useTour()`.
- Renderizar botão "Voltar" à esquerda quando `currentStepIndex > 0`.
- Manter "Pular" e (quando `advance === "next"`) "Próximo" à direita.
- Não mostrar "Próximo" em passos `advance: "action"` (pra não pular a ação).
- Nenhuma mudança no motor de recorte: ele já remede o alvo quando `step.target` muda, então a sombra segue sozinha do `+` pro botão radial.

### 4. `src/lib/tours/entriesTour.ts` — roteiro reescrito (8 passos)
1. `fab-new-entry` — "Toca no + pra começar." → aguarda `open-fab-menu`.
2. `fab-earning` — "Escolhe Novo ganho." → aguarda `open-entry-drawer`.
3. `entry-earning-value` — informativo, `advance: "next"`.
4. `entry-save` — aguarda `saved-earning`.
5. `fab-new-entry` — "Agora um gasto." → aguarda `open-fab-menu`.
6. `fab-expense` — "Escolhe Novo gasto." → aguarda `open-entry-drawer`.
7. `entry-save` — aguarda `saved-expense`.
8. `fab-new-entry` — "Prontinho!", `advance: "next"`.

## Validação
- Toca `+` → menu abre → sombra vai pro "Novo ganho" (visível/clicável) → balão "Escolhe Novo ganho".
- Toca "Novo ganho" → drawer abre → balão "Quanto você recebeu" com "Próximo".
- Salva ganho → volta Home no passo do gasto; repete pro gasto.
- Botão "Voltar" reexibe passo anterior; "Pular" encerra.
- Nenhum passo com sombra em posição errada.
