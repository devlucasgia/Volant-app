## Sprint — Formulário de ganhos: teclado fluido + scrollbar do timepicker

Escopo: 4 arquivos. Nada de lógica de save, DataContext, cálculos, HoursWheel ou NumberField.

### Diagnóstico

1. **Campo "Corridas" não rola acima do teclado.** `PlatformRow.tsx` linha ~126 tem `onFocusCapture={(e) => e.stopPropagation()}`, o que bloqueia o `focusin` global do `useKeyboardAwareScroll` e impede o auto-scroll pra esse campo. É o único campo do form com esse stop.
2. **Detecção de teclado frágil no Android.** Threshold fixo de 150px em `useKeyboardAwareScroll` + ausência de `interactive-widget=resizes-content` no viewport meta.
3. **Scrollbar visível no timepicker.** `HoursWheel.tsx` usa a classe `scrollbar-none`, mas ela não está definida em lugar nenhum do projeto (nem plugin Tailwind, nem CSS). Classe fantasma.

### Correção 1 — `src/components/entry/PlatformRow.tsx` (~linha 126)

Trocar `onFocusCapture={(e) => e.stopPropagation()}` do campo Corridas por um `onFocus` que faz `scrollIntoView({ block: "center", behavior: "smooth" })` com delay de 120ms — replica o hook diretamente no campo, sem bloquear propagação e sem risco de reintroduzir efeito colateral com o Select ao lado. Idempotente se o listener global também disparar.

### Correção 2 — enrijecer detecção de teclado

**2a. `index.html` linha 5:** adicionar `interactive-widget=resizes-content` à meta viewport. Ignorado por navegadores sem suporte.

**2b. `src/hooks/useKeyboardAwareScroll.ts` linhas ~24-26:** threshold vira `Math.max(150, window.innerHeight * 0.2)`. Mantém o piso atual (nunca fica mais frouxo), fica mais robusto em telas altas.

### Correção 3 — `src/index.css`

Adicionar dentro de `@layer utilities`:

```css
.scrollbar-none {
  -ms-overflow-style: none;
  scrollbar-width: none;
}
.scrollbar-none::-webkit-scrollbar { display: none; }
```

Faz a classe já referenciada pelo `HoursWheel` funcionar. Não toca o componente.

### Blindagem

- Correção 1: campo continua recebendo foco/digitação normalmente; só passa a rolar sozinho como os outros.
- Correção 2b: piso de 150px preservado via `Math.max`.
- Correção 3: puramente aditiva; `scrollbar-none` só é usada nos wheels.
- `interactive-widget`: progressive enhancement.

### Validação (device real)

1. "Novo ganho" → tocar Corridas: rola pra área visível, sem vão gigante nem topo inacessível.
2. Alternar Valor recebido ↔ Corridas: comportamento simétrico.
3. Abrir/fechar teclado várias vezes: layout estabiliza, Salvar volta pro lugar.
4. HoursWheel: sem barra lateral ao rolar horas/minutos.
5. Textarea de observações e demais campos: sem regressão.

### Fora de escopo (avaliar depois)

Se sobrar jitter em aparelho específico, sincronizar scroll ao evento `resize` do visualViewport em vez de delay fixo de 120ms.
