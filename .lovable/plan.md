## Adendo — corrigir drawer "encolhido" ao fechar teclado sem novo foco

Escopo: 2 arquivos. Sem tocar em lógica de save, cálculos ou outros campos.

### Causa

1. `DrawerContent` em modo earning usa `h-[100dvh]` fixo. Em WebView Android o recálculo do `dvh` não dispara de forma confiável quando o teclado fecha por abertura de dropdown (em vez de blur normal) — a altura congela reduzida.
2. `useKeyboardAwareScroll` só mede em `resize`/`scroll` do visualViewport. O último evento pode chegar durante a animação com valor intermediário e nunca zerar.

### Correção 1 — `src/components/EntryDrawer.tsx` (~linha 422-425)

Altura com teclado aberto passa a ser controlada via `style` explícito baseado em `keyboardHeight`, em vez de depender do recálculo automático do `dvh`:

```tsx
<DrawerContent
  className={cn(
    "flex flex-col",
    tab === "earning" ? "h-[100dvh] max-h-[100dvh]" : "max-h-[92dvh]",
  )}
  style={
    tab === "earning" && keyboardHeight > 0
      ? { height: `calc(100dvh - ${keyboardHeight}px)`, maxHeight: `calc(100dvh - ${keyboardHeight}px)` }
      : undefined
  }
>
```

Quando `keyboardHeight === 0`, `style` some e a className volta ao 100dvh cheio. Modo expense (ramo `else`) intacto.

Nota sobre `paddingBottom` (linha ~436): se surgir vão duplo entre último campo e Salvar (porque o container já desconta o teclado), trocar `paddingBottom: keyboardHeight > 0 ? keyboardHeight + 24 : undefined` por `paddingBottom: keyboardHeight > 0 ? 24 : undefined`. Aplicar só se o vão duplo for observado.

### Correção 2 — `src/hooks/useKeyboardAwareScroll.ts`

Adicionar medição final agendada (~250ms) após cada evento do visualViewport, para reconfirmar o valor depois da animação do teclado terminar:

```ts
let settleTimer: number | null = null;
const measure = () => {
  const diff = window.innerHeight - vv.height;
  const threshold = Math.max(150, window.innerHeight * 0.2);
  setKeyboardHeight(diff > threshold ? Math.round(diff) : 0);
};
const update = () => {
  measure();
  if (settleTimer) window.clearTimeout(settleTimer);
  settleTimer = window.setTimeout(measure, 250);
};
update();
vv.addEventListener("resize", update);
vv.addEventListener("scroll", update);
return () => {
  if (settleTimer) window.clearTimeout(settleTimer);
  vv.removeEventListener("resize", update);
  vv.removeEventListener("scroll", update);
};
```

Corrige o caso do teclado fechar por abertura de dropdown, quando o último evento chega durante a animação. A medição final lê `diff ≈ 0` e zera `keyboardHeight`, restaurando a altura cheia via correção 1.

### Blindagem

- Correção 1: `style` `undefined` quando sem teclado — sem estado preso.
- Correção 2: timer limpo no cleanup e a cada novo evento; medição idempotente.
- Modo expense não é afetado (não usa `h-[100dvh]`).

### Validação (device real)

1. "Novo ganho" → focar Valor recebido: botões acima do teclado.
2. Com teclado aberto, tocar "Adicionar plataforma" (abre dropdown, fecha teclado): drawer volta à altura cheia.
3. Repetir várias vezes: altura sempre estabiliza.
4. Sem vão duplo entre último campo e Salvar (aplicar nota do paddingBottom se necessário).
5. Modo gasto: sem regressão.
