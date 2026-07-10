import { useEffect, useRef, useState } from "react";

/**
 * Hook keyboard-aware para formulários em PWAs (iOS principalmente).
 *
 * No iOS o teclado virtual NÃO redimensiona `100dvh` — ele apenas cobre a tela.
 * Resultado: campos ficam atrás do teclado e o botão de salvar some.
 *
 * Solução: observamos `window.visualViewport` para detectar o teclado aberto,
 * expomos `keyboardHeight` para o consumidor aplicar como `paddingBottom`,
 * e fazemos auto-scroll do input ativo para o centro da área visível.
 *
 * Aplique a ref no container rolável do formulário.
 */
export function useKeyboardAwareScroll<T extends HTMLElement = HTMLDivElement>() {
  const ref = useRef<T | null>(null);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    const vv = typeof window !== "undefined" ? window.visualViewport : null;
    if (!vv) return;

    let settleTimer: number | null = null;
    const measure = () => {
      const diff = window.innerHeight - vv.height;
      // Threshold proporcional: teclado costuma cobrir >20% da altura.
      // Evita falsos positivos com address-bar/barra de navegação no Android.
      const threshold = Math.max(150, window.innerHeight * 0.2);
      setKeyboardHeight(diff > threshold ? Math.round(diff) : 0);
    };
    const update = () => {
      measure();
      // Reconfirma após a animação do teclado terminar. Cobre o caso do teclado
      // fechar por abertura de dropdown/select, quando o último evento chega
      // durante a animação e o valor "congelaria" errado.
      if (settleTimer) window.clearTimeout(settleTimer);
      settleTimer = window.setTimeout(measure, 250);
    };
    update();
    vv.addEventListener("resize", update);
    vv.addEventListener("scroll", update);
    return () => {
      if (settleTimer) window.clearTimeout(settleTimer);
      vv.removeEventListener("resize", update);
      vv.removeEventListener("scroll", update);
    };
  }, []);

  useEffect(() => {
    const container = ref.current;
    if (!container) return;

    const onFocusIn = (e: FocusEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;
      const isEditable =
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable;
      if (!isEditable) return;
      // Espera o teclado animar antes de rolar.
      window.setTimeout(() => {
        try {
          target.scrollIntoView({ block: "center", behavior: "smooth" });
        } catch {
          target.scrollIntoView();
        }
      }, 120);
    };

    container.addEventListener("focusin", onFocusIn);
    return () => container.removeEventListener("focusin", onFocusIn);
  }, []);

  return { ref, keyboardHeight };
}
