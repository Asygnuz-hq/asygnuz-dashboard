import { PageHeader } from "@/components/PageHeader";
import { ReadOnlyTable } from "@/components/data-table/ReadOnlyTable";
import type { ColumnDef } from "@/components/data-table/types";

const columns: ColumnDef[] = [
  { key: "mes", label: "Mes", type: "month" },
  { key: "ingresos_cop", label: "Ingresos COP", type: "readonly-cop" },
  { key: "gastos_cop", label: "Gastos COP", type: "readonly-cop" },
  { key: "utilidad_neta_cop", label: "Utilidad Neta COP", type: "readonly-cop" },
  { key: "margen_pct", label: "Margen %", type: "readonly-percent" },
];

export default function HistoricoPage() {
  return (
    <div>
      <PageHeader
        title="Histórico financiero mensual"
        subtitle="Calculado automáticamente desde Ingresos y Gastos. Los Gastos Fijos activos se suman a cada mes."
      />
      <ReadOnlyTable source="v_historico_mensual" columns={columns} orderBy="mes" ascending={true} />
    </div>
  );
}
