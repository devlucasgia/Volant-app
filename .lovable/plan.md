# Sprint Hotfix v1.0.1 — Estabilidade, E-mails e Meta da Jornada

Escopo restrito a `/app` e backend de e-mails. **Nada de `/admin` ou `/` (Landing).**

---

## 1. Estabilização global de formulários e fim de reloads destrutivos

**A. React Query — desativar refetch automático destrutivo**
- `src/App.tsx`: instanciar `QueryClient` com defaults seguros:
  ```ts
  new QueryClient({
    defaultOptions: {
      queries: {
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
        staleTime: 60_000,
      },
    },
  });
  ```
- Não há service worker registrado no projeto (`public/` só tem manifest/ícones; `vite.config.ts` não usa `vite-plugin-pwa`). Nada de SW para mexer.

**B. Persistência de rascunhos — abordagem por hook reutilizável**

Criar `src/hooks/useDraftPersistence.ts`:
```ts
useDraftPersistence<T>(key, value, { enabled, storage: "session" })
// salva com debounce ~300ms; expõe loadDraft(), clearDraft()
```
Usa `sessionStorage` por padrão (sobrevive a reload/troca de aba; some ao fechar o navegador — bom para rascunhos sensíveis como valores financeiros).

Aplicar nos pontos de maior dor:

**B1. EntryDrawer (Novo registro — ganho/gasto)** ← caso do seu exemplo
- `src/components/EntryDrawer.tsx`
- Key: `volant_draft_entry_v1` (apenas para criação nova; NÃO persiste quando `isEditing`, para não vazar entre edições diferentes).
- Persistir todo o form: `tab`, `date` (ISO), `app`, `kmMode/kmTotal/kmStart/kmEnd`, `hours`, `gross`, `rides`, `notes`, `category`, `maintenanceType`, `amount`, `description`.
- **Hidratar ao abrir o drawer** apenas quando: drawer abre sem `editing` e sem `preset.prefillHours` (jornada encerrada tem fluxo próprio). Se houver rascunho salvo, mostrar toast discreto "Rascunho restaurado".
- **Limpar (`clearDraft`)** em: (i) submit com sucesso, (ii) clique em "Cancelar", (iii) fechamento explícito do drawer pelo usuário (`onOpenChange(false)` quando não foi por sucesso).
- Não persistir enquanto o drawer estiver fechado.

**B2. GuidedFlow do Planejamento Inteligente (wizard)**
- `src/components/planejamento/GuidedFlow.tsx`
- Key: `volant_planning_draft_v1`
- Salva `step` + `draft` (goalType, monthlyGoal, selectedDates, avgKmPerDay).
- Hidrata na montagem somente se não vier `initialDraft`/`initialStep` por props (mantém o fluxo "planningResume" da Central de Veículos intacto).
- Limpa em `onDone` (sucesso) e em `onCancel`.

**B3. Outros forms (EntryDrawer cobre o caso crítico)**
- `CarFormDialog`, `CategoryDialog`, dialogs curtos: ficam fora desta sprint. Eles são preenchimentos rápidos e, com `refetchOnWindowFocus:false`, deixam de "resetar" sozinhos. Se aparecer dor real, abrimos sprint dedicada.

> Por que não `localStorage`? Valores financeiros ficariam persistidos indefinidamente entre dispositivos compartilhados. `sessionStorage` cobre o caso "abri a Uber e voltei" sem virar histórico permanente.

---

## 2. Correção de links 404 em e-mails transacionais

Rotas reais (verificadas em `src/App.tsx`): **não existe** `/app/...` para sub-rotas. As rotas pós-login são raiz: `/app`, `/historico`, `/relatorios`, `/ajustes`, `/ajustes/veiculos/manutencao`, etc.

| Template / Função | URL atual | URL correta |
|---|---|---|
| `send-weekly-summary/index.ts` | `https://usevolant.app/app/relatorios` | `https://usevolant.app/relatorios` |
| `weekly-summary.tsx` (default) | `.../app` | `.../relatorios` |
| `payment-failed.tsx` | `.../app/ajustes` | `.../ajustes` |
| `welcome.tsx`, `trial-welcome.tsx`, `subscription-receipt.tsx`, `trial-ended.tsx`, `trial-ending-soon.tsx` | `.../app` | OK — `/app` existe |
| `maintenance-alert.tsx` | `.../ajustes/veiculos/manutencao` | OK |

**Ações:**
- Centralizar em `registry.ts` uma constante `APP_BASE_URL = "https://usevolant.app"` para evitar regressão futura.
- Corrigir os templates e a função `send-weekly-summary`.
- Deploy: `send-weekly-summary` e `send-transactional-email`.

---

## 3. Desacoplamento da Meta Bruta e Líquida (Jornada)

**Causa:** chave única `volant_day_goal_YYYY-MM-DD` é compartilhada entre as duas visões — o último valor sobrescreve o outro.

**Correção (isolada à Home + JourneyModule, NÃO toca Planejamento Inteligente):**
- Chaves separadas por visão:
  - Líquido: `volant_day_goal_net_YYYY-MM-DD`
  - Bruto:   `volant_day_goal_gross_YYYY-MM-DD`
- `src/components/JourneyModule.tsx`: leitura/escrita conforme `isGross` (visão ativa no momento do submit).
- `src/pages/Dashboard.tsx`: `journeyDailyOverride` lê a chave correspondente a `showGrossView`.
- Evento `volant:dayGoalChanged` continua sendo disparado.
- **Migração leve:** ao ler, se a chave nova não existir mas a antiga existir, copiar uma vez para a chave da visão ativa e apagar a antiga (preserva a meta de hoje no deploy).

---

## 4. Bump de versão para 1.0.1

- `src/config/version.ts`: `APP_VERSION = "1.0.1"`.
- `package.json`: `"version": "1.0.1"` (hoje `0.0.0` — alinhar).
- `Settings.tsx` já usa `APP_VERSION_LABEL` automaticamente.

---

## Arquivos editados / criados

- `src/App.tsx` (QueryClient defaults)
- `src/hooks/useDraftPersistence.ts` (novo)
- `src/components/EntryDrawer.tsx` (persistência do rascunho de novo registro)
- `src/components/planejamento/GuidedFlow.tsx` (persistência de step+draft)
- `src/components/JourneyModule.tsx` (chave por visão)
- `src/pages/Dashboard.tsx` (leitura por visão)
- `src/config/version.ts`, `package.json` (1.0.1)
- `supabase/functions/_shared/transactional-email-templates/registry.ts` (`APP_BASE_URL`)
- `supabase/functions/_shared/transactional-email-templates/{weekly-summary,payment-failed}.tsx`
- `supabase/functions/send-weekly-summary/index.ts`
- Deploy: `send-weekly-summary`, `send-transactional-email`

## Validação manual

1. Abrir "Novo registro", preencher ganho da Uber parcialmente, abrir outra aba, voltar — campos preservados; toast "Rascunho restaurado".
2. Salvar → reabrir drawer: form limpo.
3. Wizard Planejamento: preencher até passo 3, recarregar a página → volta no passo 3 com valores.
4. Jornada Líquido R$ 300 → trocar para Bruto na Home: meta bruta intacta (sugestão calculada). Vice-versa.
5. Conferir "v1.0.1" em Ajustes.
6. Disparar weekly-summary em teste e checar que o botão abre `/relatorios` (não 404).
