import { useEffect } from "react";
import { useLocation } from "react-router-dom";

/**
 * Reseta o scroll da janela para o topo a cada mudança de rota.
 * Modais e drawers não acionam (não mudam pathname).
 */
export default function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0 });
  }, [pathname]);
  return null;
}
