// Centralized friendly error messages for user-facing toasts.
// Raw auth/database errors must NOT be shown to users.
// Technical details are logged to the console for debugging only.

export function friendlyAuthError(err: unknown, fallback = "Não foi possível concluir a ação. Verifique os dados e tente novamente."): string {
  // Log full technical detail internally only
  // eslint-disable-next-line no-console
  console.error("[auth]", err);
  return fallback;
}

export function friendlyDbError(err: unknown, fallback = "Não foi possível salvar. Revise as informações e tente novamente."): string {
  // eslint-disable-next-line no-console
  console.error("[db]", err);
  return fallback;
}

const ALLOWED_IMAGE_MIME = ["image/png", "image/jpeg", "image/webp"];
const ALLOWED_IMAGE_EXT = ["png", "jpg", "jpeg", "webp"];

export type ImageValidationResult =
  | { ok: true; ext: string; message?: undefined }
  | { ok: false; ext?: undefined; message: string };

export function validateImageFile(file: File, maxBytes = 2 * 1024 * 1024): ImageValidationResult {
  if (file.size > maxBytes) {
    return { ok: false, message: `Imagem deve ter até ${Math.round(maxBytes / (1024 * 1024))}MB` };
  }
  const ext = (file.name.split(".").pop() || "").toLowerCase();
  if (!ALLOWED_IMAGE_MIME.includes(file.type) || !ALLOWED_IMAGE_EXT.includes(ext)) {
    return { ok: false, message: "Formato inválido. Envie uma imagem PNG ou JPG." };
  }
  return { ok: true, ext: ext === "jpeg" ? "jpg" : ext };
}
