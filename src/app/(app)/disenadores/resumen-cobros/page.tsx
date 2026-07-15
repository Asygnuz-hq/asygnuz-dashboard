import { PageHeader } from "@/components/PageHeader";
import { ReadOnlyTable } from "@/components/data-table/ReadOnlyTable";
import type { ColumnDef } from "@/components/data-table/types";

const columns: ColumnDef[] = [
  { key: "cliente", label: "Cliente", type: "text" },
  { key: "mes", label: "Mes", type: "month" },
  { key: "piezas_cobradas", label: "Piezas Cobradas", type: "readonly-number" },
  { key: "total_cobrado_usd", label: "Total Cobrado USD", type: "readonly-usd" },
];

export default function ResumenCobrosPage() {
  return (
    <div>
      <PageHeader title="Resumen mensual de cobros a clientes" subtitle="Totales calculados automáticamente desde Cobros a Clientes." />
      <ReadOnlyTable source="v_resumen_cobros" columns={columns} orderBy="mes" ascending={false} />
    </div>
  );
}
