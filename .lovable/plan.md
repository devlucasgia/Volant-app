## Sprint — Hardening do Signup (revisado)

Escopo cirúrgico: uma migration de limpeza + 2 arquivos novos + edição pontual em `src/pages/Auth.tsx`. Login, reset, Google OAuth e onboarding permanecem intactos.

---

### Etapa 1 — Remover as 15 contas artificiais

Migration que apaga por lista fixa de UUIDs (nunca por padrão de e-mail, para zerar risco de atingir usuário legítimo). Ordem segura, dentro de transação:

`feedback_reports` → `maintenance_alerts_sent` → `trial_email_log` → `email_send_log` → `email_unsubscribe_tokens` → `signup_notifications` → `entries` → `categories` → `cars` → `user_settings` → `user_roles` → `subscriptions` → `profiles` → `auth.users`.

UUIDs (confirmados na base, todas `@mailinator.com`, sem admin/assinatura/grandfather):

```
115178fe-fd49-40ba-a381-7ed3faf94500  ae3a9cf2-7413-4e99-ae96-3ec2b390ccaf
61b44229-9921-466c-b083-f5a923af75c0  dd9cdac8-00ed-43e8-930b-e7ad8e0904fc
f4f46077-cb14-4f6f-b965-b912b64ac49f  2aeabb55-40fc-4938-8e51-3c060b869dc3
55ea0234-6448-4a9e-860f-647b4ddac3ea  97ff459b-bc49-438d-9eee-c682dc8a6626
c2fa7a96-1a30-4531-865d-a706816e9b53  3b9ff63e-8f4b-48a1-a278-43aee7290bbe
604b4212-d99b-40e2-a256-35ad06bbbd80  d61d5f40-67c9-45a9-87c7-f1a7263e1e6c
54590a3d-09f6-40e2-ab77-26f551052f54  29c7729f-e2c6-4962-b6ba-cba8bec7e8dc
39121a40-042c-4ea0-911c-48d8bcb387f1
```

Validação: `SELECT count(*) FROM auth.users WHERE email LIKE '%@mailinator.com'` → deve retornar 0.

---

### Etapa 2 — Bloqueio de e-mails descartáveis (centralizado + normalizado)

**Novo arquivo:** `src/lib/disposableEmailDomains.ts` — única fonte de verdade.

```ts
// Lista centralizada de domínios de e-mail descartável.
// Para expandir no futuro, basta adicionar o domínio abaixo (lowercase, sem @).
// Nenhuma outra parte do app precisa ser alterada.
export const DISPOSABLE_EMAIL_DOMAINS = new Set<string>([
  "mailinator.com",
  "guerrillamail.com",
  "guerrillamailblock.com",
  "sharklasers.com",
  "spam4.me",
  "temp-mail.org",
  "tempmail.org",
  "10minutemail.com",
  "yopmail.com",
  "getnada.com",
  "fakeinbox.com",
  "moakt.com",
]);

/**
 * Verifica se o e-mail pertence a um domínio descartável.
 * Normaliza: remove espaços, converte para lowercase e extrai o domínio
 * — comparação totalmente case-insensitive.
 */
export function isDisposableEmail(email: string): boolean {
  const normalized = (email ?? "").trim().toLowerCase();
  const at = normalized.lastIndexOf("@");
  if (at < 0 || at === normalized.length - 1) return false;
  const domain = normalized.slice(at + 1);
  return DISPOSABLE_EMAIL_DOMAINS.has(domain);
}
```

Cobre `Mailinator.com`, `MAILINATOR.COM`, `MailInator.Com`, `  mailinator.com  ` — todos bloqueados igualmente.

---

### Etapa 3 — Rate limit local, contabilizado apenas em tentativas reais

**Novo arquivo:** `src/lib/signupRateLimit.ts` — 5 tentativas / 10 min, apenas no signup.

```ts
const KEY = "volant:signup-attempts";
const WINDOW_MS = 10 * 60 * 1000;
const MAX_ATTEMPTS = 5;

function read(): number[] {
  try {
    const raw = localStorage.getItem(KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr.filter((n) => typeof n === "number") : [];
  } catch { return []; }
}
function write(list: number[]) {
  try { localStorage.setItem(KEY, JSON.stringify(list)); } catch { /* ignore */ }
}

export function isSignupRateLimited(): boolean {
  const now = Date.now();
  const recent = read().filter((t) => now - t < WINDOW_MS);
  write(recent);
  return recent.length >= MAX_ATTEMPTS;
}

/** Chame SOMENTE quando o signup for de fato enviado ao backend. */
export function recordSignupAttempt(): void {
  const now = Date.now();
  const recent = read().filter((t) => now - t < WINDOW_MS);
  recent.push(now);
  write(recent);
}
```

---

### Edição em `src/pages/Auth.tsx`

Ordem exigida: **validações locais → rate limit → signUp()**. Erros locais (e-mail malformado, senha curta, campos vazios, domínio descartável) **não** consomem tentativa.

Alterações mínimas, apenas no branch `mode === "signup"` dentro de `submit`:

```ts
if (mode === "signup") {
  // 1) Validações locais — não consomem tentativa
  const emailTrim = email.trim();
  const passOk = password.length >= 6;
  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailTrim);

  if (!emailOk || !passOk) {
    toast.error("Verifique os dados e tente novamente.");
    setBusy(false);
    return;
  }

  if (isDisposableEmail(emailTrim)) {
    toast.error("Este tipo de e-mail não é aceito. Utilize um endereço de e-mail permanente.");
    setBusy(false);
    return;
  }

  // 2) Rate limit — verifica antes de tentar enviar
  if (isSignupRateLimited()) {
    toast.error("Muitas tentativas em pouco tempo. Aguarde alguns minutos e tente novamente.");
    setBusy(false);
    return;
  }

  // 3) Só agora contabiliza e envia
  recordSignupAttempt();

  const { error } = await supabase.auth.signUp({
    email: emailTrim,
    password,
    options: {
      emailRedirectTo: `${window.location.origin}/`,
      data: { display_name: name || emailTrim.split("@")[0] },
    },
  });
  if (error) throw error;
  toast.success("Conta criada!");
}
```

O branch `signIn`, `sendReset` e `google` **não são tocados**. Nenhum campo novo, nenhum passo novo, nenhuma mudança visual.

---

### Mensagens (mantidas genéricas)

- Validação local: `"Verifique os dados e tente novamente."`
- Domínio descartável: `"Este tipo de e-mail não é aceito. Utilize um endereço de e-mail permanente."`
- Rate limit: `"Muitas tentativas em pouco tempo. Aguarde alguns minutos e tente novamente."`

Nenhuma menciona blacklist, spam, segurança, rate limit ou domínio específico.

---

### O que **não** muda

`AuthContext`, onboarding, Stripe, webhooks, `subscriptions`, RLS, edge functions, `supabase/config.toml`, HIBP, CAPTCHA, layout de `/auth`, textos existentes. Sem novas telas.

---

### Ordem de execução (após aprovação)

1. Migration da Etapa 1 (aguarda aprovação do diff).
2. Criar `src/lib/disposableEmailDomains.ts` e `src/lib/signupRateLimit.ts` em paralelo.
3. Editar `src/pages/Auth.tsx` — apenas o branch `signup` de `submit`.
4. Verificação: `SELECT count(*)` das 15 contas = 0; teste manual de signup válido (deve funcionar), signup com `TESTE@Mailinator.COM` (deve bloquear sem consumir tentativa), login/reset/Google inalterados.
