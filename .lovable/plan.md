# 4 ajustes pontuais

## Ajuste 1 — "Ajustar Meta" sem bruto/líquido
**Arquivos:** `src/components/planejamento/AjustarSheet.tsx` + `src/components/planejamento/GuidedFlow.tsx` (apenas no fluxo de edição)

- No `AjustarSheet`, o mapeamento da opção `meta` hoje envia `editSteps: [1, 2]`. O passo 1 é a escolha bruto/líquido — incoerente, já que o cadastro novo é sempre líquido.
- Trocar para `editSteps: [2]` (apenas o valor da meta mensal).
- No `GuidedFlow.finish()`, quando o usuário edita só o passo 2, garantir `patch.goalType = "liquido"` (caso o registro antigo ainda esteja com `bruto`), normalizando silenciosamente. Sem alterar tela, textos ou cálculos do passo 2.

Nada muda no fluxo inicial nem em "Refazer planejamento".

## Ajuste 2 — Card de Jornada mais compacto na Home
**Arquivo:** `src/components/JourneyModule.tsx`

Reduzir verticalmente preservando todas as funções (iniciar, pausa descanso, retornar, encerrar, meta do dia, status, prefill no fim da jornada):

- Header de status + cronômetro em **uma única linha** (status à esquerda, tempo grande à direita) em vez do bloco central atual de ~80px.
- Remover o bloco "Tempo" duplicado: o cronômetro grande passa a ser o próprio relógio principal, em linha com o status.
- Mini-stats "Trabalhado / Descanso" colapsam para uma linha discreta abaixo do cronômetro, em texto menor (apenas visíveis quando há tempo > 0 ou jornada ativa/encerrada). Quando `idle`, só aparece o CTA.
- Padding interno do card: `p-4` → `p-3.5`; gaps reduzidos; botão principal `h-11` → `h-10`.
- Tipografia do cronômetro `text-4xl` → `text-3xl tabular-nums`, mantendo legibilidade.
- Texto de rodapé ("O timer continua...") só aparece em estado `idle`; nos demais estados some para reduzir altura.
- Manter cor de acento (verde/azul) ligada a `heroView`, animações de pulse e ícones — só muda a densidade.

Resultado esperado: card encolhe ~40% em altura, retangular, ainda premium e legível.

## Ajuste 3 — Header da Landing sobrepondo a status bar do iPhone
**Arquivo:** `src/pages/Landing.tsx` (componente `Header`)

- Adicionar `style={{ paddingTop: "env(safe-area-inset-top)" }}` no `<header sticky top-0 ...>`.
- Aplicar a mesma técnica no painel mobile do menu hambúrguer (já herda o pai, mas validar).
- O `<html>` da landing já roda dark + viewport-fit=cover via `index.html`; nenhuma mudança global necessária.

Resolve o "Testar grátis" preso embaixo do relógio no iPhone 12 Pro Max e qualquer notch/Dynamic Island.

## Ajuste 4 — Teclado do iOS cobrindo campos em formulários
**Arquivos:** `src/components/EntryDrawer.tsx` (e qualquer Drawer com inputs reusa o mesmo padrão); novo hook `src/hooks/useKeyboardAwareScroll.ts`.

Causa: no iOS o teclado **não** redimensiona `100dvh`; ele apenas cobre a tela. `DrawerContent` com `max-h-[92dvh]` continua do mesmo tamanho e o input ativo fica atrás do teclado.

Correção (padrão consolidado de apps PWA):
1. Novo hook `useKeyboardAwareScroll` que:
   - Observa `window.visualViewport` (`resize` + `scroll`).
   - Quando a diferença entre `window.innerHeight` e `visualViewport.height` indica teclado aberto (>150px), expõe `keyboardHeight`.
   - No `focusin` de qualquer `input/textarea/[contenteditable]` dentro de um container ref, faz `el.scrollIntoView({ block: "center", behavior: "smooth" })` após 50ms (espera o teclado animar).
2. Aplicar no `EntryDrawer`: 
   - Anexar ref no container rolável (`<div className="flex-1 min-h-0 overflow-y-auto ...">`).
   - Aplicar `paddingBottom: keyboardHeight` nesse container quando teclado aberto, garantindo que o último campo + botão "Salvar" continuem alcançáveis com scroll.
   - Ajustar `DrawerContent` para `max-h-[100dvh]` quando teclado aberto (evita conflito do drawer "snapping").
3. O hook fica genérico e pode ser plugado em outros Drawers/Sheets com formulários (Meta da jornada, Feedback, etc.) — nesta sprint aplicamos só ao `EntryDrawer` para manter escopo crítico; demais ficam para futuro se necessário.

Sem mudanças em cálculos, dados, autenticação ou backend.

---

## Resumo dos arquivos
| Arquivo | Mudança |
|---|---|
| `src/components/planejamento/AjustarSheet.tsx` | mapeamento `meta` → `[2]` |
| `src/components/planejamento/GuidedFlow.tsx` | normaliza `goalType="liquido"` ao salvar edição de meta |
| `src/components/JourneyModule.tsx` | layout compacto preservando funções |
| `src/pages/Landing.tsx` | `paddingTop: env(safe-area-inset-top)` no `<header>` |
| `src/hooks/useKeyboardAwareScroll.ts` (novo) | hook keyboard-aware (visualViewport + scrollIntoView) |
| `src/components/EntryDrawer.tsx` | usa o hook + padding dinâmico no container rolável |
