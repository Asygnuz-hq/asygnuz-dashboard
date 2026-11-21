"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { Moon, Sun } from "@phosphor-icons/react";

export type ModoPortal = "light" | "dark";

const STORAGE_KEY = "asygnuz-portal-mode";

type Ctx = {
  modo: ModoPortal;
  alternar: () => void;
  setModo: (m: ModoPortal) => void;
};

const PortalThemeContext = createContext<Ctx>({
  modo: "light",
  alternar: () => {},
  setModo: () => {},
});

export function PortalThemeProvider({
  inicial = "light",
  children,
}: {
  inicial?: ModoPortal;
  children: ReactNode;
}) {
  const [modo, setModoState] = useState<ModoPortal>(inicial);

  useEffect(() => {
    try {
      const guardado = localStorage.getItem(STORAGE_KEY);
      if (guardado === "light" || guardado === "dark") {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setModoState(guardado);
      }
    } catch {
      // Sin localStorage (navegación privada).
    }
  }, []);

  function setModo(m: ModoPortal) {
    setModoState(m);
    try {
      localStorage.setItem(STORAGE_KEY, m);
    } catch {
      // noop
    }
  }

  function alternar() {
    setModo(modo === "light" ? "dark" : "light");
  }

  return (
    <PortalThemeContext.Provider value={{ modo, alternar, setModo }}>
      {children}
    </PortalThemeContext.Provider>
  );
}

export function usePortalTheme() {
  return useContext(PortalThemeContext);
}

export function BotonTemaPortal({ className = "" }: { className?: string }) {
  const { modo, alternar } = usePortalTheme();
  const esOscuro = modo === "dark";

  return (
    <button
      type="button"
      onClick={alternar}
      aria-label={esOscuro ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
      title={esOscuro ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
      className={`inline-flex h-9 items-center gap-1.5 rounded-full border px-3 text-xs font-medium transition-colors cursor-pointer active:scale-[0.97] ${className}`}
      style={{
        borderColor: "var(--p-border-strong)",
        backgroundColor: "var(--p-surface-subtle)",
        color: "var(--p-ink)",
      }}
    >
      {esOscuro ? (
        <>
          <Sun size={15} weight="light" style={{ color: "var(--p-accent)" }} />
          <span className="hidden sm:inline">Claro</span>
        </>
      ) : (
        <>
          <Moon size={15} weight="light" style={{ color: "var(--p-accent-ink)" }} />
          <span className="hidden sm:inline">Oscuro</span>
        </>
      )}
    </button>
  );
}
