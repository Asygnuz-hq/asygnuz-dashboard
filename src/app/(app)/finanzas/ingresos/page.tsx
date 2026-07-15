import { PageHeader } from "@/components/PageHeader";
import { DataTable } from "@/components/data-table/DataTable";
import type { ColumnDef } from "@/components/data-table/types";
import { MONEDAS } from "@/lib/catalogs";

const columns: ColumnDef[] = [
  { key: "cliente", label: "Cliente", type: "text", required: true },
  { key: "concepto", label: "Concepto", type: "text" },
  { key: "mes", label: "Mes", type: "month", required: true },
  { key: "moneda", label: "Moneda", type: "select", options: MONEDAS, required: true, defaultValue: "COP" },
  { key: "monto_original", label: "Monto", type: "number", required: true },
  { key: "trm_aplicada", label: "TRM aplicada", type: "number" },
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
      <PageHeader title="Ingresos por cliente" subtitle="Registra cada ingreso. La conversión COP/USD es automática con la TRM que apliques a esa fila." />
      <DataTable table="ingresos" columns={columns} monthFilterKey="mes" orderBy="mes" ascending={false} />
    </div>
  );
}
