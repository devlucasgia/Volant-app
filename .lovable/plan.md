
## Antes do plano — como testar o que já foi feito (Sprint 1.2 PWA)

Sim, o preview do Lovable já é o app Volant real rodando — você está dentro do app autenticado (mesma base de código, mesmo backend Lovable Cloud). Não é necessário publicar para testar.

Passo a passo para testar a instalação PWA da sprint anterior:

1. **Abrir o preview em uma aba nova do navegador** (não dentro do iframe do editor). Use o ícone “abrir em nova janela” do preview ou cole a URL `https://id-preview--185df6ff-9e46-459a-a25d-323f7411f3f9.lovable.app` no Chrome/Edge desktop, ou abra a URL publicada `https://usevolant.lovable.app` no celular.
2. **Fazer login** com sua conta normalmente (`/auth`) e cair em `/app`.
3. **Aguardar 8 segundos** parado dentro do app. O card/bottom sheet deve aparecer:
   - Android Chrome / Edge desktop → card “Instale o Volant” com botão nativo.
   - iPhone Safari → tutorial animado com Compartilhar → Adicionar à Tela de Início.
   - iPhone Chrome → orientação curta para abrir no Safari.
4. **Testar “Depois”** → fechar deve sumir o card e não voltar por 7 dias (chave `volant.pwa.snoozeUntil` no localStorage).
5. **Testar “Instalar agora”** no Android/desktop → após instalar, abrir o app instalado: o card não aparece mais (display-mode: standalone).
6. **Resetar para testar de novo**: DevTools → Application → Local Storage → apagar chaves `volant.pwa.*`. No Chrome desktop, também é possível remover o app instalado em `chrome://apps`.
7. **Confirmar que NÃO aparece** em `/`, `/auth` e `/checkout/return`.

---

## Plano da nova sprint

### 1. Arquivos/componentes que serão alterados ou criados

Alterados:
- `src/pages/Dashboard.tsx` — adicionar controle segmentado Líquido/Bruto no card principal e disparar `updateSettings({ goalType })`.
- `src/components/NotificationsSheet.tsx` — passar a renderizar a lista real de notificações com a notificação de boas-vindas, marcar como lida ao abrir.
- `src/pages/Dashboard.tsx` — o sino existente (`unreadNotifs`) passará a refletir o estado real (não mais hardcoded 0).

Criados (mínimos):
- `src/lib/notifications.ts` — store leve da Central de Notificações em `localStorage` por usuário (chave `volant.notifications.v1.{userId}`), com helpers `ensureWelcomeNotification(user)`, `listNotifications(userId)`, `markRead(userId, id)`, `unreadCount(userId)`, e um event bus simples (`window.dispatchEvent("volant:notificationsChanged")`).
- `src/hooks/useNotifications.ts` — hook React fino sobre o store, com `items` e `unread`, ouvindo o evento acima.

Sem novas tabelas no Supabase, sem alteração de schema, sem service worker, sem push externo.

### 2. Alternância Líquido/Bruto na Home

- Importar `Segmented` (`src/components/Segmented.tsx`, já padrão do app) dentro do bloco `hero` em `Dashboard.tsx`.
- Inserir o controle no topo do card principal, na mesma linha do título “Lucro líquido / Bruto”, alinhado à direita. Opções: `Líquido | Bruto`. `value` derivado de `settings.goalType` (`liquido | bruto`).
- `onChange` chama `updateSettings({ goalType: next })`. Nenhum estado local extra — a Home já reage automaticamente (`heroMetric`, card de meta, KM Inteligente, glows, gradientes já dependem de `settings.goalType`).
- Microtransição: aproveitar o `transition-all duration-500/700` já presente no card; manter o `key={heroMetric}` que já reanima o valor principal (count-up curto via animação atual). Sem novas libs.
- Textos:
  - Líquido: título `Lucro líquido`, apoio `Depois dos gastos`.
  - Bruto: título `Ganho bruto`, apoio `Antes dos gastos`.
- Card de Meta e R$/KM Inteligente continuam usando `settings.goalType` (já implementado), portanto trocam de identidade verde/azul automaticamente. Clique no card de meta continua indo para `/ajustes/planejamento/metas`.
- Responsividade: o `Segmented` em `size="sm"` cabe em 360–430px ao lado do título; em telas muito estreitas o controle quebra para uma segunda linha dentro do card sem comprimir o valor.
- Acessibilidade: `role="tablist"` já vem do componente; foco visível e contraste mantidos.
- `prefers-reduced-motion`: respeitar reduzindo as transições visuais (sem flash).

### 3. Sincronização com Metas Inteligentes

- Não é criada nova fonte de verdade. A Home grava em `settings.goalType` via `updateSettings`, exatamente o mesmo campo lido por `MetasInteligentes.tsx`. O `DataContext` já propaga, então:
  - Trocar na Home reflete em Metas Inteligentes ao abrir a tela.
  - Trocar em Metas Inteligentes reflete na Home na volta.
- Nenhuma migração ou nova coluna. Persistência continua em `user_settings.goal_type`.

### 4. Notificação geral de boas-vindas

Conteúdo (em `src/lib/notifications.ts` como constante):
- `id`: `general_welcome_group_notification` (também usado como dedupe key).
- Título: **Bem-vindo ao Volant**.
- Corpo: texto definido na sprint + 4 tópicos curtos (Metas Inteligentes, KM Inteligente, Relatórios e Histórico, Central de Veículos).
- CTA: botão “Entrar no grupo oficial” → abre `https://chat.whatsapp.com/LkXphgSVRg53rOVQmBEcP7?s=cl&p=a&mlu=3` em `_blank` com `rel="noopener noreferrer"`. URL nunca aparece no texto.

Regra de criação (em `ensureWelcomeNotification(user)` chamada uma vez por render do `Dashboard` montar):
- Lê `user.created_at` (já vem do Supabase auth).
- Se `Date.now() - createdAt >= 30 min` e ainda não existe registro com o id no store do usuário → cria como `unread`, `createdAt: now`.
- Se já existe → não faz nada.
- Para usuários antigos (criados há mais de 30 min), entra no primeiro acesso após a sprint — atende automaticamente o critério “usuários existentes recebem na próxima abertura”.

Render em `NotificationsSheet.tsx`:
- Lista as notificações do hook. Item da boas-vindas: card escuro, borda sutil, glow verde discreto, ícone (ex.: `Sparkles`/`PartyPopper`), título, corpo, lista de tópicos e botão CTA.
- Ao abrir o drawer, todas viram `read` (marca timestamp). Indicador “não lida” como bolinha verde antes da leitura.
- Quando vazio, mantém o estado vazio atual.

Sino no header:
- `unreadNotifs` em `Dashboard.tsx` passa a vir de `useNotifications().unread`. Badge discreto já existente é exibido quando `unread > 0`.

### 5. Como será evitada a duplicidade

- Chave de storage por usuário: `volant.notifications.v1.{userId}` — isola contas que usam o mesmo navegador.
- Dedupe pelo `id` único `general_welcome_group_notification` antes de inserir.
- A função `ensureWelcomeNotification` é idempotente: chamadas repetidas (re-render, navegação) não criam cópias.
- Marcar como lida não remove o registro, então a regra de “criar apenas uma vez” permanece válida.

Limitação consciente (declarada): o store é por dispositivo/navegador (localStorage). Atende aos critérios da sprint sem criar tabela nova; se mais à frente quiser sincronizar entre dispositivos, evoluímos para uma tabela `notifications` em outra sprint.

### 6. Garantias de escopo

Não serão tocados:
- Stripe, `supabase/functions/*` (checkout, webhooks, portal), `CheckoutReturn.tsx`.
- Tabelas `subscriptions`, `profiles`, `user_settings` (schema) — apenas leitura/escrita já existentes de `goal_type`.
- Autenticação (`AuthContext`, `RequireAuth`, `RequirePremium`).
- Onboarding (`OnboardingFlow`, `CarOnboardingDialog`, `MonthlyGoalOnboardingDialog`).
- Lógica Premium e `useSubscription`.
- Landing pública `/` (`src/pages/Landing.tsx`) e rota `/auth`.
- Fluxo PWA (`InstallPromptManager`, `usePwaInstall`, `pwaInstall.ts`, `public/manifest.json`, service worker).
- Relatórios, Histórico e demais páginas fora da Home.
- Nenhuma migração SQL será criada.

### Detalhes técnicos resumidos

```text
Dashboard hero card
 ├─ título: Lucro líquido | Ganho bruto  (depende de settings.goalType)
 ├─ Segmented [Líquido | Bruto] -> updateSettings({ goalType })
 ├─ valor: s.net | s.gross  (já existe)
 └─ tema verde/azul: já reativo a settings.goalType

NotificationsSheet
 ├─ useNotifications() -> { items, unread, markAllRead }
 ├─ render lista (welcome card) + estado vazio
 └─ CTA -> abre WhatsApp em nova aba

src/lib/notifications.ts (novo, ~80 linhas)
 ├─ STORAGE_KEY = `volant.notifications.v1.${userId}`
 ├─ WELCOME = { id: 'general_welcome_group_notification', ... }
 ├─ ensureWelcomeNotification(user)  // regra dos 30min
 ├─ listNotifications / markRead / unreadCount
 └─ dispatch 'volant:notificationsChanged'
```

### Critérios de aceite que serão validados

- Home tem segmented Líquido/Bruto integrado ao card principal; troca atualiza valor, meta e KM Inteligente; identidade verde/azul aplicada apenas aos elementos previstos; nav, FAB, logo, gastos (vermelho) e Premium (dourado) permanecem estáveis.
- Trocar na Home reflete em Metas Inteligentes e vice-versa (mesma fonte: `settings.goalType`).
- Notificação “Bem-vindo ao Volant” aparece na Central, nasce não lida, sino mostra badge, CTA abre o grupo, link não aparece cru, não duplica.
- Usuários novos: criada 30 min após `user.created_at`. Usuários existentes: criada na próxima abertura.
- Stripe, checkout, Supabase crítico, onboarding, PWA e landing pública permanecem intactos.

Aguardo seu OK para executar.
