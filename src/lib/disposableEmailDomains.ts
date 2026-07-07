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
