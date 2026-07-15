import { PageHeader } from "@/components/PageHeader";
import { DataTable } from "@/components/data-table/DataTable";
import type { ColumnDef } from "@/components/data-table/types";
import { CATEGORIAS_GASTO, MONEDAS } from "@/lib/catalogs";

const columns: ColumnDef[] = [
  { key: "concepto", label: "Concepto", type: "text", required: true },
  { key: "mes", label: "Mes", type: "month", required: true },
  { key: "categoria", label: "Categoría", type: "select", options: CATEGORIAS_GASTO },
  { key: "moneda", label: "Moneda", type: "select", options: MONEDAS, required: true, defaultValue: "COP" },
  { key: "monto", label: "Monto", type: "number" },
  { key: "trm_aplicada", label: "TRM aplicada", type: "number" },
  { key: "monto_cop", label: "Equiv. COP", type: "readonly-cop" },
  { key: "fecha", label: "Fecha", type: "date" },
  { key: "proveedor", label: "Proveedor / Quien pagó", type: "text" },
  { key: "proyecto_relacionado", label: "Proyecto Relacionado", type: "text" },
  { key: "notas", label: "Notas", type: "text" },
];

export default function GastosVariablesPage() {
  return (
    <div>
      <PageHeader title="Gastos variables del mes" subtitle="Registra cada gasto variable. El equivalente en COP se calcula solo con la TRM que apliques." />
      <DataTable table="gastos_variables" columns={columns} monthFilterKey="mes" orderBy="mes" ascending={false} />
    </div>
  );
}
