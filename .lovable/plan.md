## Sprint 2 — Plano

Sprint puramente visual/apresentação. Nada do `planningEngine`, queries Supabase, DataContext, summarize, useHomeOrder, AuthContext, hero, Performance, Ganhos, Gastos, header, saudação, filtros, Relatórios, Histórico ou Admin é tocado.

---

### Item 1 — Card KM Inteligente como irmão da Meta (`src/pages/Dashboard.tsx`, ramo `smartKm`)

Reescrever **apenas** o JSX do branch `smartKm` (linhas ~528-557) espelhando a anatomia do card de Meta:

- **Linha superior**: ícone `Gauge` azul (`text-info`) + label "R$/km mínimo" à esquerda; `R$ X,XX /km` à direita; chevron `›`.
- **Barra de progresso** (`<Progress>`) no meio, **azul** (`[&>div]:bg-info` ou classe equivalente já existente para info). Representa km rodados no período / km necessários do período. Trava em 100% e, ao ultrapassar, mostra badge "+X%" igual ao da meta.
- **Linha inferior**: `Faltam {km} km` à esquerda; micro-texto cinza `pra cobrir todos os custos` ao lado (ou abaixo, conforme caber em mobile).
- Card neutro (`border-border bg-card`), sem fundo azul, sem variantes verde/dourado.
- Remove o conector vertical colorido (linha gradiente) — fica neutro.

**Sempre bruto** (independe do toggle Líquido/Bruto):
- Em `smartKmValue` (linhas 267-272): trocar `showGrossView ? plan.homeSmartRpkGross : plan.homeSmartRpkNet` por `plan.homeSmartRpkGross` direto. Remove `showGrossView` das deps.
- Remover variáveis `themeIcon`/`themeBorder`/`connectorClass` do branch.

**KM por período (camada de exibição)**: o `plan.remainingPlannedKm` e `plan.plannedKmTotal` são mensais. Criar helper local `kmForPeriod(period, plannedKmTotal, remainingPlannedKm, customRange, planDaily, plannedDates)` em `src/lib/stats.ts`, copiando a mesma mecânica de `goalForPeriod`:
- `day` → `plannedKmTotal / diasPlanejadosNoMês` (ou `kmDiárioPlanejado` se já disponível em `plan`).
- `week` → `diário × diasPlanejadosNaSemana` (fallback 7).
- `month` → valor cheio.
- `custom` → `diário × diasPlanejadosNoIntervalo` (fallback dias calendário).
- Retorna `{ required, remaining }` para o período. `remaining = max(0, required - kmJáRodadosNoMesmoPeríodo)`. O km já rodado no período já é calculável via `s.totalKm` (summarize do mesmo `period`).
- Usar `plan.plannedKmTotal` como base mensal e `s.totalKm` para descontar.

Resultado: ao trocar filtro na Home, o card de KM muda na mesma proporção que a meta financeira.

**Estado "KM planejado atingido"** (linhas 500-527) permanece igual.

---

### Item 2 — Reorganização visual dos custos variáveis

**2a. `src/components/planejamento/PainelResumo.tsx` — "Como chega no bruto" (linhas ~361-400)**
- Remover a linha `"+ Custos variáveis (estimados)"` de dentro do bloco de soma.
- A soma visível passa a fechar: `Meta líquida (sobra) + Custos fixos = Faturamento bruto necessário`.
- Abaixo do total, adicionar bloco apartado em `text-muted-foreground`: `Combustível e alimentação (estimativa, não entra na meta): R$ {valor}`.
- Bloco "Como chega no líquido" (mesma região) recebe tratamento equivalente: variáveis fora da soma, listadas como referência apartada.

**2b. `src/components/vehicle/VehicleCostsSection.tsx` — seção "Custos variáveis" (linha ~205)**
- Atualizar subtítulo da seção para: *"Estimativa de quanto você gasta rodando. Serve de referência — não entra na sua meta, porque você já registra esses gastos no dia a dia."*

**2c. `src/components/planejamento/GuidedFlow.tsx` — etapa 4 e "Custos considerados" (linhas ~675-880)**
- Em "Custos considerados" e na etapa 4 do fluxo: o "Total mensal" passa a somar **apenas custos fixos**.
- Custos variáveis continuam listados, mas em bloco visualmente apartado (separador + tom `text-muted-foreground`), com rótulo explícito tipo *"Estimativa — não entra na meta"*.
- Ajustar copy correlato: o subtítulo "Fixos e variáveis usados no cálculo do plano" (linha 676) vira *"Custos fixos entram na meta. Variáveis são apenas referência."*
- Também ajustar copy do passo 2 (linha 451) e da introdução do passo de veículo (linha 642) para não dizer "fixos + variáveis" como se ambos entrassem na meta.

Nenhum cálculo é alterado — só rótulos, layout e o que entra no `total` exibido (já que Sprint 1 fez os variáveis saírem do cálculo real, o "Total" exibido só precisa refletir a mesma decisão).

---

### Item 3 — Card de Meta: compactar estado "meta batida" (`src/pages/Dashboard.tsx`, linhas ~410-440)

Hoje a badge `+X%` está num bloco separado (`<div className="mt-1.5">`) abaixo da linha "X acima da meta / 100%".

Mudança: mover a badge para dentro da mesma flex row do "acima da meta / 100%" (linha 410), entre o texto e a percentagem (ou logo após a percentagem). Remover o `<div className="mt-1.5">` wrapper. Mantém o mesmo visual da badge (cor, ícone `TrendingUp`, pílula), só elimina a linha extra.

Resultado: card de meta batida fica uma linha mais curto, sem mexer em padding global nem em outros cards. Hero + meta + topo da Performance permanecem visíveis sem scroll em ~360px de altura.

---

### Critérios de aceite

- KM Inteligente: anatomia espelhada da Meta, ícone/barra azul, número neutro, sempre bruto nas duas visões, barra de consumo trava em 100% com badge "+X%", km do período acompanha filtro, micro-texto "pra cobrir todos os custos".
- "Como chega no bruto/líquido": variáveis fora da soma, conta fecha sem eles, variáveis aparecem como referência apartada.
- Central de Veículos e Planejamento: textos e total atualizados.
- Card de Meta batida: badge `+X%` na mesma linha do "acima da meta / 100%".
- Em ~360px com meta batida na visão Hoje: hero + meta + topo da Performance sem scroll.
- `planningEngine` intacto. Header, saudação, filtros, hero, Performance, Ganhos, Gastos, Relatórios, Histórico, Admin intactos.

### Verificação

Após implementar, abro a Home via Playwright em viewport 360×800, restauro a sessão do Supabase, navego em visão Hoje (meta batida se houver) e capturo screenshot para confirmar que hero + meta + topo de Performance cabem sem scroll, e que o card KM espelha a Meta com cores corretas em ambas as visões.
