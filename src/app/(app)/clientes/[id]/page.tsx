"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { KpiCard } from "@/components/KpiCard";
import { DataTable } from "@/components/data-table/DataTable";
import { MarcarCobrado, type Ingreso } from "@/components/MarcarCobrado";
import type { ColumnDef } from "@/components/data-table/types";
import { formatCOP } from "@/lib/format";
import { MONEDAS_INGRESO, TIPOS_INGRESO, TIPOS_ACTIVIDAD } from "@/lib/catalogs";

type Cliente = {
  id: string;
  nombre: string;
  tipo: string | null;
  estado: string;
  fecha_inicio: string | null;
  contacto: string | null;
  notas: string | null;
};

type Rentabilidad = {
  ingresos_cop: number;
  costo_disenador_cop: number;
  margen_cop: number;
};

const ingresoColumns: ColumnDef[] = [
  { key: "concepto", label: "Concepto", type: "text" },
  { key: "tipo_ingreso", label: "Tipo", type: "select", options: TIPOS_INGRESO },
  { key: "mes", label: "Mes", type: "month", required: true },
  { key: "moneda", label: "Moneda", type: "select", options: MONEDAS_INGRESO, required: true, defaultValue: "COP" },
  { key: "monto_original", label: "Monto", type: "number", required: true },
  { key: "trm_aplicada", label: "TRM aplicada", type: "number" },
  { key: "monto_cop", label: "Equiv. COP", type: "readonly-cop" },
  { key: "estado", label: "Estado", type: "readonly-text" },
  { key: "fecha_pago_real", label: "Fecha Pago Real", type: "readonly-date" },
  { key: "fecha_pago_esperada", label: "Fecha Pago Esperada", type: "date" },
  { key: "notas", label: "Notas", type: "text" },
];

const actividadColumns: ColumnDef[] = [
  { key: "fecha", label: "Fecha", type: "date", required: true },
  { key: "tipo", label: "Tipo", type: "select", options: TIPOS_ACTIVIDAD, defaultValue: "Nota" },
  { key: "descripcion", label: "Descripción", type: "text", required: true },
  { key: "horas", label: "Horas", type: "number" },
];

export default function ClienteDetailPage() {
  const params = useParams<{ id: string }>();
  const clienteId = params.id;
  const [cliente, setCliente] = useState<Cliente | null>(null);
  const [rentabilidad, setRentabilidad] = useState<Rentabilidad | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const [{ data: c }, { data: r }] = await Promise.all([
        supabase.from("clientes").select("*").eq("id", clienteId).is("eliminado_en", null).single(),
        supabase.from("v_rentabilidad_cliente").select("*").eq("cliente_id", clienteId).maybeSingle(),
      ]);
      setCliente(c as Cliente);
      setRentabilidad(r as Rentabilidad | null);
      setLoading(false);
    }
    load();
  }, [clienteId]);

  if (loading) return <p className="text-muted">Cargando...</p>;
  if (!cliente) return <p className="text-danger">Cliente no encontrado.</p>;

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title={cliente.nombre}
        subtitle={`${cliente.tipo ?? "Sin tipo"} · ${cliente.estado}${cliente.contacto ? ` · ${cliente.contacto}` : ""}`}
      />

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <KpiCard label="Ingresos totales" value={formatCOP(rentabilidad?.ingresos_cop ?? 0)} />
        <KpiCard label="Costo diseñador" value={formatCOP(rentabilidad?.costo_disenador_cop ?? 0)} />
        <KpiCard label="Margen" value={formatCOP(rentabilidad?.margen_cop ?? 0)} />
      </div>

      <div>
        <h2 className="text-sm font-semibold mb-3">Ingresos</h2>
        <p className="text-xs text-muted mb-3">
          Usa el tipo &quot;Piezas adicionales&quot; para cobros de diseño extra al retainer — así quedan en el
          Dashboard y en pendientes por cobrar, no solo en la ficha del cliente.
        </p>
        <DataTable
          table="ingresos"
          columns={ingresoColumns}
          filters={[{ column: "cliente_id", value: clienteId }]}
          fixedValues={{ cliente_id: clienteId, cliente: cliente.nombre }}
          orderBy="mes"
          ascending={false}
          rowActions={(row, reload) => <MarcarCobrado key={row.id} ingreso={row as Ingreso} onDone={reload} />}
        />
      </div>

      <div>
        <h2 className="text-sm font-semibold mb-3">Actividades y tiempo</h2>
        <DataTable
          table="actividades_cliente"
          columns={actividadColumns}
          filters={[{ column: "cliente_id", value: clienteId }]}
          fixedValues={{ cliente_id: clienteId }}
          orderBy="fecha"
          ascending={false}
        />
      </div>
    </div>
  );
}
