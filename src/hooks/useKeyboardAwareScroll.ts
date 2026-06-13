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

    const update = () => {
      const diff = window.innerHeight - vv.height;
      // Threshold conservador para não confundir com address-bar no Android.
      setKeyboardHeight(diff > 150 ? Math.round(diff) : 0);
    };
    update();
    vv.addEventListener("resize", update);
    vv.addEventListener("scroll", update);
    return () => {
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
