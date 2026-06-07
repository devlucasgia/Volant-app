# Plano: Go-Live + Painel Admin + Fix UX Assinatura

## 1. Go Live — respostas

**Pode publicar?** Sim. Verifiquei o status do Stripe: todas as 5 etapas estão concluídas (claim, setup, install app, live keys, readiness check). Live checkout está pronto.

**Como funciona após publicar:**
- A URL de **preview** (`id-preview--...lovable.app`) continua sempre em **test mode** (`pk_test_`).
- A URL **publicada** (`usevolant.app`) passa a usar `pk_live_` automaticamente — qualquer assinatura ali é cobrança **real**.
- O banner laranja "test mode" some sozinho em produção.
- Webhooks já estão configurados para os dois ambientes.

**Recomendação de teste:** após publicar, abra `usevolant.app` em aba anônima, assine o mensal com cartão real, confirme que entrou como Premium, e depois cancele pelo portal.

## 2. Painel Admin

Vou criar um hub admin acessível em **`usevolant.app/admin`**, protegido pela role `admin` (mesma do `/admin/metrics`). Estrutura:

- **`/admin`** — landing do painel com cards/atalhos para as seções (Métricas, Acessos, Assinantes). Pensado pra crescer no futuro (dashboards, suporte, etc.).
- **`/admin/metrics`** — já existe, fica nesse hub.
- **`/admin/access`** — **nova**, gerencia acessos vitalícios:
  - Input de e-mail + botão "Conceder acesso vitalício" → marca `beta_grandfathered = true`.
  - Lista de quem tem vitalício hoje, com botão "Revogar" em cada linha.
  - Mostra e-mail, nome e data de concessão.
- **`/admin/subscribers`** — **nova**, lista todos os assinantes:
  - E-mail, nome, plano (mensal/anual), status (ativo/cancelado/past_due), data início, próximo ciclo / fim de acesso, ambiente (sandbox/live).
  - Filtro por status e por ambiente.
  - Busca por e-mail.
  - Indicador visual quando é vitalício (grandfathered) em vez de assinante pago.

### Como funciona por baixo
- Edge function **`admin-users`** (service role, valida `has_role(uid, 'admin')`):
  - `action: "list_grandfathered"` — retorna lista.
  - `action: "grant_lifetime"` / `"revoke_lifetime"` — altera `profiles.beta_grandfathered` (precisa de service role porque o trigger `profiles_block_privilege_escalation` bloqueia escrita pelo próprio usuário).
  - `action: "list_subscribers"` — junta `subscriptions` + `auth.users` (e-mail/nome) e devolve a lista paginada.
- Front consome via `supabase.functions.invoke("admin-users", { body: { action: ... } })`.
- Nenhuma mudança de schema; só leitura/escrita em tabelas existentes (`profiles`, `subscriptions`, `auth.users`).

### Como te tornar admin
Depois de publicar, eu rodo um insert manual em `user_roles` com seu user_id e role=`admin`. A partir daí você acessa `/admin` normalmente.

## 3. Fix UX: "Próxima cobrança" em assinatura cancelada

**Bug confirmado** em `src/components/account/SubscriptionSheet.tsx` (view `active`): mostra "Próxima cobrança: DD/MM" mesmo com `cancel_at_period_end = true` ou `status === 'canceled'`, dando impressão de que vai cobrar de novo.

**Correção:**
- Se `cancel_at_period_end === true` **ou** `status === 'canceled'` (com período futuro): trocar **"Próxima cobrança"** por **"Acesso até DD/MM/AAAA"**.
- Ajustar subtítulo do bloco: quando cancelamento agendado, mostrar "Seu plano foi cancelado. Você mantém acesso Premium até DD/MM."
- Trocar "cancelamento agendado" por "será encerrado em DD/MM" no status (mais claro).
- CTA "Economize com plano anual" já é escondido quando cancelado — manter.

## Arquivos afetados

- `src/components/account/SubscriptionSheet.tsx` — fix do bloco "active".
- `src/pages/AdminHome.tsx` *(novo)* — landing `/admin`.
- `src/pages/AdminAccess.tsx` *(novo)* — gerenciar vitalícios.
- `src/pages/AdminSubscribers.tsx` *(novo)* — lista de assinantes.
- `src/App.tsx` — rotas `/admin`, `/admin/access`, `/admin/subscribers` (todas dentro de `RequireAuth`, com checagem de role na própria página + no edge function).
- `supabase/functions/admin-users/index.ts` *(novo)* — backend único pras 3 ações.

## Fora deste plano

- Não publico agora — você dá o comando quando estiver pronto.
- Não crio usuários vitalícios ainda — você usa o painel depois.
- Outras seções do `/admin` (suporte, feedback, dashboards mais ricos) ficam pra um próximo plano.
