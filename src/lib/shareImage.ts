import { toBlob } from "html-to-image";

const TIMEOUT_MS = 8000;

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error("timeout")), ms);
    p.then(
      (v) => { clearTimeout(t); resolve(v); },
      (e) => { clearTimeout(t); reject(e); },
    );
  });
}

/**
 * Gera um PNG a partir de um nó DOM já em tamanho real de exportação (1080px).
 * pixelRatio = 1 porque o nó já é 1080px (evita canvas 3240×5760 em celulares).
 */
export async function generateCardImage(node: HTMLElement): Promise<Blob> {
  try {
    if (document.fonts?.ready) await document.fonts.ready;
  } catch { /* segue sem esperar fontes */ }

  let blob: Blob | null;
  try {
    blob = await withTimeout(
      toBlob(node, { pixelRatio: 1, cacheBust: true, backgroundColor: undefined }),
      TIMEOUT_MS,
    );
  } catch (err) {
    const msg = err instanceof Error && err.message === "timeout"
      ? "Não foi possível gerar a imagem, tente novamente."
      : "Falha ao gerar a imagem.";
    throw new Error(msg);
  }

  if (!blob) throw new Error("Falha ao gerar a imagem.");
  return blob;
}

export type SaveOutcome = "saved" | "failed";
export type ShareOutcome = "shared" | "unsupported" | "failed";

/** Baixa a imagem como arquivo (Salvar). Nunca abre menu de compartilhamento. */
export async function saveImageToDevice(blob: Blob, filename: string): Promise<SaveOutcome> {
  let url: string | null = null;
  try {
    url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    return "saved";
  } catch {
    return "failed";
  } finally {
    if (url) setTimeout(() => URL.revokeObjectURL(url!), 1000);
  }
}

/** Abre o menu de compartilhamento do sistema (WhatsApp, Instagram, etc.). */
export async function shareImageViaSystem(blob: Blob, filename: string): Promise<ShareOutcome> {
  const file = new File([blob], filename, { type: "image/png" });
  const nav = navigator as Navigator & {
    canShare?: (data: ShareData) => boolean;
    share?: (data: ShareData) => Promise<void>;
  };

  if (!nav.share || !nav.canShare || !nav.canShare({ files: [file] })) {
    return "unsupported";
  }

  try {
    await nav.share({
      files: [file],
      title: "Meu resultado no Volant",
      text: "Confere meu resultado do período no Volant.",
    });
    return "shared";
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") return "shared";
    return "failed";
  }
}
