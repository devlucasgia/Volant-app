# Sprint H — Refino do card de plano futuro + neutralização dos Ajustes

Sprint cosmética, risco baixo. Só JSX/Tailwind — nenhuma lógica, query, estado, fluxo, migration ou edge function foi alterada.

## Arquivos alterados
- `src/components/planejamento/PainelResumo.tsx` — card de plano futuro (estados A e B).
- `src/pages/Settings.tsx` — neutralização dos ícones da lista de Ajustes.
- `src/pages/CentralVeiculos.tsx`, `src/pages/MeusCarros.tsx`, `src/pages/CustosVeiculo.tsx`, `src/pages/ManutencaoPreventiva.tsx` — neutralização dos headers/itens de veículos.
- `src/pages/Personalizacao.tsx`, `src/pages/PersonalizacaoAparencia.tsx`, `src/pages/PersonalizacaoSaudacao.tsx`, `src/pages/OrganizacaoCards.tsx` — neutralização dos headers/itens de personalização.
- `src/pages/Categorias.tsx`, `src/pages/CategoriasGanhos.tsx`, `src/pages/CategoriasGastos.tsx` — neutralização dos headers de categorias.

## NÃO alterados
`planningEngine.ts`, `planejamento.ts`, `smartKm.ts`, `DataContext`, edge functions, hooks DnD, `stats.ts`, painel admin, fluxos de Refazer/Ajustar/plano novo, cores semânticas da Home/Relatórios (verde lucro, azul bruto, vermelho gasto, laranja atenção).

A Assinatura mantém o tratamento dourado/âmbar atual (accent, glow, badge). É a única exceção proposital no campo neutro.

---

## Parte 1 — Card de plano futuro

O card de plano futuro virou uma composição **centralizada**, mais **enxuta**, com **acento verde vivo** no ícone e nos botões principais.

Anatomia (ambos os estados):
- Container: `rounded-2xl border border-border/50 bg-card/60 p-4 text-center`.
- Ícone num quadradinho verde, centralizado:
  - `mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-primary/12 text-primary ring-1 ring-inset ring-current/15 shadow-[0_0_14px_-6px_currentColor]`
  - Estado A: `CalendarPlus`.
  - Estado B: `CalendarCheck`.
- Título 15px semibold, sem `capitalize`.
- Linha de info 12.5px `text-muted-foreground`.
- Botões centralizados: `mt-3 flex justify-center gap-2`.

**Estado A — sem plano futuro:**
- Título: `Já pensou no próximo mês?`
- Info: `Planeje {proxMes} agora e ele entra sozinho na virada.` — mês em **minúsculo** (como vem de `toLocaleDateString`).
- Botão: `bg-primary/15 text-primary border border-primary/30`, ícone `CalendarPlus`, texto `Planejar {proxMes}`.

**Estado B — já planejado:**
- Título: `{ProxMes} já está planejado` — só a **primeira letra do mês maiúscula** (`proxMes.charAt(0).toUpperCase() + proxMes.slice(1)`), sem classe `capitalize`.
- Info: `{fmtBRL(nextPlanGoal)} líquido · {nextPlanDates.length} dias · {nextPlanAvgKm} km/dia` — valor líquido formatado pelo `fmtBRL` existente.
- Ativação: `Entra em vigor sozinho em 01/{MM}.`
- Botões: `Editar` (verde leve, ícone `Pencil`) + `Cancelar` (ghost neutro).

## Parte 2 — Neutralização das cores dos Ajustes

Tom neutro padrão aplicado em todos os ícones de seção (exceto Assinatura):
- `bg-{cor}/10 text-{cor}` → `bg-muted/50 text-foreground/70`
- `ring-1 ring-inset ring-current/15 shadow-[0_0_12px_-6px_currentColor]` mantido.
- `hover:border-{cor}/35` → `hover:border-border`
- `focus-visible:ring-{cor}/40` → `focus-visible:ring-foreground/25`

### 2.1 `Settings.tsx`
- `SettingsCard` default iconTone: neutro.
- Perfil e Dados: âmbar → neutro.
- Planejamento Inteligente, Categorias, Feedback: verde-padrão → neutro.
- Central de Veículos: ciano → neutro.
- Personalização: violeta → neutro.
- Item Feedback com `bg-slate-400/10`: alinhado a `bg-muted/50 text-foreground/70`.
- `HubRow` default iconTone, hover e focus: neutro.
- Assinatura: **inalterada** (dourado/âmbar).

### 2.2 Sub-páginas de Veículos
Headers e itens com ciano → neutro; hover/focus neutros.

### 2.3 Sub-páginas de Personalização
Violeta e teal → neutro; hover/focus neutros.

### 2.4 Sub-páginas de Categorias
Headers verde-padrão → neutro.

---

## Validação manual
1. Card de plano futuro centralizado, ícone num quadradinho verde com glow, título em caixa de sentença (`Julho já está planejado`).
2. Estado A com mês minúsculo (`Planejar julho`) e Estado B com mês capitalizado no início da frase.
3. Valores do Estado B formatados em moeda via `fmtBRL`.
4. Ajustes — lista: todos os ícones cinza-neutros, só Assinatura dourada com glow.
5. Sub-páginas de Ajustes: headers e itens neutros, hover/focus sem realce colorido.
