"use client";

// Detalle de un negocio: carga el registro y muestra la vista de su tipo (proyecto a precio fijo o mensualidad).

import Link from "next/link";
import { useParams } from "next/navigation";
import { PageHeader } from "@/components/PageHeader";
import { BTN, BTN_PRIMARIO, PanelSeguimiento, TIPOS, useCaso, type Cambiar, type Caso } from "@/components/casos/ui";
import { CasoProyecto } from "@/components/casos/CasoProyecto";
import { CasoMensualidad } from "@/components/casos/CasoMensualidad";
import type { Supuestos } from "@/lib/casos/modelo";
import type { SupuestosMensualidad } from "@/lib/casos/mensualidad";

export default function NegocioPage() {
  const { id } = useParams<{ id: string }>();
  const { caso, error, estado, cambiar, guardar } = useCaso(id);

  if (error && !caso) return <p className="text-sm text-danger">No se pudo abrir el negocio: {error}</p>;
  if (!caso) return <p className="text-sm text-muted">Cargando…</p>;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <PageHeader title={caso.nombre} subtitle={`${TIPOS[caso.tipo]}${caso.cliente ? ` · ${caso.cliente}` : ""}`} />
        <div className="flex items-center gap-2">
          <Link href="/crm/casos-negocio" className={BTN}>Volver a negocios</Link>
          <button className={BTN_PRIMARIO} disabled={estado !== "cambios"} onClick={guardar}>
            {estado === "guardando" ? "Guardando…" : estado === "guardado" ? "Guardado" : "Guardar cambios"}
          </button>
        </div>
      </div>
      {error && <p className="text-sm text-danger">{error}</p>}

      <PanelSeguimiento caso={caso} cambiar={cambiar} />

      {caso.tipo === "mensualidad" ? (
        <CasoMensualidad caso={caso as Caso<SupuestosMensualidad>} cambiar={cambiar as Cambiar<SupuestosMensualidad>} />
      ) : (
        <CasoProyecto caso={caso as Caso<Supuestos>} cambiar={cambiar as Cambiar<Supuestos>} />
      )}
    </div>
  );
}
