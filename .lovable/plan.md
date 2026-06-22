# Sprint B+C — Redesign do PainelResumo

## Arquivo

Reescrita integral de `src/components/planejamento/PainelResumo.tsx` mantendo a assinatura `{ onAdjust, onRedo }`. Nenhum outro arquivo é tocado.

## Imports adicionais
- `useState`, `useMemo` (react)
- `Lightbulb`, `ArrowRight`, `Check`, `Route`, `ArrowLeftRight`, `Target`, `Pencil`, `RotateCcw` (lucide-react)
- `getCurrentMonthRealData` de `@/lib/smartKm` (apenas leitura)
- `useData` de `@/context/DataContext`

Removidos: `useHeroMetric`, `CompositionCard`, status banner, accordions, chips, mini-stats antigos.

## Estado local
```ts
const [viewLiquida, setViewLiquida] = useState(false); // toggle do card meta+custos
```
Não toca `heroMetric` global.

## Dados derivados
```ts
const { entries } = useData();
const realData = useMemo(() => getCurrentMonthRealData(entries), [entries]);
const daysWorkedThisMonth = realData.daysWorkedThisMonth;

const hoje = new Date();
const diaAtual = hoje.getDate();
const diasNoMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0).getDate();
const timelinePct = Math.min(100, ((diaAtual - 1) / diasNoMes) * 100);
const mesLabel = hoje.toLocaleDateString("pt-BR", { month: "long" }).toUpperCase();

const rpkAtual = s.currentKm > 0 ? s.currentGross / s.currentKm : 0;
const rpkPct = s.requiredRpk > 0 ? rpkAtual / s.requiredRpk : 0;
// cor: >=1 emerald, 0.8-0.99 amber, >0 rose, =0 muted

// composição de custos no card "custos do carro"
const isDesgaste = (label: string) =>
  /óleo|oleo|pneu/i.test(label);
const parcelasTotal = s.fixedCostItems
  .filter(i => !isDesgaste(i.label))
  .reduce((a, b) => a + b.value, 0);
const desgasteTotal = s.fixedCostItems
  .filter(i => isDesgaste(i.label))
  .reduce((a, b) => a + b.value, 0);
const fixosSoma = parcelasTotal + desgasteTotal;
const parcelasPct = fixosSoma > 0 ? (parcelasTotal / fixosSoma) * 100 : 0;
const desgastePct = fixosSoma > 0 ? (desgasteTotal / fixosSoma) * 100 : 0;

const combustivelItem = s.variableCostItems.find(i => /combust/i.test(i.label));
```

## Estrutura JSX (de cima para baixo)

1. **Timeline** — `<div>` flex: "Dia {diaAtual}" · barra fina (h-1, bg-border, inner com width=timelinePct% em gradient primary com ponto luminoso à direita via pseudo) · "{s.remainingWorkdaysCount} dias restantes".

2. **Hero "Objetivos do Dia"** — card grande com gradiente verde sutil (`from-primary/[0.10] via-primary/[0.02]`). Eyebrow com bolinha pulsante (`animate-pulse bg-primary`) + "OBJETIVOS DO DIA". Grid 2 colunas separadas por borda vertical (`divide-x divide-border/40`):
   - META: label "META", valor grande (`text-3xl font-bold tabular-nums`) = `fmtBRL(viewLiquida ? s.homeDailyNet : s.homeDailyGross)`, sub "pra faturar".
   - R$/KM MÍNIMO: label, valor `fmtBRL2(s.homeSmartRpkGross)/km` (SEMPRE bruto), sub "por corrida".
   Rodapé do card (borda-top sutil): texto pequeno muted "Fixos até você lançar novos registros — aí recalculam."

3. **Insights placeholder** — eyebrow `Lightbulb` + "INSIGHTS INTELIGENTES". Card com `border-dashed border-border/50 bg-card/40 p-4 text-center text-[12px] text-muted-foreground`: "Insights do seu plano chegam em breve."

4. **Plano vs Realizado** — eyebrow `ArrowRight` + "PLANO VS REALIZADO". Grid 2 col, gap-2.
   - Sub-labels acima de cada coluna: esquerda Check + "PLANO DE {mesLabel}" muted opacity-60 text-[10px]; direita bolinha verde pulsante + "ATÉ AGORA" text-primary text-[10px].
   - Card esquerdo: borda tracejada (`border-dashed border-border/60`), fundo `bg-muted/15`. Lista de linhas (label muted à esquerda, valor tabular à direita): Meta líquida `fmtBRL(s.homeNetTarget)`, Dias `s.selectedWorkdaysCount`, KM/dia `fmtKm(s.averageKmPerDay)`, R$/km alvo `fmtBRL2(s.requiredRpk)`.
   - Card direito: borda sólida normal, `bg-card/60`. Já fiz `fmtBRL(s.currentGross)` (text-primary), Dias rodados `daysWorkedThisMonth`, KM rodado `fmtKm(s.currentKm)`, R$/km atual `fmtBRL2(rpkAtual)` com cor dinâmica via `rpkPct`.

5. **Meta do Mês · Composição** — eyebrow `Target` + "META DO MÊS · COMPOSIÇÃO".
   - **Card de meta** clicável `onClick={() => setViewLiquida(v => !v)}`:
     - Header esquerda: "Meta {viewLiquida ? 'líquida' : 'bruta'} do mês" + `<ArrowLeftRight className="h-3 w-3 opacity-60"/>` inline.
     - Header direita (só na visão bruto): label "Falta faturar" pequeno + `fmtBRL(s.homeRemainingGross)` em `text-primary font-semibold`.
     - Valor grande `text-3xl font-bold tabular-nums`: `fmtBRL(viewLiquida ? s.homeNetTarget : s.homeGrossTarget)`.
     - Micro-linha (`text-[11.5px] text-muted-foreground`):
       - bruto: `{fmtBRL(s.homeNetTarget)} líquida + {fmtBRL(s.consideredCosts)} custos`
       - líquida: "Seu lucro até agora: {fmtBRL(s.currentNet)}" em `text-primary`
     - Barra de progresso (`h-1.5 bg-muted rounded-full overflow-hidden`) com inner width = `min(100, s.currentGross / s.homeGrossTarget * 100)%` `bg-primary transition-all duration-500`.
   - **Card de custos** (logo abaixo) com transições:
     - Wrapper `className={cn("...transition-opacity duration-500", viewLiquida && "opacity-30")}`.
     - Header: `Route` icon + "Custos do carro na sua meta".
     - Sub-header: bruto → `{fmtBRL(s.consideredCosts)} empurraram seu bruto pra cima`; líquida → "zerados nesta visão — esse dinheiro é só seu".
     - Barra de composição (`h-2 bg-muted rounded-full flex overflow-hidden`): segmento azul width `parcelasPct%`, segmento verde width `desgastePct%`, ambos com `transition-[width] duration-500`; quando `viewLiquida` ambas width 0.
     - Legenda inline: bolinha azul "Financiamento {round(parcelasPct)}%" · bolinha verde "Desgaste {round(desgastePct)}%".
     - Lista `s.fixedCostItems`: label + valor `fmtBRL(viewLiquida ? 0 : item.value)` com `transition-colors duration-300`.
     - Combustível (se existir): linha muted, valor sempre `fmtBRL(combustivelItem.value)`, sufixo "fora da meta — só referência".
     - Botão "Editar custos" → `navigate("/ajustes/veiculos/custos", { state: { returnTo: "/ajustes/planejamento" } })`.

6. **Botões** — Grid 2 col gap-2.5: "Ajustar" (`Pencil`, `onAdjust`), "Refazer" (`RotateCcw`, `onRedo`). Mesmo estilo do atual (`rounded-xl border border-border/60 bg-card/60 ...`).

7. **Nota rodapé** — `text-[11px] text-center text-muted-foreground leading-snug px-4`:
   "**Ajustar** muda só o que você tocar e guarda seu plano original. **Refazer** começa um plano novo e substitui o atual."

## Tokens / cores
Apenas tokens semânticos: `primary`, `muted`, `muted-foreground`, `card`, `border`, `foreground`. Cores de estado para R$/km atual: `text-emerald-300`, `text-amber-300`, `text-rose-300`, `text-muted-foreground`. Azul de "financiamento" no segmento de composição: `bg-sky-500/70`. Verde "desgaste": `bg-primary/70`. Sem hex hardcoded em componentes.

## Animações
Tailwind utilitários nativos: `transition-all`, `transition-opacity duration-500`, `transition-[width] duration-500`, `transition-colors duration-300`, `animate-pulse` (bolinha verde), `animate-fade-in` no container.

## Não alterado
`planningEngine.ts`, `smartKm.ts`, `GuidedFlow.tsx`, `AjustarSheet.tsx`, `EmptyState.tsx`, `PlanejamentoInteligente.tsx`, `Dashboard.tsx`, contextos, queries.

## Validação manual
1. Build TS limpo.
2. `/ajustes/planejamento` renderiza estrutura nova.
3. Toque no card meta alterna bruto/líquida; barra/itens de custos animam para 0 / opacity 0.3.
4. R$/km do herói não muda ao alternar.
5. Ajustar/Refazer continuam funcionando.
6. Home e EmptyState intactos.

## Itens fora de escopo que identifiquei (NÃO executar sem aprovação)
- Nenhum. O snapshot expõe todos os campos necessários (`fixedCostItems`, `variableCostItems`, `currentGross`, `currentNet`, `currentKm`, `homeDailyGross/Net`, `homeSmartRpkGross`, `homeGrossTarget/NetTarget`, `homeRemainingGross`, `consideredCosts`, `requiredRpk`, `averageKmPerDay`, `selectedWorkdaysCount`, `remainingWorkdaysCount`). `getCurrentMonthRealData` já retorna `daysWorkedThisMonth`.
