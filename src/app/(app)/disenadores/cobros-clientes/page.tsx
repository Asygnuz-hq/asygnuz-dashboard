import { PageHeader } from "@/components/PageHeader";
import { DataTable } from "@/components/data-table/DataTable";
import type { ColumnDef } from "@/components/data-table/types";
import { ESTADOS_COBRO, TIPOS_PIEZA } from "@/lib/catalogs";

const columns: ColumnDef[] = [
  { key: "cliente", label: "Cliente", type: "text", required: true },
  { key: "mes", label: "Mes", type: "month", required: true },
  { key: "proyecto_pieza", label: "Proyecto / Pieza", type: "text" },
  { key: "tipo", label: "Tipo", type: "select", options: TIPOS_PIEZA },
  { key: "piezas_cobradas", label: "Piezas Cobradas", type: "number" },
  { key: "tarifa_unit_usd", label: "Tarifa Unit. USD", type: "number" },
  { key: "total_cobrado_usd", label: "Total Cobrado USD", type: "readonly-usd" },
  { key: "fecha_factura", label: "Fecha Factura", type: "date" },
  { key: "estado_cobro", label: "Estado Cobro", type: "select", options: ESTADOS_COBRO, defaultValue: "Pendiente" },
  { key: "pagado", label: "¿Pagado?", type: "boolean" },
  { key: "margen_adicional_usd", label: "Margen Adicional USD", type: "number" },
  { key: "notas", label: "Notas", type: "text" },
];

export default function CobrosClientesPage() {
  return (
    <div>
      <PageHeader title="Cobros a clientes por diseño" subtitle="Lo que ASYGNUZ cobra al cliente por cada pieza entregada." />
      <DataTable table="cobros_clientes" columns={columns} monthFilterKey="mes" orderBy="mes" ascending={false} />
    </div>
  );
}
