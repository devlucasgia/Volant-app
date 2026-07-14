## Contexto

`suporte@usevolant.com.br` recebeu um bounce permanente em 07/07 (após o e-mail de cancelamento de assinatura) e foi adicionado a `suppressed_emails`. Desde então, todas as notificações internas (`new-user-signup`, `subscription-*`, `payment-failed-internal`) para esse destino saem como `suppressed` e não são entregues. Os demais e-mails do app (welcome, trial-*, weekly-summary) continuam sendo enviados normalmente para os usuários.

## Passos

1. **Remover a supressão** do endereço `suporte@usevolant.com.br` na tabela `suppressed_emails` (registro `fb8ac0b1-c8bd-4bc0-aa7d-29af9ea3aed2`), para desbloquear novas entregas.
2. **Reenviar manualmente uma notificação de teste** invocando `send-transactional-email` com o template `new-user-signup` (dados fictícios, `idempotencyKey` único) para confirmar que a entrega chega na caixa.
3. **Se bouncear de novo**: o problema está no mailbox/DNS do domínio (registro MX de `usevolant.com.br` ou a conta `suporte@` inexistente/cheia). Nesse caso, você precisa validar com seu provedor de e-mail — Lovable não gerencia esse mailbox, só envia. Podemos, opcionalmente, apontar as notificações internas para outro endereço (ex.: `contato@usevolant.com.br`, que já está sendo usado com sucesso em logins) alterando a config/env do destino.
4. **Se entregar**: manter e apenas monitorar `email_send_log` nas próximas horas.

## O que NÃO será alterado

- Templates, fila (`process-email-queue`), configuração de domínio `notify.usevolant.com.br`, ou lógica de envio. O envio em si está saudável — apenas um destino específico foi bloqueado pelo mecanismo de supressão (comportamento correto do sistema).

## Resposta paralela sobre movimento desde 07/07

- 2 cadastros novos (ambos aparentam ser testes seus).
- 0 assinaturas novas pagas.
- 1 cancelamento em 07/07 (plano `volant_premium_monthly`, live).
