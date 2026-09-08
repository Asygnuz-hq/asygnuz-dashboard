"use client";

import { createContext, useContext } from "react";
import { usePathname, useRouter } from "next/navigation";
import { derivarModulo, MODULO_HOME, type Modulo } from "@/lib/moduloDeRuta";

export type { Modulo };

type ModuloActivoContextValue = {
  moduloActivo: Modulo;
  setModuloActivo: (modulo: Modulo) => void;
};

const ModuloActivoContext = createContext<ModuloActivoContextValue | null>(null);

export function ModuloActivoProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const moduloActivo = derivarModulo(pathname);

  // "Cambiar de módulo" es navegar a su página principal — antes solo
  // cambiaba qué se veía en el sidebar y te dejaba en la página en la que
  // ya estabas, aunque no tuviera nada que ver con el módulo elegido.
  function setModuloActivo(modulo: Modulo) {
    router.push(MODULO_HOME[modulo]);
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
