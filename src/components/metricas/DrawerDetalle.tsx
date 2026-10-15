"use client";

import { useEffect, useCallback } from "react";
import { FUENTE_DISPLAY } from "@/lib/portal/fuente";

type DrawerDetalleProps = {
  abierto: boolean;
  onCerrar?: () => void;
  alCerrar?: () => void;
  titulo: string;
  children: React.ReactNode;
};

export function DrawerDetalle({ abierto, onCerrar, alCerrar, titulo, children }: DrawerDetalleProps) {
  const cerrar = useCallback(() => {
    if (onCerrar) onCerrar();
    else if (alCerrar) alCerrar();
  }, [onCerrar, alCerrar]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && abierto) cerrar();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [abierto, cerrar]);

  if (!abierto) return null;

  return (
    <>
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 transition-opacity"
        onClick={cerrar}
        aria-hidden
      />
      <aside
        className="fixed top-0 right-0 bottom-0 w-full max-w-xl bg-surface border-l border-border shadow-2xl z-50 flex flex-col overflow-y-auto animate-in slide-in-from-right duration-300"
        role="dialog"
        aria-modal="true"
        aria-labelledby="drawer-titulo"
      >
        <div className="sticky top-0 bg-surface/95 backdrop-blur-md px-6 py-4 border-b border-border flex items-center justify-between z-10">
          <h3 id="drawer-titulo" className="text-base font-bold text-foreground" style={{ fontFamily: FUENTE_DISPLAY }}>
            {titulo}
          </h3>
          <button
            type="button"
            onClick={cerrar}
            className="p-1.5 rounded-lg text-muted hover:text-foreground hover:bg-surface-alt transition-colors"
            aria-label="Cerrar panel"
          >
            ✕
          </button>
        </div>
        <div className="p-6 flex flex-col gap-5">{children}</div>
      </aside>
    </>
  );
}
