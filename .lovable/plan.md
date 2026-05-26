# Sprint — Central de Notificações 1.0

## 0. Hotfix — trial de 7 dias para conta de teste em sandbox

Liberar manualmente para `lucasti.ludorecriare@gmail.com` no banco sandbox:

```sql
UPDATE public.profiles
SET trial_started_at = now(),
    trial_ends_at = now() + interval '7 days',
    trial_access_granted = true
WHERE id = (SELECT id FROM auth.users WHERE email = 'lucasti.ludorecriare@gmail.com');
```

Sem mudança de código. Lógica `env === "live"` em `useSubscription.ts` permanece.

---

## 1. Reorganização lista → detalhe

`NotificationsSheet` vira máquina de estado interna de 2 níveis no mesmo `Drawer`:

- **view = "list"** → header "Notificações / Acompanhe avisos importantes do Volant" + lista de cards resumidos (categoria, ícone, título, summary, dot de não lida, chevron).
- **view = "detail"** → header com `ChevronLeft` voltar + título + corpo completo (mensagem, tópicos, CTA).

Transição fade/slide curto. Fechar Drawer reseta para "list". Sem rota nova.

## 2. Estado lida/não lida

- Remover o `useEffect` que marca tudo como lido ao abrir o sheet (linha 35 de `NotificationsSheet.tsx`).
- Marcar individualmente como lida **somente** ao abrir o detalhe.
- Adicionar em `src/lib/notifications.ts`: `markAsRead(userId, id)` que atualiza `readAt` do item e dispara `NOTIFICATIONS_EVENT`.
- `useNotifications` expõe `markAsRead`.

## 3. Badge no sino (Dashboard)

`useNotifications` já retorna `unread`. Adicionar dot pequeno verde (`bg-success`, sem contador) absoluto sobre o ícone do sino quando `unread > 0`. Sem alterar layout do header.

## 4. Anti-duplicidade

Manter persistência em `localStorage` por usuário (sem nova tabela). Cada notificação tem `id` único (dedupe key). Criar helper genérico `ensureNotification(userId, template, condition)`:

1. Lê lista do usuário.
2. Se já existe item com mesmo `id`, ignora.
3. Se `condition()` é `true`, insere como não lida.

Substitui `ensureWelcomeNotification` por essa versão genérica.

## 5. Notificações desta sprint

| ID | Categoria | Ícone | Condição |
|---|---|---|---|
| `general_welcome_group_notification` | Sistema | Símbolo V do Volant | conta ≥ 30 min (já existe, adaptar) |
| `premium_welcome_notification` | Premium | `Crown` | `isPaidPremium === true` (assinatura paga OU `beta_grandfathered`). **Não** dispara em `internalTrialActive`. |
| `planning_incomplete_notification` | Planejamento | ícone real de Planejamento Inteligente | conta ≥ 30 min E (`user_settings.monthly_goal = 0` OU `km_planned_month` nulo/0 OU `working_days_per_month` nulo) |
| `vehicle_costs_missing_notification` | Veículo | ícone real de Custos do veículo | conta ≥ 30 min E nenhum `cars` do usuário tem custos preenchidos (todos `rental_weekly`, `financing_monthly`, `insurance_monthly`, `ipva_yearly`, `oil_change_cost`, `tires_cost`, `other_monthly_costs` nulos/zero) |

Cada uma criada uma única vez por usuário. Se marcada como lida e depois a condição for resolvida, não recria.

## 6. Fora do escopo (sprints futuras)

Push, service worker, e-mail, WhatsApp, recorrentes, IA, cron backend, notificações diárias/semanais, alertas de desempenho, permissão do navegador. Categorias extras (KM Inteligente, Metas, Relatórios, Suporte, Novidades) ficam preparadas no tipo `category` mas sem notificação ainda.

## 7. Regra de ícones

- `iconType: "volant"` → componente local `<VolantSymbol />` (reusar `VolantLogo` em modo símbolo, sem fetch remoto — render imediato).
- `iconType: "premium"` → `Crown` (lucide).
- `iconType: "planning" | "vehicle-costs"` → mesmo ícone lucide já usado na tela correspondente (vou verificar em `PlanejamentoInteligente.tsx` e `CustosVeiculo.tsx` antes de codar e reusar o import idêntico).
- Sem emojis, `Sparkles`, ou imagens remotas como ícone principal.

## 8. Arquivos alterados

**Editados:**
- `src/lib/notifications.ts` — novo shape (`category`, `summary`, `content`, `iconType`, `dedupeKey`), `ensureNotification`, `markAsRead`, templates das 4 notificações.
- `src/hooks/useNotifications.ts` — receber contexto extra (settings, cars, isPaidPremium) e disparar os `ensure*`; expor `markAsRead`.
- `src/components/NotificationsSheet.tsx` — refatorar para máquina lista/detalhe; remover auto-mark; novo card de lista; tela de detalhe com botão voltar.
- `src/pages/Dashboard.tsx` — passar `userSettings`, `cars`, `isPaidPremium` para o hook; adicionar badge no sino se ainda não tiver.

**Sem** novas tabelas, migrations ou edge functions.

## 9. Não-regressão

Não tocar: `create-checkout`, `payments-webhook`, `useSubscription` (só leitura de `isPaidPremium`), tabelas `subscriptions`/`profiles`/`user_settings`/`cars`, `AuthContext`, `AccessContext`, `RequirePremium`, `OnboardingFlow`, `Landing`, `Paywall`, `SubscriptionSheet`, PWA, Home (exceto badge), Relatórios, Histórico, lógica KM/Metas, acesso 7 dias.

## Detalhe técnico — novo shape

```ts
export type NotificationCategory = "sistema" | "premium" | "planejamento" | "veiculo";
export type NotificationIcon = "volant" | "premium" | "planning" | "vehicle-costs";

export interface AppNotification {
  id: string;
  category: NotificationCategory;
  iconType: NotificationIcon;
  title: string;
  summary: string;       // lista
  content: string;       // detalhe
  topics?: { title: string; desc: string }[];
  cta?: { label: string; url?: string; route?: string };
  createdAt: number;
  readAt: number | null;
}
```

Item 0 já aprovado (opção a). Aguardando aprovação geral para executar.
