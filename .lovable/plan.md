# Unificar alertas de manutenção (Home + Central + E-mail)

## Padrão único de tom

| Estado | Cor | Significado |
|---|---|---|
| Próxima / se aproximando | **Laranja** (token `warning` / amber) | Atenção, programar |
| Atrasada | **Vermelho** (token `destructive`) | Urgente |

Hoje a Home já segue esse padrão. A Central pinta "se aproximando" em ciano (cor da categoria Veículo) e o e-mail usa laranja fixo para os dois estados. Vou alinhar Central e E-mail à Home.

## 1. Central de Notificações

**`src/lib/notifications.ts`**
- Estender `NotificationTone` para `"default" | "warning" | "alert"`.
- Em `ensureMaintenanceNotifications`: `tone = overdue ? "alert" : "warning"` (hoje vai pra `"default"` quando próximo).

**`src/components/NotificationsSheet.tsx`** (`NotificationIconBadge` + card)
- Novo ramo `tone === "warning"`:
  - badge do ícone: `bg-warning/15 text-warning` + glow âmbar suave
  - rótulo da categoria (`VEÍCULO`): `text-warning`
  - borda do card: `border-warning/40 bg-warning/[0.04]`
  - bolinha de não-lido: `bg-warning`
- Mantém `alert` (vermelho) e `default` (ciano para Veículo, etc.) como hoje.

Resultado: na Central, "Troca de óleo se aproximando" fica laranja igual à Home, "atrasada" continua vermelha.

## 2. E-mail (`maintenance-alert.tsx`)

- Aceitar prop `status: "approaching" | "overdue"` (default `approaching`) vinda do `check-maintenance-alerts`.
- Paleta dinâmica:
  - **approaching** → laranja (mantém atual: `#ea580c`, fundo `#fff7ed`, borda `#fed7aa`, texto `#7c2d12`)
  - **overdue** → vermelho (`#dc2626`, fundo `#fef2f2`, borda `#fecaca`, texto `#7f1d1d`)
- Heading/preview/copy refletindo o estado:
  - approaching: "Troca de óleo se aproximando 🔧" — "faltam X km…"
  - overdue: "Troca de óleo atrasada ⚠️" — "você já passou em X km do intervalo…"
- CTA continua "Ver minhas manutenções".

**`supabase/functions/check-maintenance-alerts/index.ts`**
- Já calcula `isOverdue`; passar `status` no `templateData` e ajustar texto enviado (km restantes vs. km ultrapassados). Manter idempotency key separada por status (`maint-<user>-<type>-<milestone>-<status>`) para o vermelho disparar mesmo após o laranja.

## 3. Resposta ao usuário — e-mails ativos hoje

Após o plano ser aprovado, listo no chat os e-mails ativos em produção e seus gatilhos:

- **welcome** — primeiro cadastro de usuário (em `notify-new-user`)
- **new-user-signup** — aviso interno ao time quando um novo usuário se cadastra
- **maintenance-alert** — cron diário `check-maintenance-alerts` + trigger em tempo real ao registrar KM/manutenção
- **weekly-summary** — cron semanal `send-weekly-summary`
- **subscription-receipt** — webhook Stripe: `invoice.payment_succeeded`
- **payment-failed** — webhook Stripe: `invoice.payment_failed` (cliente)
- **payment-failed-internal** — webhook Stripe: `invoice.payment_failed` (time interno)
- **new-subscription** — webhook Stripe: nova assinatura (interno)
- **subscription-canceled** — webhook Stripe: cancelamento (interno)
- **send-feedback-email** — quando o usuário envia feedback/bug pelo app

## Arquivos editados

- `src/lib/notifications.ts`
- `src/components/NotificationsSheet.tsx`
- `supabase/functions/_shared/transactional-email-templates/maintenance-alert.tsx`
- `supabase/functions/check-maintenance-alerts/index.ts`

Sem mudanças de schema. Deploy: `check-maintenance-alerts` e `send-transactional-email` (template novo).
