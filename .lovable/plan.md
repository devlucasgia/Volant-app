# Adendo 2 — Corrigir tour que trava ao abrir drawer

Dois bugs independentes, ambos corrigidos com mudanças pequenas e cirúrgicas. Zero alteração no motor (`TourContext`).

## Bug 1 — Roteiro espera ações inexistentes

**Causa:** passos 2 e 3 do `entriesTour.ts` usam `advance: "action"` com `actionId: "saved-earning"`, mas o passo 2 é sobre *digitar valor* — não existe evento para isso. Só salvar dispara `saved-earning`. O passo 2 trava eternamente.

**Fix:** passos meramente explicativos dentro do formulário viram `advance: "next"` (botão Próximo). Só passos que correspondem a uma ação real e detectável mantêm `advance: "action"`.

**Arquivo:** `src/lib/tours/entriesTour.ts` — reescrever para 6 passos com lógica válida:

1. Home → aponta `[data-tour="fab-new-entry"]`, `action: open-entry-drawer`
2. Drawer ganho → aponta `[data-tour="entry-earning-value"]`, **`next`** (informativo)
3. Drawer ganho → aponta `[data-tour="entry-save"]`, `action: saved-earning`
4. Home de novo → aponta `[data-tour="fab-new-entry"]`, `action: open-entry-drawer`
5. Drawer gasto → aponta `[data-tour="entry-save"]`, `action: saved-expense` (sem passo redundante no campo de valor — pessoa já aprendeu no ganho)
6. Home → aponta `[data-tour="fab-new-entry"]`, `next` ("Prontinho!" / Concluir)

## Bug 2 — Overlay do tour bloqueia interação no drawer

**Causa:** `TourOverlay` renderiza 4 divs escuras `pointer-events-auto` em `z-[9998]`. O Vaul drawer sobe em `z-50` (menor). O overlay fica na frente e captura todos os cliques/foco antes de chegarem ao drawer. Usuário abre o drawer mas não consegue digitar nem tocar em Salvar.

**Fix:** quando o alvo do passo está dentro de um drawer Vaul, o overlay do tour renderiza SÓ o balão (Popover) — sem as camadas escuras bloqueantes. O próprio drawer já tem backdrop `bg-black/60`, então o efeito visual de foco se mantém.

**Arquivo:** `src/components/tour/TourOverlay.tsx` — adicionar detecção:

```tsx
const targetEl = rect ? document.querySelector(step.target) : null;
const insideDrawer = !!targetEl?.closest('[data-vaul-drawer], [role="dialog"]');

// nas camadas escuras:
{rect && !insideDrawer
  ? parts.map(...)   // camadas escuras + recorte (comportamento atual)
  : null}            // dentro do drawer: sem camadas, só o balão
```

Verificar em runtime qual seletor o Vaul do projeto expõe de fato (`data-vaul-drawer` costuma existir; `[role="dialog"]` é fallback seguro). Se nenhum casar, fallback: usar `drawerOpen` do `UIContext` combinado com prefixo `entry-` no `step.target`.

O balão (Popover) segue ancorado no alvo e renderizando nos dois casos.

## Validação

1. Tocar em + → drawer abre → balão "Quanto você recebeu" aponta pro campo e **o campo aceita digitação** (não bloqueado).
2. Balão de valor mostra "Próximo" → avança pro Salvar.
3. Preencher e salvar ganho → volta pra Home, balão "Agora um gasto" no +.
4. Abrir drawer de gasto → balão "Salva o gasto", interação livre.
5. Salvar gasto → "Prontinho!" com Concluir.
6. Concluir → tarefa "registros" marcada, faixa atualiza.
7. Nenhum passo trava; "Pular" funciona em qualquer momento.

## Fora do escopo

Motor (`TourContext`), disparo no Dashboard, `data-tour` markers já colocados, integração de `notifyAction` no `EntryDrawer`. Nada disso muda.
