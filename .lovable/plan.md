## Problemas

1. **Paywall hard quebrou o modelo existente.** Hoje, quando o trial acaba, `RequirePremium` força uma tela cheia de `Paywall`. O modelo correto é o que já existia: app navegável, recursos-chave (registrar ganho/gasto, histórico, planejamento, relatórios completos) ficam com overlay de cadeado + CTA "Desbloquear Premium" abrindo o modal de assinatura (igual ao print enviado).

2. **Trial de 7 dias não está sendo concedido em novos cadastros.** Conta `lucas.sgoncalves@totvs.com.br` (criada hoje 17:38 UTC) está com `trial_access_granted=false`, `trial_started_at=null`, `trial_ends_at=null`. Logs de `grant-trial` mostram zero invocações.

   **Causa raiz**: `useSubscription.ts` só chama `grant-trial` se `env === "live"`. Quando o usuário entra pelo preview (`*.lovable.app` com token `pk_test_…`), o env é `sandbox` e o trial nunca é concedido — depois da onboarding ele cai direto em "sem acesso". Mesmo no live, depender exclusivamente do client é frágil: se o usuário fechar antes do `useSubscription` carregar, nada é concedido.

## Plano

### 1. Reverter o hard paywall (`src/components/RequirePremium.tsx`)
Remover o bloco que renderiza `<Paywall onSignOut={…} />` quando `internalTrialExpired && !isPaidPremium`. Voltar para o comportamento anterior: sempre renderizar `<AccessProvider isFull={sub.isActive}>{children}</AccessProvider>`. Quando `isActive=false`, os overlays/locks já existentes (`PremiumLockOverlay`, gates do `EntryDrawer`, `History`, `Reports`, `PlanejamentoInteligente`) tomam conta com seus CTAs para o modal de assinatura — sem reescrever nada desses componentes.

### 2. Garantir trial em todo signup — duas camadas

**a) Trigger no banco (fonte da verdade)** — nova migration que cria um trigger `AFTER INSERT ON public.profiles`: se `trial_access_granted=false` e `beta_grandfathered=false`, seta `trial_started_at = now()`, `trial_ends_at = now() + 7 days`, `trial_access_granted = true`. Roda como `SECURITY DEFINER` (já que as colunas têm trigger restritivo a service_role). Assim, qualquer caminho que crie um profile (signup web, futuros canais) recebe o trial automaticamente — sem depender de client.

**b) Remover o gate de env do client (`src/hooks/useSubscription.ts`)** — tirar a condição `env === "live"` do `shouldGrant`. O trigger já cuida do caso geral; o `grant-trial` fica como fallback de retrocompat para usuários antigos cujo profile foi criado antes do trigger. Sem o gate, preview também concede trial — não é problema: `trial_access_granted` impede regrant; a única "perda" é que testar em preview consome a semana daquele usuário de preview, e isso é aceitável.

### 3. Backfill
Migration roda também um `UPDATE public.profiles SET trial_started_at = now(), trial_ends_at = now() + interval '7 days', trial_access_granted = true WHERE trial_access_granted = false AND beta_grandfathered = false AND trial_started_at IS NULL;` — pega `lucas.sgoncalves@totvs.com.br` e qualquer outro novo signup recente que tenha caído nessa falha.

### Detalhes técnicos
- Trigger usa `SECURITY DEFINER SET search_path = public` e só altera quando os flags estão limpos (idempotente).
- Não mexer em `Paywall.tsx`, `AccessContext.tsx`, `PremiumLockOverlay.tsx`, `EntryDrawer`, `History`, `Reports`, `PlanejamentoInteligente` — eles já fazem o gating correto.
- Não mexer em onboarding install step, emails de trial, paywall modal — escopo só do bug.

### Arquivos
- editar `src/components/RequirePremium.tsx` (remover bloco hard paywall)
- editar `src/hooks/useSubscription.ts` (remover `env === "live"` do `shouldGrant`)
- nova migration: trigger `on_profile_created_grant_trial` + backfill

### Verificação
Após aplicar: re-checar `profiles` da conta de teste (deve mostrar `trial_ends_at` ~7 dias à frente) e navegar pela conta para confirmar acesso total durante o trial, com locks/CTAs reaparecendo só quando expirar.
