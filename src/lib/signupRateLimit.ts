// Rate limit local para o fluxo de criação de conta.
// 5 tentativas por 10 minutos, por dispositivo/navegador.
// Aplica-se APENAS ao signup — nunca ao login, reset ou OAuth.

const KEY = "volant:signup-attempts";
const WINDOW_MS = 10 * 60 * 1000;
const MAX_ATTEMPTS = 5;

function read(): number[] {
  try {
    const raw = localStorage.getItem(KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr.filter((n) => typeof n === "number") : [];
  } catch {
    return [];
  }
}

function write(list: number[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(list));
  } catch {
    /* ignore storage errors */
  }
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
