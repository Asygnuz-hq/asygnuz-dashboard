import { PageHeader } from "@/components/PageHeader";
import { DataTable } from "@/components/data-table/DataTable";
import type { ColumnDef } from "@/components/data-table/types";
import { MONEDAS } from "@/lib/catalogs";

const columns: ColumnDef[] = [
  { key: "tipo", label: "Tipo", type: "text" },
  { key: "activo_descripcion", label: "Activo / Descripción", type: "text", required: true },
  { key: "fecha_entrada", label: "Fecha Entrada", type: "date" },
  { key: "moneda", label: "Moneda", type: "select", options: MONEDAS, required: true, defaultValue: "COP" },
  { key: "monto_invertido", label: "Monto Invertido", type: "number" },
  { key: "trm_entrada", label: "TRM Entrada", type: "number" },
  { key: "monto_cop_entrada", label: "Equiv. COP (entrada)", type: "readonly-cop" },
  { key: "valor_actual_manual", label: "Valor Actual (manual)", type: "number" },
  { key: "trm_valoracion", label: "TRM Valoración", type: "number" },
  { key: "valor_cop_actual", label: "Valor COP Actual", type: "readonly-cop" },
  { key: "ganancia_perdida_cop", label: "Ganancia/Pérdida COP", type: "readonly-cop" },
  { key: "retorno_pct", label: "Retorno %", type: "readonly-percent" },
  { key: "estado", label: "Estado", type: "text" },
  { key: "notas", label: "Notas", type: "text" },
];

export default function InversionesPage() {
  return (
    <div>
      <PageHeader
        title="Portafolio de inversiones"
        subtitle="El valor actual y la TRM de valoración se actualizan manualmente; la conversión y el retorno se calculan solos."
      />
      <DataTable table="inversiones" columns={columns} orderBy="fecha_entrada" ascending={false} />
    </div>
  );
}
