## Visão geral

Três frentes que conversam entre si: a régua de e-mail empurra o usuário pra ativação e depois pra conversão, a tela de fim de trial captura quem deixou o trial expirar, e o tutorial de instalação no onboarding aumenta a base instalada (que sobe retenção e melhora os números das duas frentes anteriores).

---

## 1. Régua de e-mail do trial (3 disparos)

### Infra
- 1 migration cria tabela `trial_email_log` (`user_id`, `stage`, `sent_at`, unique em `user_id+stage`) pra dedup e idempotência.
- 1 cron job (pg_cron a cada hora) chama nova edge function `check-trial-emails` que varre `profiles` com `trial_started_at`/`trial_ends_at` e enfileira o estágio devido. Reaproveita `enqueue_email` → fila `transactional_emails`.

### 3 templates novos em `supabase/functions/_shared/transactional-email-templates/`
Todos seguindo a identidade dos templates atuais (welcome, maintenance-alert), CTA verde primária, tom PT-BR direto.

- **`trial-welcome.tsx`** — disparado ~1h após signup (D+0). Foco: "Faça seu primeiro registro hoje". Mostra 3 passos curtos (cadastrar carro, registrar 1 ganho, registrar 1 gasto). CTA "Abrir o Volant" → `/app`.
- **`trial-ending-soon.tsx`** — D-2 (48h antes de `trial_ends_at`). Mostra resumo do que ele já registrou (bruto/líquido do período, total de registros) puxado on-the-fly. CTA "Assinar com 25% off" → `/app/assinar?cupom=primeiros25`. Tom: "não perca seu histórico + economia".
- **`trial-ended.tsx`** — disparado quando `trial_ends_at` já passou e ele ainda não assinou. Tom: "seu trial acabou, mas seus dados continuam aqui". CTA "Voltar a usar o Volant" → mesma rota com cupom.

### Edge function `check-trial-emails`
Roda de hora em hora. Para cada usuário elegível:
- `D+0`: `trial_started_at` entre 1h e 2h atrás, sem registro em `trial_email_log` pro stage `welcome`.
- `D-2`: `trial_ends_at` entre 47h e 49h no futuro, sem stage `ending_soon`.
- `D-0`: `trial_ends_at` entre 0h e 1h no passado, sem stage `ended`, e sem assinatura ativa em `subscriptions`.

Enfileira o e-mail e insere log na mesma transação. Verifica `subscriptions` (status active/trialing/past_due) antes de cada disparo pra não mandar pra quem já assinou.

---

## 2. Tela de fim de trial in-app (bloqueio total)

### Comportamento
- Já existe `RequirePremium.tsx` e `useSubscription`. Hoje provavelmente mostra `Paywall`. Reforçar pra que, quando `trial_ends_at` já passou e não há assinatura, **toda navegação autenticada** (exceto `/assinar`, `/ajustes/assinatura` e logout) redirecione pra nova rota `/trial-encerrado`.
- Implementação: ajuste em `RequireAuth` ou `AppLayout` que checa `trial_ends_at < now() && !isActive` e força redirect.

### Nova página `src/pages/TrialEncerrado.tsx`
- Hero: "Seu trial dos 7 dias acabou 🎉"
- Subtexto: "Você registrou X ganhos e Y gastos no Volant. Não perca essa base — continue de onde parou."
- Cards: mostrar o líquido total que ele acumulou no trial (puxa de `entries`) como prova de valor.
- CTA principal verde: "Assinar Volant Premium" → abre `StripeEmbeddedCheckout` direto na mesma página (sem redirect extra), com cupom `primeiros25` pré-aplicado se ainda válido.
- CTA secundário pequeno: "Sair da conta".
- Sem bottom nav, sem drawer (usa `chromeHidden`).

---

## 3. Tutorial de instalação como passo 1 do onboarding

### Onde encaixar
- O `OnboardingFlow.tsx` atual roda em sequência: carro → custos → planejamento (flags `car_onboarded`, `costs_onboarded`, `planning_onboarded` em `profiles`).
- Adicionar **antes** desses 3, uma nova flag `install_prompt_seen` em `profiles` (default false). Migration simples.
- Novo passo `InstallStep` no `OnboardingFlow` que aparece se `!install_prompt_seen && !isStandalone()`. Marca a flag quando o usuário clica "Continuar" ou "Pular".

### Detecção iOS vs Android (já temos)
`src/lib/pwaInstall.ts` já expõe `detectPlatform()` retornando `android-chrome | desktop-chromium | ios-safari | ios-other | unsupported`. Vou usar isso direto.

### 3 variantes de UI na nova `OnboardingInstallStep.tsx`
- **Android (`android-chrome`)**: usa `usePwaInstall` → botão "Instalar agora" dispara `promptInstall()` nativo. Se aceito, marca `install_prompt_seen` e avança. Se recusado/indisponível, mostra tutorial visual (3 passos: menu ⋮ → "Adicionar à tela inicial" → confirmar) com botão "Já instalei / Continuar".
- **iOS Safari (`ios-safari`)**: tutorial visual com 3 passos ilustrados — ícone Share (□↑) → "Adicionar à Tela de Início" → "Adicionar". Botão "Já fiz / Continuar".
- **iOS não-Safari (`ios-other`)**: aviso curto "Pra instalar no iPhone, abra `usevolant.app` no Safari" + botão "Continuar" (permite pular sem perder o usuário).
- **Desktop / unsupported**: pula automaticamente, marca flag e segue pro carro.

### Impacto no fluxo existente
- `InstallPromptManager` (que aparece 8s depois com snooze de 7 dias) continua existindo, mas só dispara se `install_prompt_seen === false` **e** o usuário pulou no onboarding. Evita duplicar prompt.

### Copy mobile-first
Tom curto e direto: "Instale o Volant no celular pra abrir como app, registrar mais rápido e receber notificações de manutenção."

---

## Detalhes técnicos

**Migrations (1 só, agrupada):**
- `CREATE TABLE public.trial_email_log` com GRANTs (`service_role` ALL; sem grant `authenticated` — só backend lê/escreve), RLS habilitado, policy `service_role` ALL.
- `ALTER TABLE public.profiles ADD COLUMN install_prompt_seen boolean NOT NULL DEFAULT false`.
- Cron `cron.schedule('check-trial-emails-hourly', '0 * * * *', ...)` via `supabase--insert` (não migration, porque carrega URL e anon key).

**Edge functions novas:**
- `supabase/functions/check-trial-emails/index.ts` — cron worker.

**Templates novos:** 3 arquivos `.tsx` + atualização do `registry.ts`. Deploy via `supabase--deploy_edge_functions` em `send-transactional-email` + `check-trial-emails`.

**Frontend novo:**
- `src/pages/TrialEncerrado.tsx` (rota nova `/trial-encerrado` em `App.tsx`).
- `src/components/onboarding/OnboardingInstallStep.tsx`.
- Ajustes em `OnboardingFlow.tsx` (adicionar passo), `RequireAuth.tsx` ou `AppLayout.tsx` (gate de trial expirado), `InstallPromptManager.tsx` (respeitar nova flag).

**O que NÃO muda:**
- `welcome.tsx` continua igual (manda no signup, antes do D+0 da régua).
- `Paywall.tsx` continua sendo usado em features premium isoladas.
- `maintenance-alert`, `weekly-summary`, `new-subscription`, `payment-failed`, `subscription-canceled` intactos.
- Stripe checkout/portal não muda.

---

## Ordem de execução proposta

1. Migration (tabela `trial_email_log` + coluna `install_prompt_seen`).
2. 3 templates + registry + deploy de `send-transactional-email`.
3. Edge function `check-trial-emails` + deploy + cron.
4. Página `TrialEncerrado` + gate de trial expirado.
5. `OnboardingInstallStep` + integração no `OnboardingFlow` + ajuste no `InstallPromptManager`.
6. QA manual: criar conta nova, verificar passo de instalação aparecendo; forçar `trial_ends_at` no passado pra ver tela de fim de trial; rodar `check-trial-emails` manualmente pra ver os 3 templates no preview.

Tudo somado: ~6-8 arquivos novos, ~4 editados, 1 migration, 1 cron.