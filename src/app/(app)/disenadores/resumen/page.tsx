import { PageHeader } from "@/components/PageHeader";
import { ReadOnlyTable } from "@/components/data-table/ReadOnlyTable";
import type { ColumnDef } from "@/components/data-table/types";

const columns: ColumnDef[] = [
  { key: "disenador", label: "Diseñador", type: "text" },
  { key: "mes", label: "Mes", type: "month" },
  { key: "tareas_registradas", label: "Tareas Registradas", type: "readonly-number" },
  { key: "piezas_entregadas", label: "Piezas Entregadas", type: "readonly-number" },
  { key: "revisiones", label: "Revisiones", type: "readonly-number" },
  { key: "total_a_pagar_cop", label: "Total a Pagar (COP)", type: "readonly-cop" },
  { key: "calificacion_promedio", label: "Calificación Promedio", type: "readonly-number" },
  { key: "pct_aprobadas", label: "% Aprobadas", type: "readonly-percent" },
];

export default function ResumenDisenadorPage() {
  return (
    <div>
      <PageHeader title="Resumen por diseñador" subtitle="Totales calculados automáticamente desde Control Mensual." />
      <ReadOnlyTable source="v_resumen_disenador" columns={columns} orderBy="mes" ascending={false} />
    </div>
  );
}
