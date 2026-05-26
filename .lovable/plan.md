# Sprint — Acesso Premium 7 dias (sem cartão) + Stripe sem trial

## Mudanças aplicadas

### 1. Banco (`profiles`)
- Adicionados: `trial_started_at`, `trial_ends_at`, `trial_access_granted` (default false).

### 2. `useSubscription` (`src/hooks/useSubscription.ts`)
- Novos campos no retorno: `isPaidPremium`, `internalTrialActive`, `internalTrialExpired`, `internalTrialEndsAt`.
- `isActive` agora é `isPaidPremium || internalTrialActive`.
- Concessão do acesso gratuito de 7 dias acontece **apenas em live** (`getStripeEnvironment() === "live"`), no primeiro carregamento do hook, quando:
  - usuário não é vitalício;
  - não há assinatura paga ativa;
  - `trial_access_granted = false`.
- Update protegido por `.eq("trial_access_granted", false)` para evitar corrida entre abas.

### 3. Stripe Checkout (`supabase/functions/create-checkout/index.ts`)
- Removido `subscription_data.trial_period_days: 7`. Mensal e anual cobram imediatamente.

### 4. Paywall (`src/components/Paywall.tsx`)
- Removidos textos "7 dias grátis", "Começar teste de 7 dias", "sem cobrança no período de teste".
- CTA: "Assinar plano mensal/anual". Hint: "Cobrança imediata. Cancele quando quiser pelo portal."

### 5. Ajustes > Assinatura
- **`SubscriptionSheet.tsx`**: novas views `trial_internal` (badge "Teste ativo") e `expired` (badge "Expirado"). View `active` perdeu menção a "trial".
- **`Settings.tsx`**: card de Assinatura reescrito com 4 ramos — vitalício, pago, trial interno ativo, trial expirado, sem acesso.

### 6. CheckoutReturn
- "Seu teste de 7 dias está ativo" → "Sua assinatura está ativa".

## Distinção paid vs trial interno
- `isPaidPremium`: apenas assinante real ou vitalício. Use para notificações/copy de Premium pago.
- `internalTrialActive`: somente acesso gratuito interno.
- `isActive`: união (libera recursos no app).

## Configurações externas Stripe a revisar manualmente
1. **Painel Stripe > Products** (`volant_premium_monthly` e `volant_premium_yearly`): conferir se o campo "Free trial" no Price está vazio.
2. **Customer Portal > Settings**: remover menções a "trial / teste grátis" da descrição visível.
3. **Billing > Settings > Customer emails**: desativar templates de "Trial ending" e "Trial started".
4. **Webhooks**: nenhuma ação — `customer.subscription.trial_will_end` simplesmente deixa de ser disparado.

## Não alterado
- Landing pública (textos remanescentes mantidos conforme restrição do escopo).
- Home, Relatórios, Histórico, KM Inteligente, Metas.
- Onboarding, autenticação, banco crítico, webhooks, RLS, vitalício, upgrade mensal→anual.
- Stripe live (chaves não tocadas).
