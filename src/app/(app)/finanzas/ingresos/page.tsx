"use client";

import { PageHeader } from "@/components/PageHeader";
import { DataTable } from "@/components/data-table/DataTable";
import { MarcarCobrado, type Ingreso } from "@/components/MarcarCobrado";
import type { ColumnDef } from "@/components/data-table/types";
import { MONEDAS_INGRESO, TIPOS_INGRESO } from "@/lib/catalogs";

const columns: ColumnDef[] = [
  { key: "cliente", label: "Cliente", type: "text", required: true },
  { key: "concepto", label: "Concepto", type: "text" },
  { key: "tipo_ingreso", label: "Tipo", type: "select", options: TIPOS_INGRESO },
  { key: "mes", label: "Mes", type: "month", required: true },
  { key: "moneda", label: "Moneda", type: "select", options: MONEDAS_INGRESO, required: true, defaultValue: "COP" },
  { key: "monto_original", label: "Monto", type: "number", required: true },
  { key: "trm_aplicada", label: "TRM aplicada", type: "number" },
  { key: "trm_estimada_hoy", label: "TRM estimada hoy", type: "readonly-number" },
  { key: "monto_cop", label: "Equiv. COP", type: "readonly-cop" },
  { key: "monto_usd", label: "Equiv. USD", type: "readonly-usd" },
  { key: "estado", label: "Estado", type: "select", options: ["Cobrado", "Pendiente"], defaultValue: "Pendiente" },
  { key: "fecha_pago_real", label: "Fecha Pago Real", type: "date" },
  { key: "fecha_pago_esperada", label: "Fecha Pago Esperada", type: "date" },
  { key: "factura_no", label: "Factura No.", type: "text" },
  { key: "notas", label: "Notas", type: "text" },
];

export default function IngresosPage() {
  return (
    <div>
      <PageHeader
        title="Ingresos por cliente"
        subtitle="Mientras está Pendiente, la TRM aplicada es solo tu estimado y 'TRM estimada hoy' se actualiza sola cada día. Al usar 'Marcar cobrado' se trae la TRM oficial del día real de pago, sin que tengas que buscarla."
      />
      <DataTable
        table="ingresos"
        columns={columns}
        monthFilterKey="mes"
        orderBy="mes"
        ascending={false}
        rowActions={(row, reload) => <MarcarCobrado key={row.id} ingreso={row as Ingreso} onDone={reload} />}
      />
    </div>
  );
}
