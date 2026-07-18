## Sprint — Tours: encadeamento + blur universal + validação com check + fix categoria

Quatro frentes independentes, todas em código de tour/drawer. Zero mudança em cálculo, save ou dados.

---

### Item 1 — Encadeamento ganho→gasto (blindagem)

**Arquivo:** `src/pages/Settings.tsx` (botão "Usuário novo (reset)")
- Auditar o payload do reset e garantir que zera TODAS as flags: `tour_earnings_seen`, `tour_expenses_seen`, `tour_history_seen`, `tour_planning_seen`, `tour_personalize_seen`, `tour_export_seen`, `tour_entries_seen` (legado). Se faltar qualquer uma, adicionar `false`.

**Arquivo:** `src/pages/Dashboard.tsx` (listener `volant:tour-finished`)
- Confirmar que o listener existente para `id === "earnings"` chama `startTour("expenses", expensesTourSteps)` após `setTimeout` curto, e que o useEffect de "entrar na Home com tarefa pendente" NÃO tem guard que bloqueie o tour de gastos logo após o de ganhos terminar (rede de segurança).

Sem mudança de comportamento se já estiver correto — apenas verificação e complemento das flags do reset. Motivo real do "não disparou" no vídeo anterior: `tour_expenses_seen=true` na conta de teste.

---

### Item 2 — Spotlight (blur) em TODAS as etapas + balão anti-overlap

**Arquivo:** `src/components/tour/TourOverlay.tsx`

**2a. Modo único de destaque.** Substituir a lógica atual `mode = noHighlight ? "none" : insideDrawer ? "glow" : "spotlight"` por: sempre `spotlight` quando há rect, `none` só quando `spotlight===false` ou sem alvo. Remove a bifurcação `insideDrawer` do cálculo do mode. As 4 camadas escuras já são renderizadas via portal no `document.body` com z-index acima do drawer e coordenadas via `getBoundingClientRect` — funcionam dentro do drawer sem ajuste extra.

**2b. Balão vai pro rodapé quando o alvo está no topo.** Calcular `targetInTopHalf = rect && rect.top < window.innerHeight * 0.45`. Substituir o anchor fixo de topo (usado hoje no modo glow) por:
- alvo no topo → anchor no rodapé (`top: window.innerHeight - 24`), `popoverSide="top"`
- alvo no meio/baixo → anchor no topo (`top: 24`), `popoverSide="bottom"`
- sem alvo → centro

Isso vale para TODOS os passos com spotlight (inclusive drawer). Nunca sobrepõe o alvo.

**2c. Ajustes de segurança visual.** Manter `collisionPadding` e `safe area` já existentes. O glow pulsante continua no rect em todos os passos.

---

### Item 3 — Validação com check no balão

**Arquivo:** `src/context/TourContext.tsx`
- Novo estado `validating: boolean` exposto no contexto.
- `notifyAction`: ao aceitar uma ação válida, `setValidating(true)` imediatamente, e após 1300ms `setValidating(false)` + `next()`.
- `next`, `prev`, `skip`, `finish`: resetar `validating=false` por segurança.
- Atualizar tipo do contexto e `useMemo` das dependências.

**Arquivo:** `src/components/EntryDrawer.tsx`
- Aumentar debounce dos preenchimentos contínuos (horas, km) de 900ms para **1400ms** em `debouncedNotify` (ou criar variante `debouncedNotifySlow` se o mesmo helper for usado por campos de toque único).
- Campos de toque único (categoria via `onValueChange`, save) permanecem sem debounce ou com debounce curto (300ms).

**Arquivo:** `src/components/tour/TourOverlay.tsx`
- Ler `validating` do contexto. No rodapé/corpo do balão (onde hoje fica a pílula de dica):
  - `validating === true` → renderiza pílula "Certo! Avançando..." com spinner (`Loader2` do lucide, `animate-spin`). Estilo primary, mesmo tamanho da pílula normal.
  - senão → pílula de dica normal (comportamento atual).
- Manter o resto do balão (título, corpo, progresso, botões) inalterado.

Timeline resultante em horas: girar → parar → 1400ms debounce → notifyAction → 1300ms "validando" com spinner → next. Sem travamento aparente, feedback contínuo.

Descartado explicitamente: validação de valores exatos (frustra usuário que quer valores próprios).

---

### Item 4 — Categoria de gasto: avanço prematuro + glow cobrindo todas as opções

**Arquivo:** `src/components/EntryDrawer.tsx` (~L788)
- Trocar o `Select` da categoria de gasto:
  - `onOpenChange`: dispara `notifyAction("opened-expense-category")` apenas quando `v === true`.
  - `onValueChange`: além de `setCategory`, dispara `notifyAction("selected-expense-category")`.
- No `SelectContent` correspondente (~L797): adicionar `data-tour="entry-expense-category-list"`. `SelectContent` já espalha props (confirmado em `ui/select.tsx`), aceita `data-tour` sem alterações na UI.

**Arquivo:** `src/lib/tours/expensesTour.ts`
- Substituir o passo único de categoria por dois passos consecutivos:
  - Passo A — target `[data-tour="entry-expense-category"]`, `actionId: "opened-expense-category"`, hint "Abre as categorias".
  - Passo B — target `[data-tour="entry-expense-category-list"]`, `actionId: "selected-expense-category"`, hint "Toca numa categoria", `placement: "bottom"`.
- Ambos com `icon: "🏷️"`, `advance: "action"`.

Resultado: abrir a lista NÃO avança para o passo de valor; o glow no passo B cerca o dropdown inteiro (Combustível incluído); ao escolher, avança limpo para "Valor do gasto".

---

### Blindagem / edge cases

- Item 2: se `targetInTopHalf` errar num caso raro, o pior é balão no topo cobrindo alvo alto — validar passos de horas e data (mais altos no drawer).
- Item 3: `validating` sempre reset em next/skip/finish. Lock `actionAdvanceLockRef` continua evitando disparo duplo.
- Item 4: se o usuário fechar a lista sem escolher, o alvo do passo B some — o poll do overlay não acha, o cleanup órfão (900ms) encerra o tour graciosamente; reabrir a lista NÃO reencontra (tour já encerrado), mas o formulário continua funcionando normal. Alternativa: se preferir robustez total, o passo B pode manter target no seletor fechado como fallback — decidir na implementação.

### Validação manual (roteiro)

1. Reset "Usuário novo" → tour de ganho completo → tour de gasto inicia sozinho.
2. Todos os passos (inclusive dentro do drawer) com fundo escurecido, só o alvo aceso.
3. Balão nunca cobre o alvo (vai pro rodapé quando alvo está no topo).
4. Horas: dá tempo de ajustar horas + minutos; ao parar, balão mostra spinner "Certo! Avançando..." e depois avança.
5. Mesmo comportamento para km, valores, categoria.
6. Categoria: abrir NÃO avança; glow cerca a lista inteira; escolher avança limpo.
