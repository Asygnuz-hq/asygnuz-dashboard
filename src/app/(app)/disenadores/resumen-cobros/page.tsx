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
      <PageHeader
        title="Resumen mensual de cobros a clientes (histórico)"
        subtitle="Totales de Cobros a Clientes hasta que se migró a Ingresos. Los cobros nuevos se ven en Ingresos y en el Dashboard."
      />
      <ReadOnlyTable source="v_resumen_cobros" columns={columns} orderBy="mes" ascending={false} />
    </div>
  );
}
