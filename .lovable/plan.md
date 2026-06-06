# Plano: Ajustes de Ajustes + Go-live + Mostrar senha + Resposta sobre contador

## 1. Ajustes na tela de Ajustes (`src/pages/Settings.tsx`)

**1.1 Mover "Sair da conta" para o card Perfil**
- Remover o botão `<Button onClick={signOut}>Sair da conta</Button>` do card `account` (linhas 870-872).
- Adicionar o mesmo botão dentro do card `profile`, logo abaixo do bloco "Refazer tour de boas-vindas" (após linha 824), antes do bloco de reset onboarding (teste).

**1.2 Renomear card "Conta e dados" → "Dados"**
- Linha 869: `title="Conta e dados"` → `title="Dados"`.
- Card passa a conter apenas a "Zona de perigo" (apagar dados).

Sem mudanças em lógica de auth ou estrutura do `SettingsCard`.

---

## 2. Mostrar/ocultar senha no `/auth`

No formulário de login/cadastro (`src/pages/Auth.tsx`), adicionar ícone de olho ao lado do campo senha:
- Estado local `showPassword` (boolean).
- Botão/ícone dentro do `Input` (sufixo absoluto ou usando um wrapper).
- Ícone padrão de mercado: `Eye` (mostrar) / `EyeOff` (ocultar) do Lucide.
- `type={showPassword ? "text" : "password"}`.
- Label acessível: "Mostrar senha" / "Ocultar senha" (aria-label).
- Aplicar nos dois campos senha quando houver confirmação de senha (signup).
- Posição: dentro do campo, alinhado à direita, com `pr-10` no input para não cobrir o texto.

Arquivo: `src/pages/Auth.tsx`.

---

## 3. Sprint Go-live (itens 3, 6 e 8 da memory `mem://sprints/go-live`)

### Item 3 — Templates de e-mail user-facing
Criar 3 novos templates em `supabase/functions/_shared/transactional-email-templates/`:
- **`welcome.tsx`** — boas-vindas ao motorista após cadastro confirmado (dica: cadastrar carro e custos). Disparado no `notify-new-user` (ou trigger de signup confirmado) via `enqueue_email`.
- **`subscription-receipt.tsx`** — confirmação/recibo da assinatura. Disparado no `payments-webhook` em `customer.subscription.created` e `invoice.paid` (buscar email do user via `auth.users` por `user_id`).
- **`payment-failed.tsx`** — cobrança recusada. Disparado em `invoice.payment_failed`.

Registrar os 3 em `registry.ts`. Disparos sempre via `enqueue_email` na fila `transactional_emails` (nunca invoke direto, conforme regra core).

### Item 6 — Revisão final pré-publicação
- `public/sitemap.xml` — atualizar `lastmod` para data atual, conferir URLs (`/`, `/auth`, `/privacidade`, `/termos`).
- `public/robots.txt` — confirmar `Sitemap:` apontando para domínio correto.
- Rodar `seo_chat--trigger_scan` e fechar findings remanescentes.
- Validar manualmente paywall: ações premium chamam `requirePremium()` para não-`beta_grandfathered` (revisar `RequirePremium`, `Paywall`).
- Esconder badge "Edit with Lovable" via `publish_settings--set_badge_visibility` (se o plano permitir).

### Item 8 — Pós-lançamento (infra)
- **Resumo semanal por motorista**: cron `pg_cron` (2ª-feira 08:00 BRT) que enfileira 1 e-mail por usuário ativo na fila `transactional_emails`. Novo template `weekly-summary.tsx` com bruto/líquido/km/horas dos últimos 7 dias.
- **Alerta de manutenção**: trigger SQL em `cars` (ou job diário) que dispara e-mail quando km atual atinge intervalo configurado. Novo template `maintenance-alert.tsx`.
- **`/admin/metrics`**: página interna restrita a whitelist de `user_id` (constante no front + RLS no back). Painel com: total usuários, ativos 7/14/30d, novos cadastros, MRR, churn. Queries via edge function `admin-metrics` (verifica whitelist server-side).

---

## 4. Resposta sobre contador flutuante "sobre a tela do celular"

**Não é possível** em um PWA / web app rodando em Lovable. Tecnicamente:

- **Web/PWA não tem permissão de "overlay sobre outros apps"**. Esse recurso (tipo bolha do Messenger, contador do Strava) só existe em apps nativos Android (permissão `SYSTEM_ALERT_WINDOW`) e nem todos iOS permitem (iOS não tem overlays globais — só Live Activities/Dynamic Island, exclusivos de app nativo iOS 16+).
- Mesmo empacotando via **Capacitor** (APK), seria preciso escrever um plugin Android nativo (Java/Kotlin) com `WindowManager` + serviço foreground. iOS continuaria limitado a Live Activities, exigindo Swift + extensão de widget.
- O que **dá** para fazer hoje no web/PWA atual:
  1. **Timer continua contando em background** (já funciona — `TimerContext` salva timestamps em `localStorage`, ao reabrir o app recalcula o tempo decorrido). ✅ já implementado.
  2. **Notificação persistente do navegador** com tempo decorrido (atualizada a cada minuto via Service Worker). Limitada: o número não fica "ao vivo" segundo a segundo, e iOS Safari tem suporte parcial.
  3. **PWA instalável + ícone na home** + ao abrir, mostra contador em tempo real (FAB já existe quando dentro do app).

**Recomendação**: manter o comportamento atual (timer persistente em `localStorage`) e, se quiser dar mais presença, adicionar notificação periódica via Service Worker com "Jornada em andamento — 02:15". Overlay flutuante real só com APK nativo + plugin custom (fora do escopo Lovable).

---

## Arquivos afetados
- `src/pages/Settings.tsx` (item 1)
- `src/pages/Auth.tsx` (item 2)
- `supabase/functions/_shared/transactional-email-templates/*.tsx` + `registry.ts` (item 3, 8)
- `supabase/functions/payments-webhook/index.ts`, `notify-new-user/index.ts` (item 3)
- `public/sitemap.xml`, `public/robots.txt` (item 6)
- Nova migration com `pg_cron` + edge function `send-weekly-summary` (item 8)
- Nova edge function `admin-metrics` + `src/pages/AdminMetrics.tsx` + rota em `App.tsx` (item 8)

## Fora de escopo
- Implementar overlay flutuante nativo (impossível sem app nativo).
- Mexer em cálculos do planejamento ou home.
