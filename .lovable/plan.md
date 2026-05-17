## 1. Email notification on new user signup

Add an automatic email to `suporte.volant@gmail.com` every time a new account is created (Google OAuth or email/password).

### Approach
- Create a new edge function `notify-new-user` that sends the email via Resend (reusing `RESEND_API_KEY` already configured).
- Trigger it through a Postgres trigger on `auth.users` insert → calls a SECURITY DEFINER function that uses `pg_net` to POST to the edge function. This guarantees the email fires for ALL signup methods (Google, email/password, future providers) without touching client code.
- The edge function will be public (no JWT) but protected by:
  - A shared secret header (`NEW_USER_HOOK_SECRET`) validated server-side.
  - In-memory + DB-based rate limit (max 30 calls/min globally) to prevent abuse if the URL leaks.
- Email content: user name (from `raw_user_meta_data.display_name` / `full_name`), email, signup timestamp, signup method (derived from `raw_app_meta_data.provider` → "Google" or "Email/Senha").
- Logging: each blocked/failed call is logged via `console.warn` for observability.

### Files
- New: `supabase/functions/notify-new-user/index.ts`
- New migration: extension `pg_net`, function `public.notify_new_user_signup()`, trigger `on_auth_user_created_notify` on `auth.users`, and a `new_user_notifications` table (optional, for dedup + log).
- New secret: `NEW_USER_HOOK_SECRET` (random string).

No client-side changes. No UX change.

---

## 2. Subscription screen — visual structure only

Add a **Subscription** section inside Settings → Account. No Stripe, no gating, no checkout.

### Location
- Add a new `SettingsCard` inside Settings.tsx under the "Conta" group, between Profile and Password, titled "Assinatura" with a `Crown` (or `Sparkles`) icon.
- Expanding the card reveals a compact summary + a "Ver planos" button that opens a dedicated full-screen sheet/dialog `SubscriptionSheet` (new component) — keeps Settings clean and gives the plans the visual breathing room they need.

### Subscription sheet contents
```text
┌──────────────────────────────────┐
│  Plano atual: Beta gratuito      │  ← status badge (green)
│                                  │
│  Aproveite 7 dias grátis. Depois │
│  escolha entre acesso mensal     │
│  ou anual.                       │
│                                  │
│  ┌────────────┐  ┌────────────┐  │
│  │  Mensal    │  │ Anual ★    │  │  ← yearly highlighted
│  │  R$ 19,90  │  │ R$ 89,90   │  │     with green border +
│  │  /mês      │  │ /ano       │  │     "Economize 62%" badge
│  └────────────┘  └────────────┘  │
│                                  │
│  [ Começar teste grátis ]        │  ← primary green button (disabled-look + tooltip)
│  [ Gerenciar assinatura ]        │  ← only when user has an active plan (hidden for now)
│                                  │
│  ⓘ Pagamentos serão ativados     │
│    em uma próxima atualização.   │
└──────────────────────────────────┘
```

### Visual rules
- Dark UI consistent with rest of app, rounded `rounded-2xl` cards, semantic tokens only (`bg-card`, `text-foreground`, `text-primary`, etc.).
- Yearly card: subtle green border + "Economize 62%" badge in top-right corner.
- "Começar teste grátis" button uses `gradient-success`; on click shows a toast: "Em breve! Pagamentos serão ativados em uma próxima atualização."
- All copy in Brazilian Portuguese.

### Files
- New: `src/components/account/SubscriptionSheet.tsx` (Sheet component with the plans UI).
- Edit: `src/pages/Settings.tsx` — add the new accordion entry inside the "Conta" group.

No routing changes. No new dependencies. No backend.

---

## Out of scope (explicitly)
- Stripe integration / checkout / webhooks.
- Feature gating, trial countdown logic, or any billing state in the database.
- Plan persistence per user.