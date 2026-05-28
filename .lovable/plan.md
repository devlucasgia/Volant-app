# Sprint — Fluxo Premium mais direto + botões premium

## Objetivo
Encurtar o caminho até a escolha de planos: as informações do "Acesso Premium por 7 dias" passam a viver **dentro** do card expandido de Ajustes > Assinatura, e o botão "Assinar agora" abre **direto** o modal de planos (mensal/anual). Sem mexer em Stripe, webhooks, banco, lógica de trial ou de assinatura.

---

## 1. Reformatar o bloco `internalTrialActive` em `Settings.tsx`

Arquivo: `src/pages/Settings.tsx` (lines 290–303)

Substituir o conteúdo atual (título + "Termina em" + botão) pela estrutura completa que hoje aparece no modal intermediário:

- **Topo**: ícone coroa em círculo + badge "Teste ativo" + título **"Acesso Premium por 7 dias"** + descrição curta sobre acesso sem cartão.
- **Card informativo 1** (`rounded-2xl border border-border bg-card p-4`): título "Acesso Premium por 7 dias" + "Todos os recursos estão liberados, sem cartão e sem cobrança automática."
- **Card informativo 2** (`rounded-2xl border border-primary/25 bg-primary/[0.06] p-4`): ícone Clock + "Termina em **{trialEndLabel}**" + "Depois disso, você decide se quer continuar."
- **Bloco de conversão**: texto "Quer continuar usando sem interrupções?" + botão **"Assinar agora"** (novo estilo premium, ver §3).

O botão `Assinar agora` continua chamando `onOpenAcquisition`, mas agora abrindo direto a view de **planos** — ver §2.

## 2. Pular o modal intermediário → abrir planos direto

Arquivo: `src/pages/Settings.tsx`
- Linha 696: trocar `setSubscriptionInitialView("auto")` por `setSubscriptionInitialView("plans")` quando o gatilho vier do card de trial ativo.
- Para preservar comportamento dos outros estados (lifetime, paga ativa, expirado), passar a decisão via parâmetro: `onOpenAcquisition: (view?: "plans" | "auto") => void`. O bloco `internalTrialActive` chama `onOpenAcquisition("plans")`; os demais continuam com `"auto"`.

Arquivo: `src/components/account/SubscriptionSheet.tsx`
- Nenhuma mudança de lógica. A view `"trial_internal"` continua existindo (fallback se alguém abrir com `initialView="auto"` em trial), mas no fluxo principal não será mais acionada vinda de Ajustes.

## 3. Botões premium com shimmer em loop

Criar uma classe utilitária reutilizável em `src/index.css` (ou no `@layer components`):

```css
.btn-premium-cta {
  @apply relative overflow-hidden rounded-xl text-primary-foreground font-semibold;
  background: linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(var(--primary)/0.85) 100%);
  border: 1px solid hsl(var(--primary)/0.55);
  box-shadow:
    0 1px 0 hsl(0 0% 100% / 0.08) inset,
    0 0 0 1px hsl(var(--primary)/0.15),
    0 8px 24px -8px hsl(var(--primary)/0.45);
}
.btn-premium-cta::after {
  content: "";
  @apply pointer-events-none absolute inset-0;
  background: linear-gradient(110deg, transparent 35%, hsl(0 0% 100% / 0.18) 50%, transparent 65%);
  transform: translateX(-100%);
  animation: premium-shimmer 3.8s ease-in-out infinite;
}
@keyframes premium-shimmer {
  0%   { transform: translateX(-100%); }
  60%  { transform: translateX(100%); }
  100% { transform: translateX(100%); }
}
@media (prefers-reduced-motion: reduce) {
  .btn-premium-cta::after { animation: none; }
}
```

Aplicar `className="btn-premium-cta"` (substituindo `gradient-success text-primary-foreground shadow-[...]`) em:
- `Settings.tsx` — botão "Assinar agora" do card de trial.
- `SubscriptionSheet.tsx` — botões "Assinar plano mensal/anual" (view `plans`) e "Ver planos" (view `expired`). Manter o "Mudar para o anual" também.

Resultado: gradiente sutil + glow verde externo + borda com leve brilho + shimmer lento em loop (3.8s), com respeito a `prefers-reduced-motion`.

## 4. Não tocar
- `useSubscription`, `create-checkout`, `payments-webhook`, tabelas, preços, portal, `StripeEmbeddedCheckout`.
- Lógica de `internalTrialActive/Expired`, `isPaidPremium`, `isGrandfathered`.
- Demais views do `SubscriptionSheet` (`active`, `lifetime`, `checkout`).

## 5. QA mobile (viewport 375)
- Card de trial ativo: cards informativos não estouram, espaçamentos confortáveis, botão acessível.
- Clique em "Assinar agora" → abre **direto** na tela com cards Mensal/Anual (sem etapa de trial).
- Botões com shimmer: animação fluida, sem piscar, performance ok.
- Dark mode mantém identidade Volant.

---

## Respostas às dúvidas

### 1. "Modo de teste" ainda aparece após Stripe live + app instalado
É esperado nesta fase. O fluxo go-live tem 5 etapas e você está entre a 2 e a 4:

1. ✅ Reivindicar conta — feito.
2. ⏳ **Ativar conta live na Stripe** — em análise pela Stripe (normalmente 1–3 dias úteis). É isso que está travando "modo teste".
3. ✅ Instalar app Lovable na conta live — você já fez via push.
4. ⏳ **Provisionar chaves live** — Lovable faz automaticamente assim que a Stripe aprovar a conta. Você não faz nada.
5. ⏳ Readiness check — desbloqueia quando 1–4 estiverem prontos.

**O que dá pra adiantar enquanto a Stripe verifica:**
- Conferir e-mail de verificação da Stripe (caso ainda esteja pendente).
- Garantir que dados de PJ/PF, conta bancária e 2FA estão completos no dashboard Stripe.
- Não precisa mexer em código. Quando a Stripe liberar, o Lovable troca a chave `pk_test_...` por `pk_live_...` automaticamente e o "modo teste" some.

### 2. PIX / Boleto
Resumo honesto:

- **Boleto** já aparece porque Stripe Brasil habilita por padrão em `mode: payment`.
- **PIX** existe na Stripe Brasil, mas **só funciona em pagamento único** (`mode: payment`) — **não funciona em assinatura recorrente** (`mode: subscription`), que é o que o Volant usa hoje.
- Para oferecer PIX/Boleto no Volant, o caminho é criar um **fluxo paralelo de "Pagar 1 ano à vista"** (pagamento único de R$ 89,90 via PIX/Boleto/cartão), e cuidar manualmente da renovação (notificação 7 dias antes do vencimento + novo link de pagamento). O plano mensal continua só em cartão.
- Habilitar PIX no dashboard Stripe é simples (Settings → Payment methods → Pix → ativar), **mas** sem o código novo no checkout ele não aparece para o usuário final.

**Prompt para sprint futura** (você me manda quando quiser):

> "Quero adicionar fluxo de pagamento à vista anual no Volant. Criar um segundo botão no modal de planos chamado 'Pagar 1 ano à vista (PIX/Boleto/Cartão)' que usa `mode: payment` em vez de `subscription`, com `payment_method_types: ['card', 'boleto', 'pix']`. Estender `create-checkout` para aceitar `mode` como parâmetro. Salvar o registro como assinatura anual com `current_period_end = hoje + 365 dias` e `cancel_at_period_end = true`. Criar job/notificação para avisar o usuário 7 dias antes do vencimento com link para renovar. Não mexer no fluxo mensal nem no anual recorrente atuais."

Posso configurar tudo isso sozinha quando você me autorizar — só não rola na mesma sprint que essa UX.
