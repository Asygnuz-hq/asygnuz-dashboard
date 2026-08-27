"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { PageHeader } from "@/components/PageHeader";
import type { CuentaDisponible } from "@/lib/meta/client";

export default function ElegirCuentaPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pendienteId = searchParams.get("pendiente");

  const [clienteNombre, setClienteNombre] = useState<string | null>(null);
  const [cuentas, setCuentas] = useState<CuentaDisponible[] | null>(null);
  const [seleccion, setSeleccion] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmando, setConfirmando] = useState(false);

  useEffect(() => {
    if (!pendienteId) {
      setError("Falta el id de la conexión pendiente.");
      return;
    }
    fetch(`/api/meta/pendientes?id=${pendienteId}`)
      .then((res) => res.json().then((data) => ({ res, data })))
      .then(({ res, data }) => {
        if (!res.ok) throw new Error(data.error);
        setClienteNombre(data.cliente_nombre);
        setCuentas(data.cuentas);
        if (data.cuentas.length === 1) setSeleccion(0);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Error desconocido"));
  }, [pendienteId]);

  async function confirmar() {
    if (seleccion === null || !pendienteId) return;
    setConfirmando(true);
    setError(null);
    try {
      const res = await fetch("/api/meta/confirmar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pendienteId, indice: seleccion }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      router.push(`/metricas/clientes?conectado=${encodeURIComponent(data.clienteNombre)}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
      setConfirmando(false);
    }
  }

  return (
    <div className="flex flex-col gap-6 max-w-2xl">
      <PageHeader
        title={clienteNombre ? `¿Cuál cuenta es "${clienteNombre}"?` : "Elegir cuenta de anuncios"}
        subtitle="Esa cuenta de Facebook tiene acceso a varios portafolios — elige el que corresponde a este cliente antes de guardar."
      />

      {error && <p className="text-sm rounded-md border border-border bg-surface p-3 text-danger">{error}</p>}

      {!error && !cuentas && <p className="text-sm text-muted">Cargando cuentas disponibles…</p>}

      {cuentas && cuentas.length === 0 && (
        <p className="text-sm text-muted">No se encontró ninguna cuenta de anuncios asociada a ese login.</p>
      )}

      {cuentas && cuentas.length > 0 && (
        <div className="flex flex-col gap-2">
          {cuentas.map((c, i) => (
            <label
              key={c.ad_account_id}
              className={`flex items-start gap-3 rounded-lg border p-4 cursor-pointer transition ${
                seleccion === i ? "border-accent bg-surface-alt" : "border-border bg-surface hover:bg-surface-alt"
              }`}
            >
              <input
                type="radio"
                name="cuenta"
                className="mt-1"
                checked={seleccion === i}
                onChange={() => setSeleccion(i)}
              />
              <div className="flex flex-col">
                <span className="font-medium">{c.ad_account_name}</span>
                <span className="text-xs text-muted">
                  {c.business_name ? `Portafolio: ${c.business_name} · ` : ""}
                  {c.ad_account_id}
                </span>
              </div>
            </label>
          ))}

          <button
            onClick={confirmar}
            disabled={seleccion === null || confirmando}
            className="self-start mt-2 text-sm rounded-md px-4 py-2 font-medium bg-accent text-accent-foreground disabled:opacity-50"
          >
            {confirmando ? "Guardando…" : "Conectar esta cuenta"}
          </button>
        </div>
      )}
    </div>
  );
}
