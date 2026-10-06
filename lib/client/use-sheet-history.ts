"use client";

import { useEffect, useRef } from "react";

/**
 * Hace que el botón/gesto "atrás" del sistema (Android, swipe de iOS) cierre el sheet
 * en lugar de salir de la pantalla. Empuja una entrada de historial mientras está abierto.
 */
export function useSheetHistory(open: boolean, onClose: () => void) {
  const closeRef = useRef(onClose);
  useEffect(() => {
    closeRef.current = onClose;
  });

  useEffect(() => {
    if (!open) return;
    const marker = { sheet: true };
    window.history.pushState(marker, "");
    let closedByPop = false;
    const onPop = () => {
      closedByPop = true;
      closeRef.current();
    };
    window.addEventListener("popstate", onPop);
    return () => {
      window.removeEventListener("popstate", onPop);
      // Si se cerró desde la UI (no con "atrás"), retiramos la entrada que empujamos.
      if (!closedByPop && window.history.state?.sheet) window.history.back();
    };
  }, [open]);
}
