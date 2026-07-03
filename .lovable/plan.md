# Landing v2 — Home mockup fiel, copy, depoimentos e pricing

Escopo: **somente `src/pages/Landing.tsx`**. Nenhum outro arquivo será tocado. `MockHeader` e `MockTabs` compartilhados não serão alterados — o HomeMockup terá header **e** barra de período **locais**.

---

## Bloco A — Novo HomeMockup fiel à Home real

Substituir integralmente o corpo da função `HomeMockup` (linhas ~2007-2130), mantendo assinatura `HomeMockup({ mode })` e reusando `useHeroMode` (já vem via prop do Hero), `AnimatedNumber`, `PhoneFrame`, `fmtBRL`, `fmtBRLInt`, `volantSymbol` (já importado no arquivo).

**Imports a adicionar** no import de `lucide-react` (~linha 35): `Bell, Eye, EyeOff, Route, CalendarRange`. Já importados e reutilizados: `Gauge, Target, Check, ChevronRight, Clock`.

**Regras duras**
- Fonte única do modo = prop `mode`. Nenhum `useState`/`setInterval` de alternância interna. Único estado local permitido: toggle do olho (ocultar valores), decorativo.
- Coerência numérica fixa: bruto **R$ 402,00**, gastos **R$ 87,50**, líquido **R$ 314,50**, R$/hora **R$ 50,25** (402÷8), R$/km real **R$ 2,21** (402÷182), R$/km mínimo **R$ 1,74**, meta líquida 314,50/350,00 (90%, faltam 35,50), meta bruta 402,00/460,00 (87%, faltam 58,00). Meta e herói mostram o **mesmo** valor com centavos (`fmtBRL`, não `fmtBRLInt`).
- Sem azul fixo (`sky-400` etc.) fora da bolinha "Bruto" e do tema goal-gross no modo bruto.
- Sem layout shift entre modos; sem text-truncate a partir de 290px de frame.
- `prefers-reduced-motion` respeitado (já garantido por `AnimatedNumber` e classes existentes).

**Anatomia (top → bottom, dentro do `PhoneFrame`)**

1. **Header local** (não usa `MockHeader` compartilhado): linha flex compacta com `<img src={volantSymbol} alt="" className="h-6 w-6 rounded-full" />` + coluna com "Olá, Motorista 👋" (bold ~12.5px) e "Quinta-feira, 2 de julho" (muted/70 ~8px). À direita, `Bell` em muted. Sem frase motivacional. Padding vertical comprimido para caber o card de Performance inteiro no frame.
2. **Barra de período local** (não reusa `MockTabs`): trilho `border-b border-border/30`, tabs "Hoje | Semana | Mês" centralizadas, estilo **flat com underline** de 2px no ativo ("Hoje") na cor do tema (`bg-success` em líquido, `bg-[hsl(var(--goal-gross))]` em bruto, transição 500ms). Ícone `CalendarRange` pequeno absoluto à direita, em muted.
3. **Card herói**: borda + gradiente `from-<tema>/25 via-<tema>/12 to-<tema>/5`, transição 500ms. Dois blobs blur decorativos (canto sup. dir. na cor do tema; canto inf. esq. em `primary-glow/15`). Topo esquerda: eyebrow `Gauge` + "LUCRO LÍQUIDO"/"GANHO BRUTO" (uppercase, tracking largo, cor do tema) + subtítulo "DEPOIS DOS GASTOS"/"ANTES DOS GASTOS" (muted/55). Topo direita: segmented decorativo local (Líquido | Bruto) refletindo `mode` + botão `Eye`/`EyeOff`. Valor grande ~30px bold tabular com `AnimatedNumber` (~380ms). Divisor na cor do tema. Linha secundária centralizada: líquido → "● Bruto R$ 402,00 | ● Gastos R$ 87,50" (bolinha goal-gross / destructive); bruto → "● Líquido R$ 314,50" (bolinha success). Clicar no olho borra ("R$ •••••"), estado local.
4. **Eyebrow "PLANEJAMENTO INTELIGENTE"** (uppercase, tracking largo, muted).
5. **Card Meta**: linha topo: `Target` + "Meta líquida"/"Meta bruta" (texto na cor do tema) à esquerda; à direita `R$ 314,50` bold + separador + `R$ 350,00` muted + `ChevronRight`. Barra `h-2` na cor do tema com `key={mode}` para re-animar. Rodapé: "Faltam R$ 35,50" muted + "90%" semibold cor do tema. Sempre com centavos, idêntico ao herói.
6. **Conector vertical** 1×8px `bg-border/40` centralizado, entre Meta e KM.
7. **Card R$/km Inteligente** (não muda com toggle — sempre bruto no produto): `Gauge` `text-success` com respiração sutil + "R$/km mínimo" (label curto) + "R$ 1,74" bold com "/km" muted + `ChevronRight`. Barra verde 89%. Rodapé "182 km rodados · Meta 205 km" muted + "89%" em `text-success`. Remove o antigo "R$/KM Bruto R$ 4,15".
8. **Eyebrow "PERFORMANCE"**.
9. **Card único de Performance**: `grid grid-cols-2 divide-x divide-border` num único card com padding pequeno. Col1: `Clock` `text-success` + "R$ / HORA" + "R$ 50,25" bold + "8,0h trabalhadas" muted. Col2: `Route` `text-success` + "R$ / KM" + "R$ 2,21" em `text-success` + "R$ 0,47 acima do mínimo" em `text-success`. Sem `sky-400`.
10. **Bottom nav**: reusar `MockBottomNav` existente (Início ativo verde, FAB central `+`).

---

## Bloco B — Subtítulo do Hero

No `<p>` `hero-anim hero-anim-3` (linha ~385), substituir o texto por:

> "Meta do dia calculada sozinha e o R$/km mínimo pra corrida valer a pena. Você dirige, o Volant faz as contas."

Nada mais no Hero muda.

---

## Bloco C — Remover depoimentos

- Remover `<Testimonials />` (linha 109).
- Remover a função `Testimonials`, o tipo `Testimonial`, o array de items e `TestimonialsCarousel` (só é usado dentro de `Testimonials`).
- Grep antes de finalizar por âncoras/links para depoimentos; remover se existirem.
- Ajustar apenas padding vertical entre `SecondaryFeatures` e `Comparison` se o corte deixar as seções coladas/ocas.

---

## Bloco D — Card Mensal do Pricing sem azul

No `article` do card Mensal (~linhas 1609-1647):
- `hover:border-[hsl(214,90%,60%)]/50` → `hover:border-border`.
- Badge "Flexível": trocar `border-[hsl(214,90%,60%)]/40 bg-[hsl(214,90%,55%)]/10 text-[hsl(214,90%,75%)]` por `border-border/60 bg-muted/40 text-muted-foreground`.
- `Check` dos benefícios: `text-[hsl(214,90%,70%)]` → `accent-text` (mesmo verde do card Anual), para consistência entre cards.
- Botão CTA: `hover:border-[hsl(214,90%,60%)]/60` → `hover:border-border`.
- Trust pill: `trust-pill-blue` → variante neutra/verde existente; se só existir azul, cair para `trust-pill` sem modificador. Verificado na implementação.

Não altera card Anual, glows ambientais (`pricing-amb-*`), preços nem textos.

---

## Critério de aceite
- HomeMockup visualmente equivalente ao HTML de referência, card de Performance inteiro visível dentro do frame.
- Alternância líquido/bruto suave via prop, sem layout shift, sem azul fora do tema bruto.
- Novo subtítulo do herói no ar, sem outras mudanças de copy.
- Zero referência à seção de depoimentos.
- Card Mensal sem azul decorativo.
- Apenas `src/pages/Landing.tsx` alterado.
