"use client";

import { createContext, useContext, useEffect, useState } from "react";

export type Modulo = "financiero" | "marketing_pauta" | "crm" | "operacion";

const STORAGE_KEY = "asygnuz-modulo-activo";
const MODULOS_VALIDOS: Modulo[] = ["financiero", "marketing_pauta", "crm", "operacion"];

type ModuloActivoContextValue = {
  moduloActivo: Modulo;
  setModuloActivo: (modulo: Modulo) => void;
};

const ModuloActivoContext = createContext<ModuloActivoContextValue | null>(null);

export function ModuloActivoProvider({ children }: { children: React.ReactNode }) {
  const [moduloActivo, setModuloActivoState] = useState<Modulo>("financiero");

  useEffect(() => {
    try {
      const guardado = localStorage.getItem(STORAGE_KEY);
      if (guardado && MODULOS_VALIDOS.includes(guardado as Modulo)) {
        setModuloActivoState(guardado as Modulo);
      }
    } catch {
      // localStorage puede fallar (navegación privada) — se queda en "financiero".
    }
  }, []);

  function setModuloActivo(modulo: Modulo) {
    setModuloActivoState(modulo);
    try {
      localStorage.setItem(STORAGE_KEY, modulo);
    } catch {
      // no pasa nada si no se puede persistir, solo dura la sesión de pestaña.
    }
  }

  return (
    <ModuloActivoContext.Provider value={{ moduloActivo, setModuloActivo }}>
      {children}
    </ModuloActivoContext.Provider>
  );
}

export function useModuloActivo() {
  const ctx = useContext(ModuloActivoContext);
  if (!ctx) {
    throw new Error("useModuloActivo debe usarse dentro de ModuloActivoProvider");
  }
  return ctx;
}
