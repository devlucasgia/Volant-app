# Adendo — 3 correções no tour

## 1. Encadeamento ganho→gasto (cache stale)

**Arquivo:** `src/context/TourContext.tsx`

- Extrair o fetch das flags `tour_*_seen` numa função `refetchSeenFlags` memoizada por `user`.
- Manter o `useEffect` inicial chamando `refetchSeenFlags()`.
- Adicionar um segundo `useEffect` que escuta `window` → `volant:first-steps-changed` e chama `refetchSeenFlags()` — assim o reset "Usuário novo" recarrega o cache sem precisar reload.

**Arquivo:** `src/pages/Settings.tsx`

- Confirmar que o botão de reset dispara `window.dispatchEvent(new CustomEvent("volant:first-steps-changed"))` após o update. Se não disparar, adicionar.

## 2. Glow fantasma na transição de passo

**Arquivo:** `src/components/tour/TourOverlay.tsx` (hook `useTargetRect`)

- No início do `useEffect([selector])`, chamar `setRect(null)` imediatamente antes de qualquer poll. Isso garante tela sem glow durante a transição até o novo alvo ser medido.

## 3. "Adicionar plataforma" — dois passos (padrão categoria)

**Arquivo:** `src/components/EntryDrawer.tsx` (~656)

- No `Select` de adicionar plataforma: adicionar `onOpenChange={(v) => { if (v) notifyAction("opened-add-platform"); }}`.
- Manter `onValueChange` intacto (continua chamando `notifyAction("used-add-platform")`).
- No `SelectContent`, adicionar `data-tour="entry-add-platform-list"`.

**Arquivo:** `src/lib/tours/earningsTour.ts`

- Substituir o passo único "Rodou em outro app?" por dois passos:
  - A) `target: entry-add-platform`, `actionId: "opened-add-platform"`, hint "Abre as plataformas".
  - B) `target: entry-add-platform-list`, `actionId: "used-add-platform"`, hint "Toca numa plataforma".
- Demais passos (preencher 2ª plataforma → salvar → hero) inalterados.

## Escopo preservado

- Sem mudanças de schema, RLS, cálculos, filtros, dados.
- Sem redesign — apenas fixes de estado/timing no motor do tour e um split de passo do add-platform.

## Validação manual

1. Reset "Usuário novo" → concluir tour de ganho → tour de gasto abre sozinho, sem reload.
2. Transição passo 2→3 do ganho: nenhum glow no Salvar; glow surge direto no campo de valor quando o drawer assenta.
3. Passo "Rodou em outro app?": glow no botão; abrir → glow migra pra lista; escolher app → avança.
4. Tour de gasto (categoria) continua funcionando igual.
