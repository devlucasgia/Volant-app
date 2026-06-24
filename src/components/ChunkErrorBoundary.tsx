import { Component, ReactNode } from "react";

const FLAG_KEY = "volant_chunk_reloaded";

function safeGetFlag(): string | null {
  try {
    return sessionStorage.getItem(FLAG_KEY);
  } catch {
    return null;
  }
}

function safeSetFlag(value: string) {
  try {
    sessionStorage.setItem(FLAG_KEY, value);
  } catch {
    /* noop */
  }
}

export function clearChunkReloadFlag() {
  try {
    sessionStorage.removeItem(FLAG_KEY);
  } catch {
    /* noop */
  }
}

function isChunkLoadError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const e = error as { name?: string; message?: string };
  if (e.name === "ChunkLoadError") return true;
  if (typeof e.message === "string" && /Loading chunk/i.test(e.message)) return true;
  if (typeof e.message === "string" && /Failed to fetch dynamically imported module/i.test(e.message)) return true;
  return false;
}

interface State {
  fatal: boolean;
}

interface Props {
  children: ReactNode;
}

/**
 * Captura ChunkLoadError (típico de aba antiga após deploy novo) e tenta
 * recarregar UMA vez por sessão. Se o erro persistir, mostra um fallback
 * manual em vez de entrar em loop de reload.
 */
export class ChunkErrorBoundary extends Component<Props, State> {
  state: State = { fatal: false };

  static getDerivedStateFromError(error: unknown): State | null {
    if (!isChunkLoadError(error)) return null;
    return { fatal: true };
  }

  componentDidCatch(error: unknown) {
    if (!isChunkLoadError(error)) {
      // Propaga: não engole erros não-chunk.
      throw error;
    }
    const alreadyReloaded = safeGetFlag() === "1";
    if (!alreadyReloaded) {
      safeSetFlag("1");
      try {
        window.location.reload();
      } catch {
        /* fallback abaixo */
      }
    }
  }

  handleRetry = () => {
    clearChunkReloadFlag();
    try {
      window.location.reload();
    } catch {
      /* noop */
    }
  };

  render() {
    if (!this.state.fatal) return this.props.children;

    // Reload já foi disparado; mostramos um aviso curto enquanto o browser navega.
    // Se persistir (2ª ocorrência), o usuário tem um botão pra tentar de novo.
    const alreadyReloaded = safeGetFlag() === "1";
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center gap-3 px-6 text-center">
        <p className="text-sm text-foreground/90">
          Não foi possível carregar esta parte.
        </p>
        {alreadyReloaded && (
          <button
            type="button"
            onClick={this.handleRetry}
            className="rounded-lg border border-border bg-card px-4 py-2 text-sm font-semibold transition-colors hover:bg-muted/40"
          >
            Tentar de novo
          </button>
        )}
      </div>
    );
  }
}
