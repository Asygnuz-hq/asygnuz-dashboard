"use client";

import posthog from "posthog-js";
import { useModuloActivo, type Modulo } from "@/lib/ModuloActivoContext";
import { useTenantModulos } from "@/lib/useTenantModulos";

const MODULOS: { key: Modulo; label: string }[] = [
  { key: "financiero", label: "Financiero" },
  { key: "marketing_pauta", label: "Marketing y Pauta" },
  { key: "crm", label: "CRM" },
  { key: "operacion", label: "Operación" },
  { key: "nomina", label: "Nómina" },
];

export function ModuloSwitcher() {
  const { moduloActivo, setModuloActivo } = useModuloActivo();
  const modulosHabilitados = useTenantModulos();

  // Mientras carga o si el tenant solo tiene un módulo contratado, no hay
  // nada que "switchear" — evita parpadeo y ruido visual innecesario.
  if (!modulosHabilitados) return null;
  const visibles = MODULOS.filter((m) => modulosHabilitados[m.key] === true);
  if (visibles.length <= 1) return null;

  return (
    <div className="flex items-center gap-1 rounded-md border border-border bg-surface-alt p-1 print:hidden">
      {visibles.map((m) => (
        <button
          key={m.key}
          onClick={() => {
            setModuloActivo(m.key);
            // Señal para "qué módulo usa más cada cliente" en /analitica —
            // se asocia solo por estar dentro del grupo "tenant" (PosthogProvider).
            posthog.capture("modulo_activado", { modulo: m.key });
          }}
          className={`text-sm px-3 py-1.5 rounded transition-colors whitespace-nowrap ${
            moduloActivo === m.key
              ? "bg-accent text-accent-foreground font-medium"
              : "text-foreground/70 hover:bg-surface"
          }`}
        >
          {m.label}
        </button>
      ))}
    </div>
  );
}
