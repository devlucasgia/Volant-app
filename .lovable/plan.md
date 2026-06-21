## Sprint 6 — Filtros, badge da Meta Bruta e texto do KM

Três correções pontuais. Sem mexer em `planningEngine`, queries, DataContext, DnD, AuthContext, demais cards, Admin.

---

### Item 1 — Filtros de período: aumentar presença dos tabs (não o gap)

Diagnóstico confirmado lendo o código: hoje cada tab tem `px-1` (Segmented flat e `PeriodBar`), então o grupo todo é dimensionado pelo conteúdo. Aumentar o `gap` (Sprint 5) só adicionou ar entre itens, sem aumentar a presença do grupo. Solução = **Abordagem A** do brief: aumentar o padding horizontal de cada tab, mantendo `shrink-0` (sem voltar a `flex-1`).

**`src/components/Segmented.tsx` (tone `flat`, sizeClass linhas 56-64)**
- `xs`: `py-1 px-1` → `py-1 px-3`
- `sm`: `py-1.5 px-1` → `py-1.5 px-4`
- `md`: `py-1.5 px-1` → `py-1.5 px-5`
- Reduzir gap do track flat (linha 41-42): `gap-6` → `gap-1` (já que agora cada tab tem padding interno suficiente; evita vão duplicado).

**`src/pages/Dashboard.tsx` — `PeriodBar` (linhas 1153, 1163)**
- Track: `gap-6` → `gap-1`.
- Cada tab: `px-1 py-1.5 text-[15px]` → `px-5 py-1.5 text-[15px]`.
- Manter `shrink-0`, `border-b border-border/30`, e o ícone calendário/download com `ml-auto`.

Resultado esperado: cada tab fica visualmente maior (Nubank-like), o grupo ocupa ~70% da largura útil, vão à direita encolhe, sem esticar nenhum tab individualmente.

Cobertura automática: Home (`PeriodBar`), Relatórios, Histórico e Organização de Cards (`Segmented flat`/`flat size="sm"`). Tones `default` e `contextual` ficam intactos.

---

### Item 2 — Badge da Meta: sempre percentual em Bruto e Líquido

Causa raiz em `src/pages/Dashboard.tsx` linha 489:
```
{overPct >= 1 ? `+${num(overPct, 0)}%` : `+${brl(overAmount)}`}
```
Quando o excedente é < 1% (caso típico da meta Bruta batida por pouco), cai no fallback monetário. Não é branch por visão — é fallback genérico que aparece sobretudo na Bruta porque o valor da meta é maior.

**Correção (linha 489):**
```
+{overPct >= 1 ? num(overPct, 0) : num(overPct, 1)}%
```
Sempre `%`, com 1 casa quando < 1% para evitar "+0%" enganoso. `TrendingUp` e estilos do badge intactos.

---

### Item 3 — KM Inteligente: incluir "rodados"

**`src/pages/Dashboard.tsx` linha 623:**
- `<span className="font-bold text-foreground">{num(kmDriven, 0)} km</span>` → `... {num(kmDriven, 0)} km rodados</span>`

Resto da linha (`·`, `Meta {kmRequired} km`, percentual, badge neutro, cor de status) inalterado.

---

### Arquivos tocados

- `src/components/Segmented.tsx` — padding dos tabs flat, gap reduzido.
- `src/pages/Dashboard.tsx` — `PeriodBar` (padding/gap), badge da Meta (sempre %), texto KM ("rodados").

### Não tocados

`planningEngine`, queries, DataContext, summarize, DnD, AuthContext, herói, Ganhos, Gastos, Jornada, Histórico (lógica), Ajustes, Admin. Cor de status KM↔Performance, badge neutro do KM (Sprint 5) e Sprints 3/4 inalterados.

### Verificação

Playwright 360×800 + screenshot:
1. Home/Relatórios/Histórico/Organização de Cards: tabs com presença, sem vão grande à direita; comparar com prints de referência.
2. Card Meta Bruta com meta batida por pouco (ex: R$ 1,24 acima): badge `+0.5%` (ou similar), nunca `+R$`.
3. KM card: rodapé "X km rodados · Meta Y km".
