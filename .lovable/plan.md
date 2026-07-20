# Posicionamento definitivo do balão do tour

Escopo: apenas `src/components/tour/TourOverlay.tsx`. Nenhuma outra alteração.

## O que muda

### 1. Remover Radix Popover
O balão hoje usa `Popover`/`PopoverAnchor`/`PopoverContent`. O Radix tem `avoidCollisions` ligado por padrão e reposiciona sozinho, ignorando a âncora manual — por isso o balão às vezes para no meio da tela cobrindo cards.

Substituir todo o bloco `<Popover>…</PopoverContent>` (linhas ~201-287) por um `<div>` com `position: fixed`, preservando o conteúdo interno intacto:
- Cabeçalho (ícone + "Passo X de Y" + título)
- Corpo (`step.body`)
- Pílula (validating spinner OU hint)
- Rodapé (barra de progresso + Pular + Voltar + Próximo)

Remover imports/vars não utilizados: `Popover`, `PopoverContent`, `PopoverAnchor`, `anchorStyle`, `popoverSide`, `popoverSideOffset`, e handlers do Popover (`onOpenAutoFocus`, `onCloseAutoFocus`, `onPointerDownOutside`, `onEscapeKeyDown`).

### 2. Adicionar import do `cn`
O bloco do novo balão usará `cn(...)` para as classes condicionais. Adicionar no topo do arquivo:

```ts
import { cn } from "@/lib/utils";
```

### 3. Escolher topo/rodapé pelo espaço real
Substituir a regra binária `targetInTopHalf = rect.top < innerHeight * 0.45` por cálculo baseado em espaço disponível acima/abaixo do alvo, com altura estimada de 240px:

```ts
const H = window.innerHeight;
const BALLOON_H = 240;

let balloonAnchor: "top" | "bottom" | "center";
if (mode === "none" || !rect) {
  balloonAnchor = "center";
} else {
  const spaceAbove = rect.top;
  const spaceBelow = H - (rect.top + rect.height);
  if (spaceBelow >= BALLOON_H && spaceBelow >= spaceAbove) {
    balloonAnchor = "bottom";
  } else if (spaceAbove >= BALLOON_H) {
    balloonAnchor = "top";
  } else {
    balloonAnchor = spaceAbove >= spaceBelow ? "top" : "bottom";
  }
}
```

Aplicar no div via classes condicionais:
- `top`: `top-[calc(env(safe-area-inset-top)+16px)]`
- `bottom`: `bottom-[calc(env(safe-area-inset-bottom)+16px)]`
- `center`: `top-1/2 -translate-y-1/2`

Centralizar horizontal sempre com `left-1/2 -translate-x-1/2`.

## Blindagem
- Balão continua `pointer-events-auto`; overlay/spotlight/glow permanecem `pointer-events-none`.
- `z-[9999]` no balão, `z-[9998]` no overlay.
- Sem Popover = zero reposicionamento automático.
- Fallback para alvos muito grandes: vai pro lado com mais espaço.

## Validação após implementação
Confirmar nos 18 passos (11 ganho + 7 gasto):
1. Nenhum balão no meio sobre cards.
2. Passos km (ganho 4) e valor do gasto (gasto 5): balão no lado oposto.
3. Dropdowns abertos (plataforma/categoria): balão não cobre a lista.
4. Passos da Home: balão no lado oposto ao alvo destacado.
5. Passo de conclusão (spotlight:false): balão centralizado.
6. Pular/Voltar/Próximo clicáveis em todos.
7. Testar 360x640 e viewport maior.
