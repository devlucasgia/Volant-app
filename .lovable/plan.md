## Escopo desta sprint

1. **Custos de óleo e pneus** entram em todos os cálculos do motor central.
2. **KM Inteligente da Home** — auditar e garantir que reflete a lente ativa.
3. **Folga programada** na Home.
4. **Redesign premium do Planejamento Inteligente** + remoção de ícones de "estrela/luz".

---

## 1. Incluir óleo e pneus nos custos considerados (BUG)

### Diagnóstico

`src/lib/planejamento.ts › computeFixedMonthlyCosts` hoje retorna **apenas** financiamento/aluguel + IPVA + seguro + outros. Óleo e pneus foram deliberadamente excluídos com o comentário *"evitar loop circular: custo ↔ km necessário ↔ custo"*.

Esse loop **não existe** no fluxo atual: o `plannedKmTotal` é calculado a partir de `planningAvgKmPerDay × selectedWorkdaysCount`, **sem depender de custo**. Logo dá para prorratear óleo e pneus pelo `plannedKmTotal` com segurança.

A função `computeMonthlyVehicleCosts` em `src/lib/smartKm.ts` **já faz** esse prorrateio corretamente (para a tela KM Inteligente standalone). O motor central simplesmente não usa essa lógica.

### Ação

**`src/lib/planejamento.ts`** — assinatura nova: `computeFixedMonthlyCosts(car, plannedKmTotal?: number)`.

- Mantém todos os itens atuais.
- Adiciona, quando `plannedKmTotal > 0`:
  - **Óleo estimado** = `(plannedKmTotal / oil_change_interval_km) × oil_change_cost`, se ambos > 0.
  - **Pneus estimados** = `(plannedKmTotal / tires_interval_km) × tires_cost`, se ambos > 0.
- Quando `plannedKmTotal` não for fornecido ou for 0, retorna apenas os custos fixos (compat com chamadas antigas).

**`src/lib/planningEngine.ts`** — reorganizar a ordem dos cálculos:

1. Calcular primeiro `averageKmPerDay`, `selectedWorkdaysCount`, `plannedKmTotal` (já é independente de custos).
2. Em seguida chamar `computeFixedMonthlyCosts(activeCar, plannedKmTotal)`.
3. Usar esse `consideredCosts` enriquecido para `requiredGrossRevenue`, `estimatedNetProfit`, `homeNetTarget`, etc.

**Resultado esperado com os números do print (R$5.500 meta líquida, financiamento R$2.030, óleo R$300/10.000 km, pneus R$2.000/50.000 km, 3.750 km planejados):**

- Óleo prorrateado: `3.750/10.000 × 300 = R$112,50`
- Pneus prorrateado: `3.750/50.000 × 2.000 = R$150,00`
- Custos considerados: `2.030 + 112,50 + 150 = R$2.292,50`
- Faturamento necessário: `5.500 + 2.292,50 = R$7.792,50`
- R$/km mínimo: `7.792,50 / 3.750 ≈ R$2,08/km` (era R$2,01)

**`src/components/planejamento/PainelResumo.tsx`** — bloco "Custos considerados" passa a listar:
```
Financiamento     R$ 2.030,00
Óleo estimado     R$ 112,50
Pneus estimados   R$ 150,00
─────────────────────────────
Total             R$ 2.292,50
```
A lista já é renderizada a partir de `costs.items` retornado pelo motor — só precisa garantir que `items` inclua óleo/pneus quando aplicáveis.

---

## 2. KM Inteligente da Home — auditoria

### Diagnóstico

A lógica em `Dashboard.tsx` (linha 209-214) **já está correta**:
```ts
const v = showGrossView ? plan.homeSmartRpkGross : plan.homeSmartRpkNet;
```

E em `planningEngine.ts`:
- `homeSmartRpkGross = (5500 − 0) / 3750 = R$1,47`
- `homeSmartRpkNet   = (7500 − 0) / 3750 = R$2,01` (antes do bug 1) → após o fix vira `~R$2,08`

Com os números do print os valores **devem** ser distintos. Se o usuário ainda vê o mesmo número em ambas as visões na Home, é porque:

(a) Após o fix do bug 1 acima, vão divergir naturalmente (custos > 0 → líquido > bruto).
(b) O toggle pode estar travado em uma das visões — vou verificar `showGrossView` reagindo a mudança.

### Ação

- Confirmar que `showGrossView` propaga (re-render do `useMemo`). Já está nas deps.
- Adicionar um sublabel discreto no card R$/KM Inteligente da Home quando `isFull`:
  - `Alvo R$ X.XXX · KM restante Y` (`text-[10px] text-muted-foreground`, 1 linha).
  - Torna explícito de onde sai o número e ajuda o usuário a perceber a diferença entre lentes.
- Label do card continua neutro: **"R$/KM Inteligente"**.

---

## 3. Folga programada na Home

Quando hoje **não** está em `settings.planningSelectedDates` e o planejamento está configurado, **e** o período selecionado é `day`:

### Comportamento

- **Card da meta principal**:
  - Badge no topo: ícone `Coffee` + `"Folga programada"` (tom `muted-foreground/80`, fundo `muted/40`, pill).
  - Substitui o número da meta diária por: `"Hoje é seu dia de descanso. Não conta para sua meta."` (`text-[12px] text-muted-foreground`).
  - Barra de progresso mensal/semanal **permanece** (folga só afeta o dia).
- **Outros cards** (Performance, Por Aplicativo, Por Categoria, KM Inteligente) seguem normais.
- Quando `period !== "day"`, ignorar — Semana/Mês/Custom agregam normal.

### Implementação

- `src/pages/Dashboard.tsx`:
  ```ts
  const todayIso = toIsoDate(startOfDay(new Date()));
  const isFolga =
    period === "day" &&
    plan.isPlanningConfigured &&
    plan.selectedWorkdaysCount > 0 &&
    !(settings.planningSelectedDates ?? []).includes(todayIso);
  ```
  Render condicional dentro do card meta principal.

---

## 4. Redesign premium do Planejamento Inteligente

Foco: tirar a estética "wizard com brilho" e entregar um painel financeiro sóbrio e denso. **Sem `Sparkles`, `Star`, `Lightbulb`, `Wand2`** em nenhuma etapa.

### Troca de ícones (`lucide-react`)

| Local | Antes | Depois |
|---|---|---|
| `GuidedFlow` Step 4 (média KM/dia) | `Sparkles` | `Route` |
| `GuidedFlow` Step 6 (resumo, header) | `Sparkles` | `Gauge` |
| `GuidedFlow` Step 6 (stat R$/km Inteligente) | `Sparkles` | `TrendingUp` |
| `PainelResumo` (bloco R$/KM Inteligente) | `Sparkles` | `TrendingUp` |
| Qualquer outra ocorrência no fluxo/painel | — | `Gauge`/`Target`/`Route`/`Check`/`Coins` conforme contexto |

### `PainelResumo.tsx` — recomposição visual

Hoje: cabeçalho + meta principal + grid 2×2 + bloco grande KM Inteligente + custos + ações.

Novo (vertical, sem grid 2×2):

1. **Hero — Meta principal**
   - Label pequeno uppercase tracking-wider: `META {BRUTA|LÍQUIDA}`.
   - Valor grande (`text-3xl font-bold tabular-nums`).
   - Linha de chips inline: `Faturar R$ 7.792` · `Lucro est. R$ 5.500`.
   - Borda sutil + leve gradient primary (sem glow forte).

2. **Hero secundário — R$/KM Inteligente**
   - Valor em destaque (`text-2xl font-semibold tabular-nums`) + ícone `TrendingUp`.
   - Sublabel: `KM restante: 3.750 · 25 dias restantes`.
   - Borda âmbar quando `smartRpk > requiredRpk × 1.1`; esmeralda quando `< requiredRpk × 0.9`; caso contrário neutro.

3. **"Detalhes do plano"** (accordion colapsável)
   - Linhas compactas (label esquerda, valor direita, divider):
     - R$/km mínimo necessário
     - KM total planejado
     - Custos considerados (com `Coins`) — clicável para expandir lista item-a-item
     - Dias planejados / restantes
     - Meta diária equivalente

4. **Rodapé** — botões "Ajustar" e "Refazer" lado a lado, secundários, full width.

### `GuidedFlow.tsx` — polish

- Trocar os 3 `Sparkles` listados acima.
- Step 6 (Resumo): cartão sóbrio do R$/km Inteligente com `TrendingUp` + valor + sublabel `"calculado a partir da sua meta e KM restante"`.
- Step 4 (média KM): ícone `Route` + micro-explicação `"Usado para calcular o R$/km ideal."`.
- Manter cópias e fluxo intactos.

---

## Arquivos impactados

- `src/lib/planejamento.ts` — assinatura nova, inclusão de óleo/pneus.
- `src/lib/planningEngine.ts` — recomputar `plannedKmTotal` antes dos custos, passar para `computeFixedMonthlyCosts`.
- `src/pages/Dashboard.tsx` — folga programada + sublabel do KM Inteligente.
- `src/components/planejamento/PainelResumo.tsx` — recomposição visual + troca de ícones.
- `src/components/planejamento/GuidedFlow.tsx` — troca de ícones.

## Fora de escopo

- Schema do banco, autenticação, Stripe.
- Página KM Inteligente standalone (já usa `computeMonthlyVehicleCosts` corretamente).
- Metas Inteligentes (sem mudança).
- Home Order, Reports.
