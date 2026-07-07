
# Sprint — Compartilhar Resultado (correções pré-Parte 2)

Escopo: **apenas** `src/components/share/ShareResultCard.tsx`, `src/components/share/ShareResultSheet.tsx` e `src/lib/shareImage.ts`. Nenhum arquivo fora dessa lista muda. `Dashboard.tsx` e a origem de `shareCardData` ficam intactos.

## Problemas atuais

1. **Prévia quebrada** (mobile e desktop): o card usa `aspectRatio` + larguras em `%`, mas as fontes/paddings são em `px` absolutos calculados para um design de 360 px. Ao renderizar em um wrapper de 220 px (story) ou 280 px (quadrado), o valor "R$ 155…" transborda e o header quebra em várias linhas. O PNG final sai "menos errado" só porque o nó de exportação é renderizado à parte em 1080 px — a prévia e a saída divergem visualmente.
2. **Salvar e Compartilhar disparam a mesma ação** (ambos chamam `handleAction` e compartilham o `loading`), e o layout atual não é o desejado.
3. **Design divergente** do HTML de referência `volant_card_v6.2.html`: o card novo tem uma nova barra de meta ("faixa de conquista" com % dentro da barra preenchida), régua de performance com eyebrow ("PERFORMANCE"), footer com `usevolant.app` + tag, gradientes mais específicos, dimensões e proporções diferentes das atuais.

## O que fazer

### 1. Reescrever `ShareResultCard.tsx` para bater 1:1 com o HTML de referência

Um único componente, estilos 100% inline (necessário para `html-to-image`), pintado a partir da folha de estilos do `volant_card_v6.2.html`:

- **Formatos base** (dimensões do design de referência, escaláveis):
  - `story`: proporção 280×498 do design → exportação `1080×1920`.
  - `square`: proporção 300×300 do design → exportação `1080×1080`.
- **Escala única `S`**: uma constante que multiplica todos os valores em `px`. Quando `exportSize=true`, `S = 1080 / <largura-design>`. Quando `exportSize=false`, o card é renderizado sempre no tamanho de design real (280 ou 300 px de largura) e o *wrapper na prévia* aplica `transform: scale(...)` para caber — assim prévia e exportação são pixel-identicas, só escaladas.
- **Header**: logo circular (mantém `volant-symbol-header.png` arredondado, como o usuário pediu) + wordmark "VOLANT" à esquerda; à direita, período em caixa alta + data em duas linhas se necessário, `white-space: nowrap` no eixo do período, tamanho conforme referência (`8px`/`10px` no design × S).
- **Main (hero)**:
  - Eyebrow "LUCRO LÍQUIDO" / "GANHO BRUTO" com pequeno ícone (Check para líquido, TrendingUp para bruto) no verde/azul.
  - Valor grande com `R$` em superscript menor e centavos menores (`.rs` e `.cents` do CSS). Dividir `heroValue` (string tipo `R$ 155,54`) em partes: `R$` + reais + `,cents`. Fonte 45 px no story, 39 px no square (base do design).
- **Meta revolucionada**: **barra única** (34 px de altura) preenchida do 0 até `metaPct` (limitado a 100 visualmente, mas mostrando `>100%` quando bate meta). Dentro da barra preenchida, no lado esquerdo: ícone Check + "Meta batida · +R$ x,xx" (quando batida) ou texto "R$ X,XX / R$ Y,YY" (quando ainda não). À direita da barra, o percentual em negrito. Abaixo, `.goal-sub` com "Meta R$ Y,YY" à esquerda e vazio à direita quando batida, ou hint quando não batida. Cor do preenchimento muda conforme modo (verde/azul, gradiente).
- **Performance eyebrow + card**: "PERFORMANCE" pequeno em caixa alta acima, e uma régua com 3 células (`R$/hora`, `R$/km`, `Jornada`) com divisórias verticais internas de 64% da altura. Nos rótulos "OK" das células, a cor acompanha o modo (verde/líquido, azul/bruto), fiel ao CSS.
- **Bloco "Por app"** (só no `story`): mesmo card, com lista de apps + barra de progresso individual (cor do app) + linha "Gastos" separada por borda superior, valor em vermelho com `−`. **Comportamento**: se `apps.length === 0`, esconde o bloco inteiro; se `gastosValue` ausente, esconde só a linha.
- **Footer**: tag pequena ("Feito com Volant" — 8px caps) + linha com símbolo + `usevolant.app` (10 px).
- **Sem** `.tabular` extras — aplicar `font-variant-numeric: tabular-nums` no root do card.
- Todos os `hsl(...)` e gradientes copiados literalmente do CSS de referência para garantir paridade visual.

### 2. Corrigir prévia — renderizar no tamanho de design + `transform: scale`

Em `ShareResultSheet.tsx`:

- Remover o hack de "duas árvores" (uma prévia + um export escondido). Manter apenas **um** `ShareResultCard` visível, dentro de um wrapper que:
  - Tem `width: <largura-alvo-da-prévia>` e `height: width * aspect` (para reservar espaço no fluxo).
  - Envolve o card em uma div com `transform: scale(k); transform-origin: top left; width/height: designSize`, onde `k = larguraPreview / larguraDesign`.
- Para exportação: renderizar um **segundo** `ShareResultCard exportSize` **temporariamente**, fora da tela (`position: fixed; left: -10000px; top: 0; pointer-events: none`), só enquanto o botão de exportação está processando — mas ele é montado o tempo todo mesmo (custo baixo, já que é só DOM). Passa `ref` para captura.
- Larguras da prévia: `story` = **240 px de largura** (altura ≈ 427), `square` = **300 px de largura**. Isso cabe confortavelmente no sheet em mobile (largura útil ~320) e desktop (limitar a área de prévia a `max-w-md mx-auto`).
- Wrapper da prévia recebe `overflow: hidden` + `rounded-xl` + `border`, e um `bg-muted/20` para dar destaque.

### 3. Layout do sheet responsivo (mobile + desktop)

Como o sheet ocupa 100% da largura no desktop, o print 3 mostra tudo esticado. Corrigir:

- Todo o conteúdo interno do `SheetContent` (toggles, prévia, botões) fica em um container **`max-w-md mx-auto w-full`**. O sheet em si continua ocupando a largura toda (padrão do shadcn), mas o miolo é constrito a 448 px, centralizado. Isso resolve o print 3 sem tocar em nada global.
- Header do sheet ("Compartilhar resultado" + X) idem.

### 4. Separar Salvar × Compartilhar

Em `shareImage.ts`:
- Manter `generateCardImage(node)` como está (`pixelRatio: 1`).
- Substituir `shareOrSaveImage` por **duas funções**:
  - `saveImageToDevice(blob, filename)`: sempre baixa via `<a download>` + `URL.createObjectURL`. Retorna `'saved'` | `'failed'`. Não tenta Web Share.
  - `shareImageViaSystem(blob, filename)`: sempre tenta `navigator.share({ files: [file], title, text })`. Se `canShare({files})` for `false` ou `share` não existir, retorna `'unsupported'` (o chamador mostra toast "Compartilhamento não disponível neste dispositivo — use Salvar."). Trata `AbortError` como sucesso silencioso.

Em `ShareResultSheet.tsx`:
- Dois estados de loading independentes: `savingLoading` e `sharingLoading`. Cada botão desabilita apenas o seu próprio spinner; o outro botão só fica desabilitado (sem spinner) enquanto o primeiro está em andamento, para evitar cliques concorrentes na mesma captura.
- `onClick` de Salvar chama `saveImageToDevice`; `onClick` de Compartilhar chama `shareImageViaSystem`. Toasts: "Imagem salva!" / "Compartilhado!" / "Compartilhamento não disponível — use Salvar." / "Não deu pra gerar a imagem, tenta de novo."

### 5. Logo

- Continuar usando `volant-symbol-header.png` importado, arredondado (`border-radius: 999px`, `object-fit: cover`), sem trocar por outra arte. Só ajustar tamanho conforme S (22 px no design → 66 px no export do story).

## Detalhes técnicos

- `html-to-image` continua com `pixelRatio: 1` no nó já em 1080 px.
- Nenhuma mudança em `Dashboard.tsx`, em `shareCardData`, em cores/tokens globais, ou em qualquer outra rota.
- Nenhum novo asset. Nenhuma nova dependência.
- Tipos exportados (`ShareCardData`, `ShareCardFormat`, `ShareCardMode`, `ShareApp`) permanecem estáveis para não quebrar o import do Dashboard.

## Critérios de aceite

- Prévia (mobile e desktop) e imagem exportada são visualmente idênticas (só escala difere), sem valor cortado, sem header quebrado.
- Design bate com o `volant_card_v6.2.html`: barra de meta com % dentro, régua de performance com eyebrow, footer com `usevolant.app`, gradientes e cores idênticos, logo arredondada preservada.
- Salvar baixa arquivo (não abre menu de compartilhar). Compartilhar abre o menu de compartilhar do sistema (WhatsApp/Instagram/etc.) e, quando indisponível, mostra toast orientando usar Salvar.
- Botões têm loading independentes; clicar em um não trava o outro visualmente com spinner.
- Nenhum arquivo fora dos 3 listados foi tocado.
