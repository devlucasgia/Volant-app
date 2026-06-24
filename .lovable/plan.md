# Sprint I — refeita em 2 recortes

Substitui o plano anterior. Executar **Recorte 1 primeiro** e só depois **Recorte 2**. Dentro do Recorte 1, o bloco 1.4 (lazy loading) é o último.

---

## RECORTE 1 — Banner + card compacto + cron + lazy loading

Blocos 1.1–1.3 são baixo risco. 1.4 (lazy loading) é o único que mexe no roteador — vai por último, com proteções.

### Arquivos que ALTERA
- `src/pages/Dashboard.tsx`
- `src/components/PlanningChangeNoticeBanner.tsx` (deletar)
- `src/components/planejamento/PainelResumo.tsx`
- `src/App.tsx` (+ `RouteFallback` e `ChunkErrorBoundary`)
- Apêndice SQL (cron, fora do repo)

### NÃO ALTERA
Lógica de cálculo, DataContext, AuthContext, queries, hooks DnD, painel admin, cores semânticas da Home/Relatórios. **Nada dos Ajustes** (fica para o Recorte 2). 1.4 mexe só no roteamento de `App.tsx`.

### 1.1 — Aposentar o banner
- `Dashboard.tsx`: remover `<PlanningChangeNoticeBanner ... />` (~linha 896) e o import.
- Deletar `src/components/PlanningChangeNoticeBanner.tsx`.
- `rg PlanningChangeNoticeBanner` deve retornar vazio.

### 1.2 — Card de plano futuro compacto (`PainelResumo.tsx`)
Substituir o bloco centralizado por linha horizontal compacta. Estados, handlers e dados (`onPlanNext`, `onCancelNext`, `settings.nextPlan*`, `proxMes`) intocados.

- Container: `flex items-center gap-3 rounded-2xl border border-border/50 bg-card/60 px-3 py-2.5`.
- Ícone (esq.): `h-9 w-9 shrink-0 rounded-xl bg-primary/12 text-primary ring-1 ring-inset ring-current/15 shadow-[0_0_12px_-6px_currentColor]`; `CalendarPlus` (A) / `CalendarCheck` (B).
- Texto (centro, `flex-1 min-w-0`): título 13px semibold + info 11.5px `text-muted-foreground` com `truncate`.
- Ação (dir.):
  - **A**: botão "Planejar" (`bg-primary/15 text-primary border border-primary/30`, `h-8 px-3 text-xs`).
  - **B**: `Pencil` (→ onPlanNext) e `X` (→ onCancelNext), `h-8 w-8`, primary/muted.
- Textos:
  - A título: "Planejar próximo mês"
  - A info: `Planeje ${proxMes} agora e ele entra sozinho na virada.` (mês minúsculo)
  - B título: `${capFirst(proxMes)} já está planejado` (capitalização via JS, sem classe `capitalize`)
  - B info: `${fmtBRL(nextPlanGoal)} líquido · entra 01/${MM}` (formatador existente; `MM` = mês de ativação)

### 1.3 — Apêndice SQL: cron de email para 50s
Job não está versionado. Preservar o `command` (URL + header), trocar só o intervalo:

1. `SELECT jobname, schedule, command FROM cron.job WHERE jobname = 'process-email-queue';`
2. ```sql
   SELECT cron.unschedule('process-email-queue');
   SELECT cron.schedule('process-email-queue', '50 seconds', $$ <MESMO COMMAND DO PASSO 1> $$);
   ```
3. `SELECT schedule FROM cron.job WHERE jobname='process-email-queue';` → `50 seconds`.

Não reescrever o body do zero.

### 1.4 — Lazy loading (`App.tsx`)
Mexe só no roteamento.

**Eager (boot crítico):** providers, `AppLayout`, `RequireAuth`, `RequirePremium`, `RequireAdmin`, `ScrollToTop`, `Landing`, `Auth`, `Dashboard` (rota mais visitada — evita flash em `/app`).

**Lazy (`React.lazy`):** as outras ~23 rotas (`History`, `Reports`, `Settings`, `PlanejamentoInteligente`, `MetasInteligentes`, `KmInteligente`, `CentralVeiculos`, `MeusCarros`, `CustosVeiculo`, `ManutencaoPreventiva`, `Personalizacao`, `PersonalizacaoAparencia`, `PersonalizacaoSaudacao`, `OrganizacaoCards`, `Categorias`, `CategoriasGanhos`, `CategoriasGastos`, `CheckoutReturn`, `Unsubscribe`, `NotFound`, `AdminMetrics`, `AdminHome`, `AdminAccess`, `AdminSubscribers`, `AdminLogin`, `Termos`, `Privacidade`, `ResetPassword`).

**Proteções obrigatórias:**

- `<Suspense fallback={<RouteFallback />}>` ao redor do `<Routes>`. `RouteFallback` = skeleton discreto na área do `<main>` (caixa cinza fina, não spinner cheio). Como `AppLayout` é eager, header/BottomNav continuam visíveis.

- **`ChunkErrorBoundary`** global ao redor do `<Routes>`, com **anti-loop de reload via `sessionStorage`** (chave `volant_chunk_reloaded`):

  - `componentDidCatch(error)` — detecta `error.name === "ChunkLoadError"` ou `/Loading chunk/.test(error.message)`.
  - Se for chunk error:
    - Se `sessionStorage.getItem("volant_chunk_reloaded")` **não existe**: `sessionStorage.setItem("volant_chunk_reloaded", "1")` e `window.location.reload()` (cobre o caso de aba antiga após deploy novo).
    - Se **já existe** (já recarregou uma vez e o erro persistiu): **não recarregar de novo**. Renderizar fallback simples: mensagem "Não foi possível carregar esta parte." + botão "Tentar de novo" que faz `sessionStorage.removeItem("volant_chunk_reloaded")` e `window.location.reload()`.
  - Para erros que **não** são chunk errors: deixar propagar (não engolir; manter comportamento atual).
  - **Limpeza da flag em caso de sucesso:** efeito leve no `AppLayout` (ou um `<ChunkReloadFlagCleaner />` montado dentro do boundary) que faz `sessionStorage.removeItem("volant_chunk_reloaded")` no primeiro mount bem-sucedido após o boot. Assim um segundo deploy na mesma sessão volta a poder fazer o reload automático uma vez.
  - Embrulhar tudo em `try/catch` (sessionStorage pode lançar em modo privado de alguns browsers); falha silenciosa cai no fallback manual.

**Validação:** navegar uma vez por **todas as 26 rotas** (públicas, app, admin); fallback aparece brevemente, rota carrega, nenhuma tela branca. Simular chunk error (forçar import quebrado em dev) e conferir: 1ª ocorrência → reload automático; 2ª ocorrência consecutiva → fallback com botão, sem loop.

---

## RECORTE 2 — Reorganização dos Ajustes + cores + início de semana

Uma passada só nos mesmos arquivos. Início de semana nasce já no lugar definitivo.

### Arquivos que ALTERA
- `src/components/BottomNav.tsx` (label + ícone da aba)
- `src/pages/Settings.tsx` (reordenação, nova seção, mover "Dados", neutralização)
- `src/pages/Categorias.tsx`, `CategoriasGanhos.tsx`, `CategoriasGastos.tsx` (cores semânticas)
- `src/pages/CentralVeiculos.tsx`, `MeusCarros.tsx`, `CustosVeiculo.tsx`, `ManutencaoPreventiva.tsx`, `Personalizacao.tsx`, `PersonalizacaoAparencia.tsx`, `PersonalizacaoSaudacao.tsx`, `OrganizacaoCards.tsx` (neutralização, se restar algo)
- **Migration** (`user_settings`), `src/types/index.ts`, `src/context/DataContext.tsx`, `src/components/planejamento/CalendarGrid.tsx` (início de semana)

### NÃO ALTERA
Lógica de cálculo, AuthContext, queries de entries, hooks DnD, painel admin, cores semânticas da Home/Relatórios. Rota continua `/ajustes` (só muda label/ícone da aba).

### 2.1 — Aba "Ajustes" vira "Mais"
`BottomNav.tsx`: trocar `label` de "Ajustes" para **"Mais"** e o ícone `Settings` por `MoreHorizontal` (lucide). Rota `/ajustes` **inalterada** — não renomear, não quebrar links.

### 2.2 — Reordenar seções e criar "Configurações"
`Settings.tsx` — nova ordem:

1. **Conta** → Assinatura, Perfil (sem "Dados")
2. **Financeiro** → Categorias, Planejamento Inteligente
3. **Veículos** → Carros, Custos, Manutenção
4. **Personalização** → Aparência, Saudação, Organização dos cards
5. **Configurações** (nova) → Início da semana, Refazer tour
6. **Feedback** (rodapé)

Seção "Configurações" usa o mesmo padrão visual (eyebrow + cards). "Refazer tour" sai do Perfil e vem pra cá.

### 2.3 — "Apagar dados" no rodapé do Perfil
Card/seção "Dados" (apagar dados, com alertas) sai da seção Conta e vira **rodapé do Perfil** (zona de perigo). Manter exatamente os mesmos alertas/confirmações, só reposicionar.

### 2.4 — Cores: neutro geral, 3 exceções semânticas
Regra neutra para ícones de seção:
- `bg-{cor}/10 text-{cor}-300` ou `bg-primary/10 text-primary` → `bg-muted/50 text-foreground/70` (manter `ring-1 ring-inset ring-current/15 shadow-[0_0_12px_-6px_currentColor]`).
- `hover:border-{cor}/35` → `hover:border-border`; `focus-visible:ring-{cor}/40` → `focus-visible:ring-foreground/25`.
- Aplicar em Veículos (ciano), Personalização (violet/teal) e itens neutros restantes.

**Exceções:**
- **Assinatura:** mantém âmbar/dourado/glow/badge (não tocar).
- **Ganhos** (item em `Categorias.tsx` + header de `CategoriasGanhos.tsx`): `bg-info/10 text-info`.
- **Gastos** (item em `Categorias.tsx` + header de `CategoriasGastos.tsx`): `bg-destructive/10 text-destructive`.

Se `text-info`/`text-destructive` não forem utilitários disponíveis, usar as cores semânticas equivalentes já usadas na Home.

### 2.5 — Início de semana (nasce em Configurações)

**Migration** (tabela `user_settings`, **não** `profiles`):
```sql
ALTER TABLE public.user_settings
  ADD COLUMN IF NOT EXISTS week_starts_on smallint NOT NULL DEFAULT 0
  CHECK (week_starts_on IN (0, 1));
```

**`types/index.ts`:** `weekStartsOn?: 0 | 1` em `Settings` (default 0).

**`DataContext.tsx`:** mapear `week_starts_on ↔ weekStartsOn` no load e em `updateSettings`, espelhando o padrão dos outros campos.

**UI** — em `Settings.tsx`, na nova seção "Configurações": item "Início da semana" com `Segmented` Domingo/Segunda → `updateSettings({ weekStartsOn: 0 | 1 })`. Ícone neutro `Calendar`.

**`CalendarGrid.tsx`:** ler `weekStartsOn` (prop ou `useData().settings`) e:
- Rotacionar `DOW` quando `weekStartsOn === 1` (de `["D","S","T","Q","Q","S","S"]` para `["S","T","Q","Q","S","S","D"]`).
- `firstDow = (days[0].getDay() - weekStartsOn + 7) % 7`; padding usa esse `firstDow`.
- Conferir no `GuidedFlow` que alternar o toggle re-renderiza a grade.

---

## Critérios de aceite

**Recorte 1:**
- Banner sumiu da Home, componente deletado.
- Card de plano futuro virou linha compacta nos dois estados; Editar/Cancelar continuam funcionando; valores formatados com `fmtBRL`; mês minúsculo no Estado A e maiúsculo no início de frase no Estado B.
- `SELECT schedule FROM cron.job WHERE jobname='process-email-queue'` retorna `50 seconds`; `command` preservado.
- Navegação por todas as 26 rotas sem tela branca; fallback é skeleton (não spinner).
- Chunk error: 1ª vez na sessão → reload automático único; 2ª vez consecutiva → fallback "Não foi possível carregar esta parte." com botão que limpa a flag e recarrega; sem loop infinito. Flag é limpa quando uma rota carrega com sucesso.

**Recorte 2:**
- Aba do `/ajustes` mostra "Mais" com ícone `MoreHorizontal`; rota inalterada.
- Ordem das seções: Conta → Financeiro → Veículos → Personalização → Configurações → Feedback.
- "Apagar dados" só aparece no rodapé do Perfil, com os alertas atuais.
- Ícones neutros em toda Ajustes, exceto Assinatura (dourado), Ganhos (azul) e Gastos (vermelho).
- Toggle Domingo/Segunda em Configurações persiste em `user_settings.week_starts_on` e altera a grade do calendário do planejamento.
