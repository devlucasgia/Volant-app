## Problema

No card de Insights Inteligentes, o texto está quebrando com espaços largos entre palavras (ex.: "que no mesmo" ocupa quase a largura toda enquanto "período de maio: R$ 67,62 por hora." fica apertado na linha seguinte). Isso ocorre porque o navegador usa o algoritmo de quebra padrão (greedy), que tende a deixar a última linha curta ("Tá rendendo!") e linhas intermediárias com espaçamento irregular em containers estreitos no mobile.

## Solução

Ajuste cirúrgico de CSS no elemento de texto do insight em `src/pages/Reports.tsx` (linha 1038). Sem mudanças em lógica, frases, dados, ícone ou layout do card.

### Alterações

1. Adicionar `text-pretty` (CSS `text-wrap: pretty`) ao `div` que renderiza `phraseShown`. Isso instrui o navegador a balancear as últimas linhas, evitando quebras com órfãs ("Tá rendendo!" sozinho) e distribuindo o texto de forma mais natural.
2. Adicionar `hyphens-none` para garantir que não apareçam hifens em palavras longas.
3. Manter `leading-snug`, `min-w-0 flex-1`, animação e demais classes já existentes.

Resultado:
- Antes: `className="min-w-0 flex-1 text-sm leading-snug text-foreground animate-fade-in motion-reduce:animate-none"`
- Depois: `className="min-w-0 flex-1 text-sm leading-snug text-pretty hyphens-none text-foreground animate-fade-in motion-reduce:animate-none"`

### Observações técnicas

- `text-wrap: pretty` tem bom suporte em Chrome/Edge/Safari recentes (que cobrem o público mobile do Volant). Em navegadores sem suporte, o fallback é a quebra padrão — ou seja, comportamento atual, sem regressão.
- Não altera altura do card (já é `h-auto`), não corta texto, não muda fonte/tamanho/cor, não mexe no alinhamento do ícone.

## Não altera

Banco de frases (`insightPhrases`), lógica de rotação/fila de insights, queries Supabase, DataContext, summarize, cálculos, herói de Lucro Líquido, gráfico, demais cards, DnD, exports, outras telas.
