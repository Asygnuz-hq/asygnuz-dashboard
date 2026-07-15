import { PageHeader } from "@/components/PageHeader";
import { ReadOnlyTable } from "@/components/data-table/ReadOnlyTable";
import type { ColumnDef } from "@/components/data-table/types";

const columns: ColumnDef[] = [
  { key: "cliente", label: "Cliente", type: "text" },
  { key: "estado", label: "Estado", type: "text" },
  { key: "ingresos_cop", label: "Ingresos COP", type: "readonly-cop" },
  { key: "cobrado_usd", label: "Cobrado USD", type: "readonly-usd" },
  { key: "costo_disenador_cop", label: "Costo Diseñador COP", type: "readonly-cop" },
  { key: "margen_cop", label: "Margen COP", type: "readonly-cop" },
];

export default function RentabilidadClientePage() {
  return (
    <div>
      <PageHeader
        title="Rentabilidad por cliente"
        subtitle="Ingresos vinculados al cliente menos el costo de diseñador de las tareas vinculadas a ese cliente. Solo cuenta lo que ya tiene cliente asignado en Ingresos / Control Mensual."
      />
      <ReadOnlyTable source="v_rentabilidad_cliente" columns={columns} orderBy="margen_cop" ascending={false} />
    </div>
  );
}
