import { useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

/**
 * Página 404 — usada para qualquer rota inválida (pública ou autenticada).
 * Mantém a identidade Volant (tema escuro fixo) e oferece atalhos claros
 * para a página inicial e para o app.
 */
const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    // Log silencioso para investigar links quebrados em produção.
    // Evitamos console.error em ambiente publicado.
    if (import.meta.env.DEV) {
      console.warn("404:", location.pathname);
    }
  }, [location.pathname]);

  return (
    <div className="dark grid min-h-[100dvh] place-items-center bg-background px-6 text-foreground">
      <div className="text-center">
        <p className="text-[12px] uppercase tracking-[0.18em] text-muted-foreground/70">Volant</p>
        <h1 className="mt-2 text-5xl font-bold tracking-tight">404</h1>
        <p className="mt-3 text-base text-muted-foreground">
          Essa página não existe ou foi movida.
        </p>
        <div className="mt-6 flex flex-col items-center gap-2">
          <Link
            to="/app"
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-transform hover:scale-[1.02] active:scale-[0.98]"
          >
            Ir para o app
          </Link>
          <Link
            to="/"
            className="inline-flex items-center gap-1 text-[13px] text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Voltar para o início
          </Link>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
