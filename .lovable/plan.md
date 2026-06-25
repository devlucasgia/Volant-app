# Sprint Recorte 2 — Card "próximo mês" + Reorganização dos Ajustes

Recorte 1 (banner, card compacto, cron 50s, lazy loading) já está em produção. Esta sprint executa só o Recorte 2, em uma passada por arquivo.

## Ordem de execução

1. **2.0** — Corrigir card "próximo mês" no `PainelResumo.tsx`
2. **2.1** — Aba "Ajustes" vira "Mais" no `BottomNav.tsx`
3. **2.4** — Cores semânticas + neutralização (passada única nas páginas de Ajustes)
4. **2.2 + 2.3** — Reorganização do `Settings.tsx` (nova ordem, nova seção, mover "Dados" pro Perfil)
5. **2.5** — Início de semana (migration → types → DataContext → UI → CalendarGrid)

---

## 2.0 — Card do próximo mês (`PainelResumo.tsx`)

**Problema:** card atual está truncado, estreito demais e posicionado no meio do painel, interrompendo a leitura do mês atual.

**Reposicionamento:** mover o bloco inteiro para **depois da seção 7** (nota de rodapé "Ajustar muda só o que você tocar..."). Vira o último elemento do painel. Handlers (`onPlanNext`, `onCancelNext`) e dados (`settings.nextPlan*`, `proxMes`, `s.consideredCosts`) inalterados.

**Wrapper de separação:**
```tsx
<div className="border-t border-border/30 mt-6 pt-5">
  {/* eyebrow + card */}
</div>
```

**Eyebrow:** `text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground mb-3`, ícone `CalendarDays`, label "PRÓXIMO MÊS".

**Estado A — sem plano futuro** (`!hasNextPlan`): card `bg-card/60 ring-1 ring-border/50 rounded-2xl p-4 text-center`
- Ícone `CalendarPlus` centralizado: `h-10 w-10 mx-auto mb-2 rounded-xl bg-primary/12 text-primary ring-1 ring-inset ring-current/15`
- Título 14px semibold: "Já pensou no próximo mês?"
- Info 12px `text-muted-foreground leading-snug`: `Planeje {proxMes} agora e ele entra em vigor sozinho na virada.` — mês minúsculo, **sem `truncate`**
- Botão `mt-3`: `Planejar {proxMes}` (`bg-primary/15 text-primary border border-primary/30 px-5 py-2 text-[13px] rounded-xl`)

**Estado B — plano futuro configurado** (`hasNextPlan`): card `bg-card/60 ring-1 ring-border/50 rounded-2xl p-4`
- Header `flex items-center gap-2 mb-3`:
  - `CalendarCheck` (`h-10 w-10 shrink-0 rounded-xl bg-primary/12 text-primary`)
  - Título 14px semibold `flex-1`: `{capFirst(proxMes)} já está planejado` — capitalização **via JS** (`proxMes.charAt(0).toUpperCase() + proxMes.slice(1)`), sem classe `capitalize`
  - `Pencil` (`h-8 w-8 text-primary` → `onPlanNext`), `X` (`h-8 w-8 text-muted-foreground` → `onCancelNext`)
- 4 linhas via `PlanoLine`:
  - "Meta líquida" → `fmtBRL(settings.nextPlanGoal)`
  - "Dias" → `${settings.nextPlanDates.length}`
  - "KM estimado" → `${settings.nextPlanAvgKm * settings.nextPlanDates.length} km`
  - "R$/km alvo":
    ```ts
    const nextKmTotal = settings.nextPlanAvgKm * settings.nextPlanDates.length;
    const nextRpk = nextKmTotal > 0
      ? (settings.nextPlanGoal + s.consideredCosts) / nextKmTotal
      : 0;
    // nextRpk > 0 ? fmtBRL2(nextRpk) : "—"
    ```
    Reaproveita `s.consideredCosts` já no escopo.
- Linha `text-[11px] text-muted-foreground/70 text-center mt-2`: `Entra em vigor automaticamente em 01/{MM}.`

**Casos de borda:**
- `nextPlanAvgKm` zero/nulo → R$/km alvo = "—"
- `nextPlanDates` nulo/vazio → estado A
- Estados de plano vencido (c/d) → bloco não renderiza

---

## 2.1 — Aba "Ajustes" vira "Mais" (`BottomNav.tsx`)

Item `/ajustes`: `label: "Mais"`, `icon: MoreHorizontal`. Rota inalterada.

---

## 2.4 — Cores: neutro geral + 3 exceções

**Regra neutra** para ícones de seção:
- `bg-{cor}/10 text-{cor}-300` / `bg-primary/10 text-primary` → `bg-muted/50 text-foreground/70` (manter `ring-1 ring-inset ring-current/15 shadow-[0_0_12px_-6px_currentColor]`)
- `hover:border-{cor}/35` → `hover:border-border`
- `focus-visible:ring-{cor}/40` → `focus-visible:ring-foreground/25`

**Arquivos:** `CentralVeiculos.tsx`, `MeusCarros.tsx`, `CustosVeiculo.tsx`, `ManutencaoPreventiva.tsx`, `Personalizacao.tsx`, `PersonalizacaoAparencia.tsx`, `PersonalizacaoSaudacao.tsx`, `OrganizacaoCards.tsx`, e itens neutros de `Settings.tsx`.

**Exceções (cor com significado):**
- **Assinatura:** mantém âmbar/dourado/glow/badge.
- **Ganhos** (item em `Categorias.tsx` + header de `CategoriasGanhos.tsx`): `bg-info/10 text-info` (azul).
- **Gastos** (item em `Categorias.tsx` + header de `CategoriasGastos.tsx`): `bg-destructive/10 text-destructive` (vermelho).

Se `text-info`/`bg-info` não forem utilitárias, usar o token semântico equivalente já usado na Home.

---

## 2.2 — Reordenar seções + nova seção "Configurações" (`Settings.tsx`)

Nova ordem dos `SectionGroup`:

1. **Conta** → Assinatura, Perfil (sem "Dados")
2. **Financeiro** → Categorias, Planejamento Inteligente
3. **Veículos** → Carros, Custos, Manutenção
4. **Personalização** → Aparência, Saudação, Organização dos cards
5. **Configurações** (nova) → Início da semana, Refazer tour
6. **Feedback** (rodapé)

"Refazer tour" sai do Perfil e vem pra Configurações.

## 2.3 — Mover "apagar dados" para o rodapé do Perfil

O card "Dados" + `AlertDialog`/confirmações migra para o rodapé do Perfil (zona de perigo). Sem mexer em handlers ou queries.

---

## 2.5 — Início de semana

Ordem obrigatória: migration → regen types → mapeamento DataContext → UI → CalendarGrid.

**Migration** (`user_settings`):
```sql
ALTER TABLE public.user_settings
  ADD COLUMN IF NOT EXISTS week_starts_on smallint
  NOT NULL DEFAULT 0
  CHECK (week_starts_on IN (0, 1));
```
0 = domingo, 1 = segunda.

**`src/types/index.ts`** — adicionar em `Settings`:
```ts
weekStartsOn?: 0 | 1; // default 0
```

**`src/context/DataContext.tsx`** — espelhar padrão dos demais campos:
- Load: `weekStartsOn: row.week_starts_on ?? 0`
- `updateSettings`: mapear `weekStartsOn` → `week_starts_on` no payload do update (mantém o comportamento otimista atual).

**UI em `Settings.tsx`** (seção Configurações):
- Item "Início da semana", ícone neutro `Calendar`
- `Segmented` Domingo / Segunda → `updateSettings({ weekStartsOn: Number(v) as 0 | 1 })`

### CalendarGrid.tsx — regras críticas

**(a) Re-render reativo (obrigatório):**
Ler `weekStartsOn` **diretamente** de `useData().settings.weekStartsOn ?? 0` dentro do componente. **Não** receber via prop intermediária, não cachear em estado local, não passar via contexto derivado. Como `updateSettings` é otimista, a troca do toggle atualiza o contexto e a grade re-renderiza sozinha — sem flags manuais nem `useEffect` de sincronização.

**(b) Integridade das datas (crítico):**
Mudar `weekStartsOn` altera **somente** a apresentação visual da grade (ordem das colunas e rótulos). **NÃO** pode tocar em:
- `selected` / `selectedDates` recebido por prop
- O `iso` gerado por célula (continua sendo `toIsoDate(d)` da data real)
- Qualquer cálculo do planejamento (`planningEngine`, `planejamento.ts` ficam intocados)

A rotação dos rótulos e o `firstDow` precisam estar **sincronizados na mesma fonte de verdade** — um erro de offset aqui faz o motorista selecionar o dia errado.

**Implementação:**
```ts
const weekStartsOn = useData().settings.weekStartsOn ?? 0; // 0 | 1

const DOW_BASE = ["D", "S", "T", "Q", "Q", "S", "S"]; // index = getDay()
const DOW = weekStartsOn === 1
  ? [...DOW_BASE.slice(1), DOW_BASE[0]] // S T Q Q S S D
  : DOW_BASE;

const firstDow = (days[0].getDay() - weekStartsOn + 7) % 7;
const padding = Array.from({ length: firstDow });
```

`days`, o loop de células, `toIsoDate(d)`, `onToggle(iso)` e o `selSet` permanecem **idênticos**. Só `DOW` e `firstDow` derivam de `weekStartsOn`.

**Validação manual (obrigatória antes de fechar):**
Com pelo menos 3 dias do mês selecionados em `weekStartsOn = 0`, alternar para `1` e confirmar:
1. As **mesmas datas** continuam selecionadas (mesmos ISOs no `selected`).
2. Cada célula cai **exatamente embaixo do rótulo correto** do novo cabeçalho (ex.: dia 1 que é uma quarta-feira fica na coluna do "Q", sem deslocar uma coluna pra esquerda/direita).
3. Voltar para `0` restaura a grade original sem perda de seleção.
4. Validar no `GuidedFlow` do Planejamento Inteligente, que é onde o motorista usa a grade na prática.

---

## NÃO ALTERA

`planningEngine.ts`, `planejamento.ts`, `smartKm.ts`, `stats.ts`, `AuthContext`, queries de `entries`, hooks DnD, painel admin, Home, Relatórios, cores semânticas da Home/Relatórios, rota `/ajustes`, e o `DataContext` fora do mapeamento de `weekStartsOn`.

## Validação final

- Card "próximo mês" depois da seção 7, texto completo (sem reticências), estados A e B corretos, R$/km alvo nunca quebra.
- Aba inferior mostra "Mais" com `MoreHorizontal`, `/ajustes` funcionando.
- Cores: Assinatura dourada, Ganhos azul, Gastos vermelho, resto neutro.
- Settings: nova ordem visível, "Dados" no rodapé do Perfil, "Refazer tour" em Configurações.
- Início de semana: validação manual (1)+(2)+(3)+(4) acima passa antes de declarar pronto.
- Typecheck passando.
