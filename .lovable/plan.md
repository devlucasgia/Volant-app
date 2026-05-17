## Objetivo

Remover o acesso vitalício/beta do usuário `eusousanchez@gmail.com` para que ele passe a ver os planos e o fluxo de checkout do Stripe (modo teste), sem afetar outros usuários. Em seguida, validar o fluxo completo de assinatura e documentar como o controle de acesso funciona hoje.

---

## 1. Remover acesso beta do usuário

Único campo que precisa mudar: `profiles.beta_grandfathered` → `false` para o `id` correspondente ao email `eusousanchez@gmail.com`.

Também limpar qualquer linha existente em `subscriptions` para esse `user_id` no `environment = 'sandbox'` — assim o usuário começa o teste “do zero” e não vê resíduo de assinaturas antigas de testes anteriores.

Nada mais precisa ser tocado:
- Não existe tabela de roles/admin.
- Não existe outra flag de “premium override”.
- A função `has_premium_access` lê só de `profiles.beta_grandfathered` + `subscriptions`.

Resultado esperado no app:
- `SubscriptionSheet` deixa de mostrar o badge “Beta vitalício” e passa a mostrar os cards Mensal/Anual + botão **“Começar 7 dias grátis”**.
- `useSubscription` retorna `isGrandfathered=false`, `isActive=false` até existir uma assinatura.

---

## 2. Teste do fluxo completo (sandbox)

Roteiro a executar depois da mudança:

1. Login com `eusousanchez@gmail.com`.
2. Ajustes → Assinatura → confirmar que aparecem os planos e o botão **Começar 7 dias grátis**.
3. Clicar no botão → checkout embutido do Stripe abre dentro do sheet.
4. Pagar com cartão de teste `4242 4242 4242 4242`, qualquer CVC, validade futura.
5. Após retorno, `CheckoutReturn` faz polling; webhook `payments-webhook` grava em `subscriptions` (env = `sandbox`, status = `trialing`).
6. Reabrir o sheet → deve mostrar **“Assinatura ativa”** + botão **Gerenciar assinatura** (abre Customer Portal em nova aba).
7. Verificação direta no banco (read_query): linha em `subscriptions` com `user_id` correto, `status='trialing'`, `current_period_end` futuro, `environment='sandbox'`.

Se algo falhar, checar logs de `create-checkout` e `payments-webhook`.

---

## 3. Documentação: como o acesso é gerenciado hoje

### Onde mora cada coisa

| O que | Tabela / campo | Quem escreve |
|---|---|---|
| Flag beta vitalício | `profiles.beta_grandfathered` (boolean) | Manual (SQL) |
| Assinatura paga / trial | `subscriptions` (uma linha por assinatura Stripe) | Edge function `payments-webhook` (Stripe → DB) |
| Ambiente da assinatura | `subscriptions.environment` = `'sandbox'` ou `'live'` | Webhook, baseado em qual chave Stripe foi usada |
| Cliente Stripe | `subscriptions.stripe_customer_id` / `stripe_subscription_id` | Webhook |

**Não existe** tabela de roles, nem campo de admin, nem flag “is_premium” avulsa. O conceito de “admin” no app hoje é simplesmente “ter `beta_grandfathered=true`”.

### Como o acesso é validado

Há duas camadas, sempre consistentes entre si:

1. **Cliente (UX)** — hook `src/hooks/useSubscription.ts`:
   - Lê `profiles.beta_grandfathered` e a última linha de `subscriptions` (filtrada por `environment` atual).
   - `isActive = isGrandfathered || (status ∈ {active, trialing, past_due} e período não expirou) || (canceled com período ainda válido)`.
2. **Servidor (autoritativo)** — função SQL `has_premium_access(user_uuid, check_env)`:
   - Mesma regra, executada com `security definer`. É o que deve ser usado em RLS/edge functions sensíveis.

Regra simples: **beta vitalício SEMPRE ganha**. Se `beta_grandfathered=true`, status do Stripe é ignorado.

### Como promover / rebaixar usuários manualmente

Todas as operações são SQL direto via Lovable Cloud (Backend → SQL):

**Dar acesso vitalício (promover a “beta/admin”):**
```sql
update public.profiles
set beta_grandfathered = true
where id = (select id from auth.users where email = 'pessoa@exemplo.com');
```

**Remover acesso vitalício (rebaixar a usuário normal):**
```sql
update public.profiles
set beta_grandfathered = false
where id = (select id from auth.users where email = 'pessoa@exemplo.com');
```

**Conceder acesso premium sem cobrar (sem usar beta):** crie a assinatura no Customer Portal do Stripe com cupom 100% ou marque o usuário como beta. Não há um terceiro caminho hoje — o que evita inconsistência.

**Ver quem é beta hoje:**
```sql
select u.email, p.beta_grandfathered
from public.profiles p join auth.users u on u.id = p.id
where p.beta_grandfathered = true;
```

**Ver assinatura ativa de um usuário:**
```sql
select * from public.subscriptions
where user_id = (select id from auth.users where email = 'pessoa@exemplo.com')
order by created_at desc;
```

### Ambientes (teste vs produção)

`subscriptions.environment` separa `sandbox` (testes com cartão `4242…`) de `live` (cobrança real). Tudo na UI e nas queries respeita esse filtro — então uma assinatura sandbox **não** dá acesso quando o app estiver rodando em modo live, e vice-versa. Hoje o app está em `sandbox` (banner amarelo no topo via `PaymentTestModeBanner`).

### Resumo de uma linha

> **Acesso = beta vitalício (manual no `profiles`) OU assinatura ativa no Stripe (gravada via webhook em `subscriptions`).** Sem outras camadas.

---

## Mudanças que serão feitas ao aprovar este plano

- 1 update em `profiles` (beta off para `eusousanchez@gmail.com`).
- 1 delete em `subscriptions` (linhas sandbox antigas desse usuário, se existirem).
- Nenhuma alteração de código, schema, RLS ou edge functions.
