import { Loader2 } from "lucide-react";
import volantSymbol from "@/assets/volant-symbol-header.png";

/**
 * Splash neutro exibido enquanto a sessão / assinatura ainda estão sendo
 * resolvidas. Evita o "flash" da landing para usuários logados e unifica o
 * loader entre `RequireAuth`, `RequirePremium` e `Landing`.
 *
 * Mantém o tema escuro forçado para combinar com a identidade Volant e com
 * o pre-paint script do index.html.
 */
export function SplashScreen() {
  return (
    <div
      className="dark fixed inset-0 z-[60] grid min-h-[100dvh] place-items-center bg-background"
      role="status"
      aria-label="Carregando Volant"
    >
      <div className="flex flex-col items-center gap-4">
        <img
          src={volantSymbol}
          alt=""
          aria-hidden="true"
          className="h-12 w-12 select-none opacity-90 animate-pulse"
          draggable={false}
        />
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    </div>
  );
}
