## Problema

Hoje o balão do tour em `src/components/tour/TourOverlay.tsx` é fixado nas **bordas do viewport** (`top-16` ou `bottom-16`), independente de onde o alvo está. Consequências:

- Em telas do drawer (ganho/gasto), o balão no topo/rodapé **cobre outros campos importantes** (ex.: no passo "horas" o balão no rodapé cobre KM/valor/salvar).
- A altura é **estimada** em 240px; quando o balão real é maior, sobra pouco espaço e ele encosta ou cobre o alvo.
- Em passos com alvo no meio da tela (ex.: `entry-earning-value`, `home-earnings-expenses`), o balão pode ficar longe demais do alvo, quebrando a fluidez UX.
- Sem clamp horizontal em telas estreitas (406px) o padding parece cru.

Não há indício de "dois balões" no código (só um `<div>` renderiza). A percepção pode vir do balão antigo + glow novo durante a transição — vamos garantir single-source-of-truth medindo antes de renderizar.

## Objetivo

Balão único por step, sempre legível, **nunca sobrepondo o alvo em evidência**, adjacente a ele com folga, no estilo de tours de apps polidos (Nubank, Duolingo, Notion).

## Escopo

Apenas `src/components/tour/TourOverlay.tsx`. Zero mudança em contexto, tours, drawer ou lógica de avanço.

## Mudanças

### 1. Medir altura real do balão
- Criar `balloonRef = useRef<HTMLDivElement>(null)` e `useLayoutEffect` que atualiza `balloonSize` (largura/altura) sempre que `step`, `rect`, `validating` ou `steps.length` mudam.
- Primeiro render usa medida provisória (invisível via `opacity-0`) → segundo render aplica posição correta. Sem flicker porque `awaitingRect` já esconde durante transição.

### 2. Calcular posição adjacente ao alvo
Substituir o bloco atual de `balloonAnchor` por:

```ts
const GAP = 14;                       // folga alvo↔balão
const MARGIN = 12;                    // margem viewport
const W = window.innerWidth;
const H = window.innerHeight;
const bw = balloonSize.width;
const bh = balloonSize.height;

let top: number;
let left: number;

if (mode === "none" || !rect) {
  // Passo de conclusão / sem alvo → centro
  top = (H - bh) / 2;
  left = (W - bw) / 2;
} else {
  const spaceBelow = H - (rect.top + rect.height) - MARGIN;
  const spaceAbove = rect.top - MARGIN;

  // Preferir lado com mais espaço; garantir que o balão CABE sem tocar o alvo.
  if (spaceBelow >= bh + GAP && spaceBelow >= spaceAbove) {
    top = rect.top + rect.height + GAP;
  } else if (spaceAbove >= bh + GAP) {
    top = rect.top - bh - GAP;
  } else {
    // Alvo enorme (drawer inteiro) → fixar no lado com mais folga, sem sobrepor.
    top = spaceBelow >= spaceAbove
      ? Math.min(rect.top + rect.height + GAP, H - bh - MARGIN)
      : Math.max(rect.top - bh - GAP, MARGIN);
  }

  // Horizontal: tentar centralizar sobre o alvo, com clamp no viewport.
  const targetCenter = rect.left + rect.width / 2;
  left = Math.round(targetCenter - bw / 2);
  left = Math.max(MARGIN, Math.min(left, W - bw - MARGIN));

  // Respeitar safe-area vertical.
  top = Math.max(MARGIN, Math.min(top, H - bh - MARGIN));
}
```

### 3. Aplicar via `style`, remover classes de posição
- Trocar as classes condicionais `top-[…]`, `bottom-[…]`, `left-1/2 -translate-x-1/2`, `top-1/2 -translate-y-1/2` por `style={{ top, left }}`.
- Manter `position: fixed`, `z-[9999]`, `pointer-events-auto`.
- Enquanto `balloonSize` ainda não foi medido, renderizar com `opacity-0 pointer-events-none` para evitar flash na posição errada.

### 4. Legibilidade e polimento
- Aumentar corpo: `text-[13.5px] leading-[1.45]`.
- Título: `text-[15.5px]` e `text-foreground` já mantido.
- Borda: trocar `border-white/10` por `border-border/60` (funciona em dark e light).
- Largura: `w-[min(92vw,340px)]` para respirar melhor no 406px.
- Pequena seta triangular (12px) apontando ao alvo (só quando `mode === "spotlight"`): `div` absoluto no balão, `border-8` sólido cor do card, posicionada `top: -6px` ou `bottom: -6px` conforme o balão estiver abaixo/acima do alvo.

### 5. Reagir a resize/scroll
O balão precisa reposicionar quando o teclado abre/fecha. Já existe listener de resize/scroll no `useTargetRect` que refaz `measure(el)`; como `rect` muda, o cálculo de `top/left` já refaz automaticamente.

## Validação

Reset "Usuário novo" e percorrer:

1. **Todos os 11 passos de ganho + 7 de gasto**: balão sempre visível inteiro, sem cortes.
2. **Nenhum balão sobrepõe o card destacado** (com glow) — sempre GAP≥14px.
3. **Adjacente ao alvo**: balão logo acima/abaixo, não colado nas bordas do viewport.
4. **Drawer aberto**: no passo "horas", balão fica abaixo (não cobre KM/valor/salvar); no passo "salvar", balão fica acima (não cobre o botão).
5. **Passo de conclusão** (`spotlight:false`): centralizado.
6. **Viewport 406×748 e desktop**: balão nunca vaza lateralmente; clamp de 12px nas bordas.
7. **Rotação/resize**: balão realoja suavemente.
