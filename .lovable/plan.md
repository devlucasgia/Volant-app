# Sprint 1 — Primeiros Passos (fundação)

Constrói a infraestrutura da faixa "Primeiros Passos" no header do Dashboard + folha com 4 tarefas. Sem coachmark/tour: tarefas apenas refletem estado e navegam.

## 1. Migration (schema)

Adiciona 3 colunas em `profiles` (RLS herda das policies existentes por `id = auth.uid()`, sem policy nova):

```sql
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS fs_personalized boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS fs_exported boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS fs_all_done_at timestamptz;
```

Após aprovar a migration, os tipos em `src/integrations/supabase/types.ts` são regenerados automaticamente.

## 2. Novo: `src/lib/firstSteps.ts`

Módulo puro com tipos e função de detecção. Recebe `{ planningStatus, entries, fsPersonalized, fsExported }` e devolve `FirstStepTask[]` com as 4 tarefas. `entries` usa `type === "earning" | "expense"` (confirmado em `Reports.tsx`). `planningStatus === "configured"` (confirmado em `types/index.ts`). Rotas confirmadas: `/ajustes/planejamento`, `/app`, `/ajustes/personalizacao/cards`, `/relatorios`.

Também expõe `firstStepsProgress(tasks) → { done, total, allDone }`.

## 3. Novo hook: `src/hooks/useFirstSteps.ts`

Centraliza a leitura das flags do `profiles` (fetch pontual do `user.id`, seguindo o padrão já usado em `Dashboard.tsx`/`Settings.tsx`) + `settings.planningStatus` + `entries` do `useData()`. Devolve:

- `tasks: FirstStepTask[]`
- `done`, `total`, `allDone`
- `loading` (enquanto profile não chegou)
- `openSheet` / `sheetOpen` (estado local do consumidor pode viver aqui ou no componente pai — vai ficar no componente pai pra permitir abrir a mesma sheet de "Mais" e do Dashboard sem duplicar state global)
- `markPersonalized()`, `markExported()`: chamam `update` no `profiles` com guard (`if (!flag)`) e refazem o fetch local. Silenciam erros (não bloqueiam a ação principal).
- Efeito: quando `allDone && !fs_all_done_at`, grava `fs_all_done_at = now()` uma vez.

Motivo do hook: não existe `profile` global no `AuthContext` (o `refreshProfile` do `DataContext` é alias de `refreshCars`), então cada tela que precisa dessas flags lê direto do `profiles`. O hook evita duplicar essa lógica.

## 4. Novo: `src/components/firstSteps/FirstStepsStrip.tsx`

Faixa renderizada DENTRO do `<header>` sticky do Dashboard, logo abaixo do `header-inner`. Só renderiza se `!loading && !allDone`. Layout aprovado (opção 2A):

- Container full-width, `flex items-center gap-2.5 px-4 py-2.5`, `border-t border-primary/15 border-b border-border/70`, `bg-gradient-to-r from-primary/[0.09] to-primary/[0.03]`, `cursor-pointer`.
- Ícone circular `h-[22px] w-[22px] rounded-full bg-primary/15` com `ListChecks` (lucide) `text-primary`.
- Título "Primeiros passos" + subtítulo "{done} de {total} concluídos · continue configurando".
- Mini-track de progresso `w-[46px] h-[5px]` + contador `{done}/{total}` + chevron `›`.
- `onClick` abre a sheet.

## 5. Novo: `src/components/firstSteps/FirstStepsSheet.tsx`

Bottom sheet (`Drawer` do projeto, mesmo Vaul já em uso). Handle + título + X. Barra de progresso larga. Lista das 4 tarefas:

- Feita: círculo verde com ✓, label `line-through text-muted-foreground`, não clicável.
- Pendente: círculo vazio, label normal, chevron; ao tocar → `onOpenChange(false)` ANTES do `navigate(task.route)` (blindagem contra sheet ficar por cima).

Props: `open`, `onOpenChange`, `tasks`, `done`, `total`.

## 6. Edições cirúrgicas

### `src/pages/Dashboard.tsx`
- Instancia `useFirstSteps()` + state local `[fsOpen, setFsOpen]`.
- Renderiza `<FirstStepsStrip onClick={() => setFsOpen(true)} ... />` dentro do `<header>` sticky, logo após o bloco `header-inner`. Fica ACIMA do conteúdo (hero + Meta + KM) — não invade a zona do print compartilhável.
- Renderiza `<FirstStepsSheet open={fsOpen} onOpenChange={setFsOpen} ... />`.

### `src/pages/Reports.tsx`
- Importa `useFirstSteps` (só pra pegar `markExported`).
- No fim de `exportPDF` (após `doc.save`) e `exportCSV` (após download): `markExported()` (com o guard interno do hook).

### `src/pages/OrganizacaoCards.tsx`
- Importa `useFirstSteps`.
- Após `reorderHome` (no `onDragEnd`) e após `moveHome` (nos handlers de setas), chama `markPersonalized()` — o guard interno evita escritas repetidas a cada drag.

### `src/pages/Settings.tsx`
- Novo item "Primeiros passos" na seção Configurações (perto de "Refazer tour"), que abre a mesma `FirstStepsSheet` (state local desta tela + `useFirstSteps`). Ponto de entrada permanente pra revisitar depois que a faixa sumir.

## 7. Blindagem (implementada no código)

1. Enquanto `loading` (profile não carregou), a faixa não renderiza — evita piscar "0/4".
2. `entries` vazio → `some()` false → tarefa "registros" pendente. Correto.
3. Todas as marcações têm guard `if (!flag)` pra evitar UPDATE redundante.
4. Falha de rede na marcação é silenciosa — a ação principal (exportar/reordenar) já teve seu feedback.
5. Sheet fecha antes de navegar.
6. Faixa é independente do greeting (linha própria abaixo do `header-inner`).
7. `fs_all_done_at` grava uma única vez; a partir daí, `!allDone` fica false e a faixa some.

## 8. Validação manual

1. Usuário novo: faixa "0 de 4", todas pendentes.
2. Configurar plano → "1 de 4", plano riscado.
3. Só ganho → "registros" pendente. Ganho + gasto → feita.
4. Reordenar cards → "personalizar" feita.
5. Exportar PDF ou CSV → "exportar" feita.
6. 4 feitas → faixa some do header; item em "Mais" ainda abre a folha (tudo riscado).
7. Tocar em tarefa pendente → sheet fecha, navega.
8. Assinantes atuais: plano e registros já riscados no 1º acesso; personalizar/exportar pendentes.
9. Testar com greeting on/off.
10. Compartilhar resultado: a faixa não aparece no PNG (fica no header, fora do card).

## Fora de escopo

Tour/coachmark (Sprint 2), Central de Tutoriais (Sprint 3-4), aposentar dialogs de onboarding (Sprint 4), ajuste de texto do Step5.
