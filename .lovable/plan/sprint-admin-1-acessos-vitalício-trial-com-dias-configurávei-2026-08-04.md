# Sprint Admin 1 — Acessos: vitalício + trial com dias configuráveis

Transformar `/admin/access` num gerenciador de acessos manuais: conceder vitalício **ou** trial com prazo definido, listar os dois tipos, mostrar dias restantes, editar (somar dias / converter tipo) e remover acesso.

## Base confirmada no código
- `useSubscription` considera trial ativo apenas quando `trial_ends_at > agora` — nenhuma alteração no app do usuário é necessária.
- `beta_grandfathered = true` já garante Premium vitalício e vence o trial.
- As colunas de entitlement são protegidas por gatilho que só aceita `service_role`; a edge function `admin-users` já usa service_role, então pode gravar.
- Nenhuma coluna nova é necessária: sem migration.

## Arquivos alterados
1. `supabase/functions/admin-users/index.ts`
2. `src/pages/AdminAccess.tsx` (substituição completa)

Não altera: `useSubscription`, `grant-trial`, webhooks/checkout de pagamento, demais telas admin, nem qualquer tela do app do usuário.

## 1. Edge function `admin-users`
Ações existentes (`list_grandfathered`, `grant_lifetime`, `revoke_lifetime`, `list_subscribers`) permanecem intactas. Novas ações, inseridas após `revoke_lifetime`:

- `list_manual_access` — lista unificada de perfis com `beta_grandfathered = true` **ou** `trial_ends_at` preenchido, com e-mail resolvido, flag `lifetime`, datas de trial e `trial_access_granted`.
- `grant_trial_days { email, days }` — grava `trial_started_at = agora` e `trial_ends_at = agora + N dias`, marca `trial_access_granted = true`. Reinicia a contagem.
- `extend_trial_days { user_id, days }` — soma dias ao prazo atual se ainda no futuro; se expirado/inexistente, conta a partir de agora.
- `revoke_access { user_id }` — zera `beta_grandfathered` e `trial_ends_at`, mantendo `trial_access_granted = true` (histórico).

Validação server-side em todas: dias inteiro entre 1 e 365, e-mail/`user_id` obrigatórios, erros com códigos claros (`invalid_days`, `user_not_found`, `profile_not_found`).

## 2. Tela `AdminAccess.tsx`
Reescrita seguindo o design atual do admin (Card, Button, Input, toasts sonner, `useDocumentMeta`).

**Bloco "Conceder acesso"**
- Segmented com duas abas: Vitalício / Trial.
- Campo de e-mail; no modo Trial, campo adicional de dias (padrão 7) com validação inline "Informe um número entre 1 e 365".
- Texto de apoio no modo Trial explicando que a contagem reinicia a partir de hoje.

**Lista "Acessos concedidos"**
- Contadores no cabeçalho: total, vitalícios, trials ativos.
- Cada item: ícone (coroa para vitalício, timer para trial), e-mail, nome e status — "Vitalício", "Trial · N dias restantes", "Trial expirado" ou "Sem acesso ativo".
- Ações por item: editar (abre painel inline) e remover (com confirmação).

**Painel de edição inline**
- Campo de dias + "Adicionar dias de trial".
- Botão de conversão: "Tornar vitalício" ou "Converter em trial (7 dias)".
- Nota contextual explicando o efeito (vitalício vence o trial; soma vs. recontagem).

Layout mobile-first: campos empilhados no celular, ações com área de toque confortável, nada cortado.

## Observação técnica
O TSX colado na sprint chegou com o markup JSX removido pela formatação da mensagem; a tela será implementada com exatamente a mesma lógica, estados, textos e ordem de elementos descritos, reconstruindo o markup no padrão visual do admin.

## Comportamentos definidos
1. Conceder trial reinicia a contagem; para somar, usar a edição.
2. Somar dias parte do prazo atual quando ativo, ou de hoje quando expirado.
3. Vitalício prevalece sobre trial.
4. Remover zera vitalício e trial, mas mantém o histórico de trial já usado.
5. Assinaturas Stripe nunca são tocadas.
6. Limite de 1 a 365 dias validado no front e no backend.
