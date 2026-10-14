"use client";

import type { ReactNode } from "react";

export function ActionModal({
  title,
  children,
  onClose,
  wide = false,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
  /** Diálogos con más contenido (detalle de tarea, comentarios) necesitan más ancho que un confirm. */
  wide?: boolean;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className={`w-full ${wide ? "max-w-lg" : "max-w-sm"} glass rounded-2xl p-4 flex flex-col gap-3 shadow-xl`}
        onClick={(e) => e.stopPropagation()}
      >
        <p className="text-sm font-medium">{title}</p>
        {children}
      </div>
    </div>
  );
}
