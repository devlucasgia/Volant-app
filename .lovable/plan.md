## Visão geral

Integração de assinaturas via **Stripe nativo do Lovable** (sem necessidade de conta Stripe própria nesta fase). Tudo começa em **sandbox/test**. Beta atual NÃO é bloqueado até decidirmos regra de corte.

Modelo: trial 7 dias → Mensal R$ 19,90 ou Anual R$ 89,90 (economia 62%) → cobrança automática.

---

## 1. Mudanças no banco

Nova tabela `subscribers` (uma linha por usuário):

| Campo | Tipo | Função |
|---|---|---|
| `user_id` | uuid (PK, FK auth.users) | dono |
| `email` | text | redundância p/ webhook |
| `stripe_customer_id` | text | id do cliente no Stripe |
| `stripe_subscription_id` | text | id da assinatura |
| `price_id` | text | preço atual (mensal/anual) |
| `plan` | text | `monthly` \| `yearly` \| `none` |
| `status` | text | `trialing` \| `active` \| `past_due` \| `canceled` \| `expired` \| `none` |
| `trial_end` | timestamptz | fim do trial |
| `current_period_end` | timestamptz | próxima cobrança |
| `cancel_at_period_end` | bool | cancelamento agendado |
| `beta_grandfathered` | bool default `true` | flag para não bloquear beta atual |
| `created_at`/`updated_at` | timestamptz | |

**RLS:** SELECT só do próprio user; INSERT/UPDATE apenas via service_role (edge functions). Trigger no `auth.users` cria linha vazia com `beta_grandfathered=true` para todo novo signup já existente/futuro.

Tabela auxiliar `stripe_webhook_events` (id text PK, type, payload jsonb, processed_at) para idempotência.

---

## 2. Produtos e preços no Stripe

Criados via `batch_create_product` após habilitar:

- **Produto:** "Volant Premium"
  - Preço mensal: BRL 1990 centavos, recurring `month`, trial_period_days=7
  - Preço anual: BRL 8990 centavos, recurring `year`, trial_period_days=7

Metadata em cada preço: `plan: monthly|yearly` para facilitar mapeamento.

---

## 3. Edge functions

Todas em `supabase/functions/`:

| Função | Verify JWT | Função |
|---|---|---|
| `create-checkout` | sim | cria Checkout Session (mode=subscription, trial=7d) e retorna URL |
| `customer-portal` | sim | cria sessão do Customer Portal e retorna URL |
| `check-subscription` | sim | consulta Stripe + atualiza `subscribers`, retorna estado atual (fallback se webhook atrasar) |
| `stripe-webhook` | NÃO (usa signature) | recebe eventos, valida assinatura, grava em `stripe_webhook_events`, atualiza `subscribers` |

Secret necessário: `STRIPE_WEBHOOK_SECRET` (gerado ao registrar webhook no dashboard sandbox).

---

## 4. Eventos de webhook tratados

- `checkout.session.completed` → cria/atualiza `subscribers` com customer e subscription
- `customer.subscription.created`
- `customer.subscription.updated` → sincroniza status, plan, period_end, cancel_at_period_end
- `customer.subscription.deleted` → status `canceled` / `expired`
- `customer.subscription.trial_will_end` (opcional, futuro: enviar email aviso)
- `invoice.payment_succeeded` → mantém `active`, atualiza `current_period_end`
- `invoice.payment_failed` → status `past_due`

Idempotência: `event.id` deduplicado via `stripe_webhook_events`.

---

## 5. Mudanças na UI

- **`SubscriptionSheet.tsx`** (já existe): trocar handler do botão "Começar teste grátis" para chamar `create-checkout` com plano selecionado e abrir URL em nova aba.
- **Nova tela "Minha Assinatura"** (`/account/subscription` ou expansão do sheet): mostra plano atual, status (badge colorido), próxima cobrança, dias restantes do trial, botão "Gerenciar assinatura" → chama `customer-portal`. Visual idêntico ao padrão Volant (dark, cards `rounded-2xl`, accent verde).
- **Hook `useSubscription()`**: lê `subscribers` em realtime, expõe `{status, plan, isActive, trialDaysLeft, isBetaGrandfathered}`.
- **Banner sutil no topo da Home** quando `status='past_due'` ou `trialDaysLeft<=2`.
- **Página de retorno** `/subscription/success` e `/subscription/canceled` (simples, chama `check-subscription` ao montar).

---

## 6. Estratégia de controle de acesso (paywall)

Função utilitária `hasAppAccess(sub)`:
```
return sub.beta_grandfathered
    || sub.status in ('trialing','active','past_due')
```

- **`past_due`** mantém acesso por 7 dias (grace period) — depois vira `expired`.
- **`expired`/`canceled`** → componente `<Paywall/>` renderiza no lugar do conteúdo das rotas protegidas, com CTA para reativar.
- **`beta_grandfathered=true`** (todos os usuários atuais e novos até decidirmos o corte): NUNCA bloqueia. Flag será virada manualmente via SQL quando definirmos a data de início da cobrança obrigatória.
- Implementado via `<RequireSubscription>` wrapper opcional nas rotas (Dashboard, Reports, History). Settings sempre acessível.

---

## 7. Checklist de testes (sandbox)

1. Signup novo → linha em `subscribers` com `beta_grandfathered=true`, `status='none'`.
2. Clicar "Começar teste grátis" mensal → Checkout abre → cartão teste `4242 4242 4242 4242` → retorna sucesso.
3. Webhook `checkout.session.completed` chega → `status='trialing'`, `trial_end` correto.
4. UI mostra "Trial — X dias restantes".
5. Acelerar trial no dashboard Stripe → webhook `invoice.payment_succeeded` → `status='active'`.
6. Cartão `4000 0000 0000 0341` (falha) → `invoice.payment_failed` → `status='past_due'`.
7. Cancelar via Customer Portal → `cancel_at_period_end=true` → ao expirar, `status='canceled'`.
8. Trocar plano mensal↔anual via Portal → `subscription.updated` reflete.
9. Webhook duplicado → ignorado (idempotência).
10. Usuário com `beta_grandfathered=true` e `status='expired'` → ainda acessa app.
11. Mobile (406px): Checkout/Portal abrem corretamente, "Minha Assinatura" responsivo.

---

## 8. Ordem de implementação

1. `enable_stripe_payments` (você preenche o form — sandbox ativa automático).
2. Migration: tabela `subscribers` + `stripe_webhook_events` + RLS + trigger no signup + backfill `beta_grandfathered=true` para usuários existentes.
3. Criar produtos/preços (mensal e anual com trial 7d).
4. Edge functions: `create-checkout`, `customer-portal`, `check-subscription`, `stripe-webhook`.
5. Registrar webhook no Stripe sandbox e salvar `STRIPE_WEBHOOK_SECRET`.
6. Hook `useSubscription` + atualizar `SubscriptionSheet` para chamar checkout.
7. Tela "Minha Assinatura" + páginas de retorno.
8. Componente `<Paywall/>` + wrapper `<RequireSubscription>` — **desabilitado por padrão** (beta_grandfathered cobre todos).
9. Banner para `past_due` / trial acabando.
10. Rodar checklist completo no sandbox.
11. (Futuro, fora deste sprint) decidir data de corte do beta → virar flag → ativar live.

---

## Fora de escopo deste sprint

- Ativação de live billing (continua sandbox).
- Bloqueio de usuários beta atuais.
- Pix (Stripe Brasil via Lovable não suporta nativo — ficaria para outra integração).
- Emissão de NF-e brasileira.
- Cupons / códigos promocionais.
- Upgrade/downgrade prorrateado custom (Customer Portal já cobre).
