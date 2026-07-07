## Correções no card de compartilhamento

**Arquivo:** `src/components/share/ShareResultCard.tsx` (único arquivo alterado)

### 1. Barra de meta — remover valor duplicado dentro
- Dentro da barra preenchida: manter apenas `✓ Meta batida` (sem `· +R$ x,xx`).
- Fora da barra (linha abaixo): manter `+R$ x,xx acima` à esquerda e `Meta R$ x,xx` à direita, como já está.
- Vale tanto no modo story quanto no quadrado.

### 2. Modo quadrado — mais respiro no topo e destaque no valor
- **Remover header (logo + "VOLANT")** apenas no quadrado. A identidade fica no rodapé (`usevolant.app`), que já contém a logo.
- No lugar do header, exibir só a data no canto superior direito (`HOJE / 6 JUL 2026`) com mesmo estilo.
- Aumentar `heroFontSize` no quadrado: 32 → 40.
- Diminuir barra de meta no quadrado: `goalBarH` 28 → 24.
- Diminuir eyebrow "Performance": `fontSize` 9 → 8, ícone 11 → 9.
- Redistribuir espaços: subir hero um pouco do topo (mais `marginTop`), garantir centralização vertical do bloco principal via `justify-content: center` que já existe.

### 3. Modo story — alinhar "VOLANT" verticalmente com a logo
- Container do header: já usa `alignItems: "center"`, mas o `span` "VOLANT" tem `line-height` herdado que desalinha visualmente.
- Fixar `lineHeight: 1` e `display: "inline-flex"` + `alignItems: "center"` no span, e garantir que a imagem e o texto compartilhem a mesma linha de base central.

### 4. Bug — data duplicada no topo (modo story do print 2)
- Investigar: no header do card, `periodLabel` e `dateLabel` são renderizados em duas linhas. No print 2 aparece `PERÍODO / 5 JUL–5 JUL 2026` — isso é correto.
- O bug real: quando `periodLabel` já contém a data (ex: vindo de `Dashboard.tsx` como "5 jul 2026"), duplica com `dateLabel`.
- **Correção:** se `periodLabel` e `dateLabel` forem iguais ou se `periodLabel` já contiver `dateLabel`, renderizar apenas um deles. Alternativa mais segura: em `Dashboard.tsx`, garantir que `periodLabel` seja sempre o rótulo do período (`HOJE`, `SEMANA`, `PERÍODO`, etc.) e nunca a data em si.
- Vou verificar `Dashboard.tsx` antes de decidir; se a origem estiver duplicando, corrijo lá também (mudança mínima no `shareDateLabel`/`periodLabel`).

### 5. Data no topo — mais destaque
- Cor atual: `hsla(215,20%,65%,0.8)` → aumentar para `hsla(215,25%,78%,0.95)`.
- `fontSize` do bloco data: 8 → 8.5 (leve).
- Peso já é 700; manter.

### Escopo preservado
- Nenhuma mudança em lógica de dados, cálculos, filtros, `shareImage.ts` ou `ShareResultSheet.tsx`.
- Toggle Story/Quadrado, geração de PNG, salvar/compartilhar continuam iguais.
