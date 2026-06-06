---
name: Sprint Go-live
description: Status pós-implementação dos itens 1-8 do go-live, com itens já entregues e o que ainda falta
type: feature
---
# Sprint Go-live (status)

## ✅ Concluídos
- **Item 3** — Templates user-facing: `welcome`, `subscription-receipt`, `payment-failed` criados em `_shared/transactional-email-templates/`, registrados em `registry.ts` e disparados via `notify-new-user` (welcome) e `payments-webhook` (receipt em `invoice.paid` live, payment-failed em `invoice.payment_failed` live).
- **Item 6** — `sitemap.xml` com `lastmod` atualizado; `robots.txt` validado; badge "Edit with Lovable" oculto via `publish_settings--set_badge_visibility`; scan SEO disparado.
- **Item 8** — Resumo semanal (cron seg 11:00 UTC → `send-weekly-summary` → template `weekly-summary`); alerta de manutenção (cron diário 10:00 UTC → `check-maintenance-alerts` → template `maintenance-alert`, dedupe em `maintenance_alerts_sent`); `/admin/metrics` (edge `admin-metrics` + página) com whitelist via tabela `user_roles` + função `has_role`.

## Pendente
- Adicionar manualmente seu user_id em `public.user_roles` com `role='admin'` para acessar `/admin/metrics`.
- Validar paywall: confirmar `requirePremium()` cobre todas as ações premium (sweep não automático).
- Configurar evento `invoice.paid` no webhook Stripe (live) caso ainda não esteja inscrito.
