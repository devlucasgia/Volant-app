## 1. Correção do card "Teste ativo" (Ajustes › Assinatura expandido)

**Arquivo único:** `src/pages/Settings.tsx` (bloco `internalTrialActive`, linhas 290–302).

**Hoje** aparecem duas frases longas + "Seu acesso termina em…" diluído no parágrafo — informação que se repete no modal "Assinar agora".

**Mudança (apenas esse bloco):**

- Manter o título em negrito: **"Acesso Premium por 7 dias"** (mudar `text-sm text-foreground` → `text-sm font-semibold text-foreground` para reforçar o negrito).
- Remover totalmente o parágrafo "Você está usando todos os recursos Premium… Depois, você decide se quer continuar."
- Adicionar, logo abaixo do título, um bloco compacto e sofisticado com a data de término, no mesmo estilo visual usado no `SubscriptionSheet` ("Termina em **{data}**"):
  - Separador fino (`border-t border-border/60`) acima.
  - Linha `text-xs text-muted-foreground` com `Termina em` + data em `font-semibold text-foreground`.
- Manter o botão `Assinar agora` exatamente como está (mesmo estilo, mesmo handler, mesmo `gradient-success`).

**Nada mais é tocado:** `SubscriptionSheet`, modal de planos, checkout, hook `useSubscription`, copy de outros estados (lifetime / active / expired / plans), nem qualquer lógica de trial/Stripe.

### Resultado visual esperado

```text
👑  Assinatura                          [Teste ativo]  ▾
─────────────────────────────────────────────────────
Acesso Premium por 7 dias
─────────────────────────────────────────────────────
Termina em 02 de junho de 2026
[          Assinar agora          ]
```

---

## 2. Resposta — Após validação Stripe, falta algo no app?

**Não, do lado do app está tudo pronto.** O fluxo de go-live tem 5 etapas e o que depende de você termina quando a Stripe aprova o cadastro:

1. ✅ Reivindicar conta (feito).
2. ⏳ Ativar conta para live (em análise pela Stripe — 2-3 dias).
3. Instalar o app Volant na conta live (geralmente automático se você marcou "copiar" ao migrar; senão é 1 clique).
4. **Provisionar chaves live (automático Lovable)** — assim que a etapa 3 fecha, o Lovable cria as chaves live, registra o webhook live e injeta os secrets nas edge functions. Você não faz nada.
5. **Readiness check** — botão na aba Pagamentos que valida produtos, preços e webhooks em live. Rodar antes de divulgar.

Resumo prático após a aprovação:
- Aguardar etapas 3 e 4 ficarem verdes (acompanhar em Lovable › Pagamentos › aba Live).
- Rodar o readiness check.
- Fazer 1 compra real de teste (cartão próprio, mensal R$ 19,90) e cancelar pelo portal — confirma que webhook live grava em `subscriptions` com `environment='live'` e que o `useSubscription` libera acesso.
- Publicar. O `.env.production` com `pk_live_...` já é injetado automaticamente no build de produção.

Nenhuma alteração de código é necessária para o go-live em si.

---

## 3. Resposta — PIX, Boleto e parcelamento sem juros

**PIX e Boleto:** ✅ totalmente possível. A Stripe Brasil suporta os dois como métodos de pagamento. Como hoje usamos **Embedded Checkout**, basta ativar PIX e Boleto no painel da Stripe (Settings › Payment methods) — eles aparecem automaticamente no checkout sem mudança de código. Importante:
- PIX e Boleto **não suportam assinatura recorrente** na Stripe. Só funcionam para pagamento único.
- Para o plano **anual** podemos oferecer PIX/Boleto como "pagamento único de 12 meses" (mode: `payment` em vez de `subscription`) e tratar a renovação manualmente (lembrete por e-mail antes de expirar).
- Para o **mensal** não dá — recorrência exige cartão.

**Parcelamento sem juros no anual:** ✅ possível, mas com ressalva:
- Stripe Brasil oferece parcelamento em até 12x. O **juros pode ser absorvido por você** (você recebe o valor cheio à vista, mas paga a taxa de parcelamento à Stripe ~2-3% por parcela adicional) ou **repassado ao cliente**.
- Para "sem juros para o cliente E você recebe integral", a configuração é `installments: { enabled: true }` com `plan` no checkout — Stripe cobra a taxa de antecipação de você. **Não é gratuito**: cada parcela extra reduz sua margem em ~2,5%. Em 12x você recebe ~R$ 78 dos R$ 89,90 anuais.
- Também só funciona em modo `payment` (compra única), não em `subscription`.

### Implicação de arquitetura

Para habilitar PIX/Boleto/parcelamento no anual, precisaríamos em uma sprint futura:
1. Trocar o checkout do plano **anual** de `mode: subscription` para `mode: payment` com período de 1 ano controlado por nós (campo `access_expires_at` na tabela `profiles` ou `subscriptions`).
2. Criar lembrete de renovação (edge function agendada ou via Resend antes de expirar).
3. Ativar PIX/Boleto/installments no painel Stripe.
4. Mensal continua como assinatura recorrente em cartão.

**Não faz parte desta sprint** — é uma decisão de produto que precisa ser planejada separadamente. Posso detalhar o plano técnico quando você quiser priorizar.

---

## Escopo desta sprint

✅ Apenas o item 1 (refator do card de teste ativo em `Settings.tsx`).
❌ Nada mais é alterado.