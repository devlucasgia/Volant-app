## Parte 1 — Corrigir posição do eyebrow "VISÃO GERAL"

**Arquivo:** `src/pages/Reports.tsx` (função `flushRowGroup`, ~linhas 1070-1132).

**Causa:** `overviewEyebrowRendered` libera o eyebrow no primeiro `flushRowGroup`, que costuma ocorrer ANTES do bloco de Insights (quando há qualquer métrica antes de `insights` em `visibleKeys`). Resultado: o título aparece acima do card de Insights.

**Correção mínima:**
- Renomear a flag para `insightsRendered` (inicialmente `false`).
- Setar `insightsRendered = true` dentro do branch `k === "insights"`, somente quando o `node` existe e é empurrado em `blocks`.
- Em `flushRowGroup`, condicionar o eyebrow a `insightsRendered && !overviewEyebrowRendered` (manter `overviewEyebrowRendered` para garantir unicidade quando o walker quebrar o grupo em pedaços após Insights).
- Nenhuma outra mudança em hero, chart, insights, frases, cálculos.

**Aceite:** Ordem na tela = Herói → INSIGHTS INTELIGENTES → card → VISÃO GERAL → lista de métricas. Apenas um eyebrow.

---

## Parte 2 — Exports com identidade Volant

**Arquivo:** `src/pages/Reports.tsx` (funções `exportPDF`, `exportXLSX`, `exportCSV`, ~linhas 176-275). Sem mexer em queries, DataContext, `summarize`, cálculos da tela. Dados continuam vindo de `filtered`, `s`, `workedDays`, `avgPerDay` (já usa `s.gross / workedDays`).

### PDF — `jsPDF` + `jspdf-autotable` (já instalados)

Estrutura nova (substitui `exportPDF` inteira):

1. **Cabeçalho escuro** (faixa ~28mm no topo):
   - `doc.setFillColor` com tom dark (`#0F172A`), retângulo da largura da página.
   - Logo: importar `volant-symbol-header.png` como base64 (via `import logoUrl from "@/assets/volant-symbol-header.png"` + `fetch` → `FileReader` → `dataURL`) e desenhar com `doc.addImage` à esquerda. Fallback: texto "V" estilizado se carregamento falhar (try/catch).
   - Texto branco: "Volant" (bold, ~16pt) e subtítulo "Relatório de ganhos" (10pt) ao lado do logo.
   - À direita: `periodLabel` (10pt) e "Gerado em DD/MM/AAAA HH:MM" (8pt).
2. **Faixa verde** (#22c55e), altura ~2mm, logo abaixo do cabeçalho.
3. **Bloco de destaque** (corpo branco):
   - Label cinza "Lucro líquido" (9pt).
   - Valor `brl(s.net)` em verde #16A34A, ~28pt bold.
   - Subtítulo cinza: `Bruto ${brl(s.gross)} · Gastos ${brl(s.totalExpenses)}`.
4. **Grade de métricas** (3 colunas × 2 linhas) usando `autoTable` com `theme: 'plain'`, células com label pequeno em cinza + valor bold:
   - R$/hora, R$/dia (= `avgPerDay`, já bruto), R$/km, R$/corrida, Dias ativos, KM total.
5. **Tabela de lançamentos** (`autoTable`):
   - Colunas: Data · Tipo · App/Categoria · KM · Horas · Valor.
   - `headStyles`: fundo dark `#0F172A`, texto branco, bold.
   - `alternateRowStyles`: fundo `#F8FAFC`.
   - `didParseCell` para colorir Tipo+Valor: verde `#16A34A` para Ganho, vermelho `#DC2626` para Gasto.
   - `columnStyles`: KM, Horas, Valor alinhados à direita; Valor com `halign: 'right'`.
6. **Rodapé** via `didDrawPage`:
   - Fina faixa verde acima do rodapé.
   - Linha 1 centralizada (8pt, cinza): "Gestão Financeira Inteligente para motoristas de app".
   - Linha 2 centralizada (7pt, cinza): `Gerado pelo Volant em DD/MM/AAAA · usevolant.app`.

### Excel — `xlsx` (SheetJS, já em uso via import dinâmico)

Substitui `exportXLSX`. SheetJS community NÃO suporta estilos (`!fill`, `!font`) de forma garantida — vamos:
- Aplicar estilos opcionais via propriedade `s` em cada célula (funciona se o build for `xlsx-js-style`; se não, ignorado silenciosamente). **Para garantir as cores**, trocar dependência: usar `xlsx-js-style` (drop-in compatível com a mesma API; instalar como nova dep). Importar dinamicamente `xlsx-js-style` em vez de `xlsx`.

**Aba "Resumo":**
- Linhas 1-3: "Volant — Relatório", `Período: …`, `Gerado em: …` com fundo verde `#22C55E`, texto branco, bold, fonte Calibri 12.
- Linha em branco.
- Bloco indicadores (Indicador / Valor) com cabeçalho em negrito. Valores monetários com `z: 'R$ #,##0.00'` (números nativos, não string). Métricas: Lucro líquido, Bruto, Gastos, Dias, KM total, Corridas, R$/hora, R$/dia (bruto), R$/km, R$/corrida.
- `!cols` ajustado (label ~28, valor ~18).

**Aba "Lançamentos":**
- Cabeçalho: Data · Tipo · App/Categoria · KM · Horas · Corridas · Valor · Observações. Fundo `#0F172A`, texto branco, bold.
- `!freeze`/`!views`: `[{ ySplit: 1 }]` para freeze panes na linha 1.
- Datas como `Date` real com `z: 'DD/MM/YYYY HH:MM'`.
- Valor como número com `z: 'R$ #,##0.00'`.
- Cor por célula (Tipo + Valor): verde `#16A34A` (Ganho), vermelho `#DC2626` (Gasto).
- `!cols` autoajuste baseado no maior conteúdo por coluna.
- Linha final "Total": `SUM` (fórmula `=SUM(G2:Gn)`) com cor neutra bold; uma linha para Total Ganhos e outra Total Gastos (filtragem manual ou somas separadas usando SUMIF).

### CSV — sem alteração funcional

Já está em UTF-8 com BOM (`\uFEFF`) e separador `,`. Apenas confirmar que cabeçalho contém acentos (já contém "Observações"). Nenhuma mudança.

### Nova dependência
- `xlsx-js-style` (drop-in para `xlsx`, mesma API + suporte a estilos). Substitui o `await import("xlsx")` por `await import("xlsx-js-style")`.

---

## Não-alvos (não mexer)
Queries Supabase, `DataContext`, `summarize`, DnD, gráfico, insights, frases, cálculos, herói, FAB, demais telas, eyebrow "INSIGHTS INTELIGENTES" (permanece).

## Arquivos editados
- `src/pages/Reports.tsx` (Parte 1 + reescrita de `exportPDF` e `exportXLSX`).
- `package.json` (adicionar `xlsx-js-style`).
