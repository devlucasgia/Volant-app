// Centralized friendly error messages for user-facing toasts.
// Raw auth/database errors must NOT be shown to users.
// Technical details are logged to the console for debugging only.

function getRawMessage(err: unknown): string {
  if (!err) return "";
  if (typeof err === "string") return err;
  if (typeof err === "object" && err !== null) {
    const anyErr = err as { message?: unknown; error_description?: unknown };
    if (typeof anyErr.message === "string") return anyErr.message;
    if (typeof anyErr.error_description === "string") return anyErr.error_description;
  }
  return "";
}

export function friendlyAuthError(
  err: unknown,
  fallback = "Não foi possível concluir a ação. Tente novamente."
): string {
  // Log full technical detail internally only
  // eslint-disable-next-line no-console
  console.error("[auth]", err);

  const raw = getRawMessage(err).toLowerCase();

  // Invalid credentials (sign-in)
  if (
    raw.includes("invalid login") ||
    raw.includes("invalid credentials") ||
    raw.includes("invalid email or password")
  ) {
    return "Usuário ou senha inválidos.";
  }

  // Account already exists — return generic message to avoid email enumeration
  if (raw.includes("already registered") || raw.includes("user already") || raw.includes("already exists")) {
    return "Não foi possível criar a conta. Tente novamente.";
  }

  // Email not confirmed
  if (raw.includes("email not confirmed") || raw.includes("confirm your email")) {
    return "Confirme seu e-mail antes de entrar.";
  }

  // Rate limited
  if (raw.includes("rate limit") || raw.includes("too many")) {
    return "Muitas tentativas. Aguarde um instante e tente novamente.";
  }

  // Weak password
  if (raw.includes("password") && (raw.includes("short") || raw.includes("weak") || raw.includes("at least"))) {
    return "Use uma senha mais forte (mínimo 6 caracteres).";
  }

  // Network / generic
  if (raw.includes("network") || raw.includes("fetch")) {
    return "Falha de conexão. Verifique sua internet e tente novamente.";
  }

  return fallback;
}

export function friendlyDbError(
  err: unknown,
  fallback = "Não foi possível salvar. Revise as informações e tente novamente."
): string {
  // eslint-disable-next-line no-console
  console.error("[db]", err);
  // Never surface raw DB messages — always return a fixed friendly string.
  return fallback;
}

const ALLOWED_IMAGE_MIME = ["image/png", "image/jpeg", "image/webp"];
const ALLOWED_IMAGE_EXT = ["png", "jpg", "jpeg", "webp"];

export type ImageValidationResult =
  | { ok: true; ext: string; message?: undefined }
  | { ok: false; ext?: undefined; message: string };

/** Synchronous size + MIME + extension check. */
export function validateImageFile(file: File, maxBytes = 2 * 1024 * 1024): ImageValidationResult {
  if (file.size > maxBytes) {
    return { ok: false, message: `Imagem deve ter até ${Math.round(maxBytes / (1024 * 1024))}MB.` };
  }
  const ext = (file.name.split(".").pop() || "").toLowerCase();
  if (!ALLOWED_IMAGE_MIME.includes(file.type) || !ALLOWED_IMAGE_EXT.includes(ext)) {
    return { ok: false, message: "Formato inválido. Envie uma imagem PNG, JPG ou WEBP." };
  }
  return { ok: true, ext: ext === "jpeg" ? "jpg" : ext };
}

/**
 * Inspects the first bytes of the file to confirm it really is a PNG/JPG/WEBP
 * (defends against renamed scripts / SVG / HTML disguised as images).
 */
export async function verifyImageSignature(file: File, maxBytes?: number): Promise<ImageValidationResult> {
  const basic = validateImageFile(file, maxBytes);
  if (!basic.ok) return basic;

  try {
    const head = new Uint8Array(await file.slice(0, 16).arrayBuffer());

    const isPng =
      head[0] === 0x89 && head[1] === 0x50 && head[2] === 0x4e && head[3] === 0x47 &&
      head[4] === 0x0d && head[5] === 0x0a && head[6] === 0x1a && head[7] === 0x0a;

    const isJpg = head[0] === 0xff && head[1] === 0xd8 && head[2] === 0xff;

    // RIFF....WEBP
    const isWebp =
      head[0] === 0x52 && head[1] === 0x49 && head[2] === 0x46 && head[3] === 0x46 &&
      head[8] === 0x57 && head[9] === 0x45 && head[10] === 0x42 && head[11] === 0x50;

    const matchesExt =
      (basic.ext === "png" && isPng) ||
      (basic.ext === "jpg" && isJpg) ||
      (basic.ext === "webp" && isWebp);

    if (!matchesExt) {
      return { ok: false, message: "Arquivo não é uma imagem válida." };
    }
    return basic;
  } catch {
    return { ok: false, message: "Não foi possível ler o arquivo." };
  }
}
