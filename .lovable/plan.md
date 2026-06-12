## 1. Bug do botão Novo Ganho/Novo Gasto

### Causa raiz
O `EntryDrawer` aplica o `preset.tab` no `useEffect` de abertura, mas logo em seguida carrega o rascunho da sessão (`useDraftPersistence`) e sobrescreve `setTab(saved.tab ?? …)`. Resultado: o app sempre reabre na última aba salva, ignorando o botão que o usuário acabou de tocar.

### Correção
No bloco de restauração do rascunho em `src/components/EntryDrawer.tsx`, **respeitar o `preset.tab` quando ele vier definido** (e o mesmo para `preset.category`):

```ts
setTab(preset?.tab ?? saved.tab ?? "earning");
setCategory(preset?.category ?? saved.category ?? "combustivel");
```

Mudança de 2 linhas, nenhum efeito colateral nos demais campos do rascunho (km, valor, observações continuam sendo restaurados normalmente).

---

## 2. Header cobrindo o relógio do iPhone

### Causa raiz
`apple-mobile-web-app-status-bar-style = black-translucent` + `viewport-fit=cover` fazem o conteúdo ocupar a área da Dynamic Island. O `<main>` do `AppLayout` não aplica `env(safe-area-inset-top)`.

### Correção
Em `src/components/AppLayout.tsx`, adicionar no `<main>`:

```tsx
<main
  className={…}
  style={{ paddingTop: "env(safe-area-inset-top)" }}
>
```

Resolve Tela de Início, Histórico, Relatórios e Ajustes de uma vez. Páginas fora do `AppLayout` (Auth, Landing, Checkout, Paywall, Onboarding) já tratam safe-area.

---

## 3. Modal in-app de fim de trial (D-2 / D-1 / D-0) com cupom 25%

### Comportamento
Quando o usuário abrir o app e estiver no trial interno (`internalTrialActive` ou `internalTrialExpired`) com **0, 1 ou 2 dias** restantes, exibir um **modal premium** (mesmo visual do paywall, mais enxuto) com:

- Título dinâmico:
  - D-2: "Faltam 2 dias do seu acesso gratuito"
  - D-1: "Seu acesso termina amanhã"
  - D-0 ativo: "Seu acesso termina hoje"
  - D-0 expirado: "Seu acesso gratuito acabou"
- Resumo curto: "Continue acompanhando seus ganhos, gastos e lucro com o Volant Premium."
- Destaque do cupom **PRIMEIROS25 — 25% off** (quando ativo)
- CTA principal: "Assinar com desconto" → abre o paywall (`openPaywall()`) com o cupom já visível
- CTA secundário: "Agora não" — fecha

### Frequência (não-invasivo)
- Aparece no máximo **1× por dia por usuário** (localStorage: `volant_trial_modal_last_shown_<userId>`).
- Não aparece se o usuário já tem premium pago.
- Não aparece em rotas sensíveis (`/checkout/*`, `/auth`).
- Aparece com 1,5s de atraso após carregar a Home, para não competir com outros prompts (install PWA).

### Onde monta
Componente novo `src/components/TrialEndingModal.tsx`, montado no `AppLayout` (uma única instância para o app inteiro). Lê `useSubscription` + `useAuth` para decidir.

### Controle do cupom (resposta à sua pergunta)
Hoje o cupom `primeiros25` está **hard-coded** em `supabase/functions/check-trial-emails/index.ts`. Para você não precisar voltar aqui no futuro, vou centralizar em um único arquivo de configuração:

`src/config/promo.ts` (frontend) e `supabase/functions/_shared/promo.ts` (backend):

```ts
export const TRIAL_PROMO = {
  enabled: true,           // ← desligue aqui para parar e-mail e modal
  couponCode: "PRIMEIROS25",
  discountLabel: "25% off",
  endsAt: null,            // opcional: ISO date para auto-expirar
};
```

- **Modal in-app**: quando `enabled=false` ou `endsAt` passou → modal continua aparecendo (D-2/-1/-0) mas **sem** a faixa do cupom (texto vira "Assinar agora").
- **E-mails de trial**: o `check-trial-emails` lê a mesma flag — quando `enabled=false`, os templates `trial-ending-soon` e `trial-ended` são enviados sem mencionar cupom.
- **Resultado**: para parar a promoção no futuro, você muda **uma linha** (`enabled: true → false`) e me pede para publicar — nada mais.

### Disparo retroativo "essa noite"
Para os usuários que **já estão** em D-2/D-1/D-0 hoje à noite: o modal aparece automaticamente na próxima vez que abrirem o app (não precisa job manual). Não vou criar nenhum job de push nem reenviar e-mails — só o modal in-app cobre esse caso.

---

## 4. Resumo de mudanças

| Arquivo | Mudança |
|---|---|
| `src/components/EntryDrawer.tsx` | Respeitar `preset.tab`/`preset.category` ao restaurar rascunho |
| `src/components/AppLayout.tsx` | `paddingTop: env(safe-area-inset-top)` no `<main>` + montar `<TrialEndingModal />` |
| `src/components/TrialEndingModal.tsx` (novo) | Modal premium D-2/D-1/D-0 com CTA e cupom |
| `src/config/promo.ts` (novo) | Flag única `enabled` + `couponCode` para frontend |
| `supabase/functions/_shared/promo.ts` (novo) | Mesma config para edge functions |
| `supabase/functions/check-trial-emails/index.ts` | Ler config compartilhada em vez de constante local |
| `supabase/functions/_shared/transactional-email-templates/trial-ending-soon.tsx` | Renderizar cupom condicionalmente |
| `supabase/functions/_shared/transactional-email-templates/trial-ended.tsx` | Idem |

Não mexe em: schema, autenticação, cálculos, planejamento, outras telas, navegação ou cron.

### Critério de aceite
- iPhone PWA: header "Olá, Gabriela" não toca mais o relógio.
- Abrir Novo Ganho → fechar → abrir Novo Gasto → drawer abre em "Gasto" (e vice-versa).
- Conta no trial D-2/D-1/D-0 sem premium pago: ao abrir o app, modal aparece com cupom **PRIMEIROS25** e botão "Assinar com desconto"; aparece no máximo 1×/dia; não aparece para premium pago.
- Mudar `TRIAL_PROMO.enabled = false` esconde o cupom no modal e nos e-mails sem outras mudanças.