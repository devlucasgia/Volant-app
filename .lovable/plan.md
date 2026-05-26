# Sprint — Pré-lançamento (estabilização para versão paga)

Escopo aprovado pelo usuário; tudo fora dessa lista foi deixado para sprints futuras.

## Itens implementados

### C1 — Flash da landing antes do /app
- Criado `src/components/SplashScreen.tsx` (logo + spinner, tema escuro fixo).
- `Landing.tsx` agora renderiza `<SplashScreen />` enquanto `useAuth().loading` for `true`, em vez de mostrar a página de vendas inteira.
- Usuários já logados não veem mais o "flash" da página de vendas antes do redirect pro `/app`.

### P3 — Splash unificado
- `RequireAuth.tsx` e `RequirePremium.tsx` passaram a usar o mesmo `SplashScreen`.
- Loader visual unificado entre landing, auth e premium gate.

### C3 — Confirmação RLS de `signup_notifications`
- Verificado: a tabela é tocada APENAS pela edge function `notify-new-user` (service_role). Não há uso client-side.
- Migration original já tem `enable row level security` sem nenhuma policy pública → tabela já é fail-closed para anon/authenticated. **Sem alteração necessária.**

### I3 — Banner de modo teste do Stripe
- Auditado `PaymentTestModeBanner.tsx`: já tem gate por `pk_test_` prefix do client token.
- Em `live`, o token publishable não começa com `pk_test_`, então o banner nunca aparece.
- Componente também não está sendo montado em lugar nenhum hoje, então é só "munição de segurança" pré-pronta. Sem alteração.

### I5 — Webhook do Stripe
- Adicionado handler para `invoice.payment_failed` em `supabase/functions/payments-webhook/index.ts`.
- Quando um pagamento falha, marca a assinatura como `past_due` de forma idempotente (sem alterar regras Premium — o hook `useSubscription` continua tratando `past_due` como ativo dentro do período corrente).
- Cobertura final: `subscription.created`, `subscription.updated`, `subscription.deleted`, `invoice.payment_failed`.

### I6 — Termos e Privacidade
- Criadas rotas públicas `/termos` (`src/pages/Termos.tsx`) e `/privacidade` (`src/pages/Privacidade.tsx`).
- Conteúdo base revisável (rascunho jurídico inicial, alinhado em traços gerais à LGPD).
- Adicionado link discreto no rodapé do `Auth.tsx` para Termos e Privacidade.

### P4 — Recuperação de senha
- Criada rota pública `/reset-password` (`src/pages/ResetPassword.tsx`) com formulário de nova senha.
- Adicionado link "Esqueci minha senha" no modo signin do `Auth.tsx`, que dispara `supabase.auth.resetPasswordForEmail` com `redirectTo` para `/reset-password`.
- Pós-redefinição: faz signOut da sessão recovery e leva o usuário para `/auth`.

### P5 — SEO e 404
- `index.html` ganhou `<link rel="canonical" href="https://usevolant.app/" />`. Title, description e OG já estavam ok.
- `NotFound.tsx` reescrita com identidade Volant (tema escuro, CTA para `/app`, link de retorno para `/`).
- Removido `console.error` ruidoso em produção (mantido só em DEV).

### Bônus solicitado — Vão das subtelas de Ajustes
- `Personalizacao`, `CentralVeiculos`, `Categorias` e `PlanejamentoInteligente`: o container passou de `min-h-screen` + conteúdo no topo para `flex min-h-[100dvh] flex-col` + bloco de cards centralizado verticalmente (`flex-1 justify-center`) e `pb-28` para respirar acima da bottom nav.
- O vão grande mostrado nos prints sumiu — os cards agora se acomodam no centro vertical da área visível, sem alterar lógica nem rotas.

---

## Itens fora de escopo nesta sprint (decididos pelo usuário)

- **C2** — Custom Google OAuth (consent screen "Volant" em vez de "Lovable"): requer configuração externa no Google Cloud. Será tratado depois.
- **C4** — Resend / remetente / domínio de e-mail: sprint separada.
- **Cadastro/login por telefone**: sprint separada, sensível.
- Nada foi tocado em: Home visual, Relatórios, KM Inteligente, Central de Notificações, PWA, onboarding, landing visual, banco crítico, Stripe além do necessário.

---

## Arquivos alterados

- novo: `src/components/SplashScreen.tsx`
- novo: `src/pages/Termos.tsx`
- novo: `src/pages/Privacidade.tsx`
- novo: `src/pages/ResetPassword.tsx`
- editado: `src/App.tsx` (3 rotas públicas novas)
- editado: `src/components/RequireAuth.tsx`
- editado: `src/components/RequirePremium.tsx`
- editado: `src/pages/Landing.tsx` (splash em loading)
- editado: `src/pages/Auth.tsx` (esqueci senha + links Termos/Privacidade)
- editado: `src/pages/NotFound.tsx`
- editado: `src/pages/Personalizacao.tsx` (centralização vertical)
- editado: `src/pages/CentralVeiculos.tsx` (centralização vertical)
- editado: `src/pages/Categorias.tsx` (centralização vertical)
- editado: `src/pages/PlanejamentoInteligente.tsx` (centralização vertical)
- editado: `supabase/functions/payments-webhook/index.ts` (invoice.payment_failed)
- editado: `index.html` (canonical)
