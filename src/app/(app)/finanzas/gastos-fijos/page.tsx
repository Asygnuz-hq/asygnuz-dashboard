import { PageHeader } from "@/components/PageHeader";
import { DataTable } from "@/components/data-table/DataTable";
import type { ColumnDef } from "@/components/data-table/types";
import { CATEGORIAS_GASTO, MONEDAS } from "@/lib/catalogs";

const columns: ColumnDef[] = [
  { key: "concepto", label: "Concepto", type: "text", required: true },
  { key: "categoria", label: "Categoría", type: "select", options: CATEGORIAS_GASTO },
  { key: "moneda", label: "Moneda", type: "select", options: MONEDAS, required: true, defaultValue: "COP" },
  { key: "monto", label: "Monto", type: "number" },
  { key: "trm_aplicada", label: "TRM aplicada", type: "number" },
  { key: "monto_cop", label: "Equiv. COP", type: "readonly-cop" },
  { key: "frecuencia", label: "Frecuencia", type: "select", options: ["Mensual", "Unico"], defaultValue: "Mensual" },
  { key: "activo", label: "Activo", type: "boolean", defaultValue: true },
  { key: "proveedor", label: "Proveedor", type: "text" },
  { key: "notas", label: "Notas", type: "text" },
];

export default function GastosFijosPage() {
  return (
    <div>
      <PageHeader
        title="Gastos fijos mensuales"
        subtitle="Gastos que se repiten cada mes (arriendos, suscripciones, salarios, servicios). Marca Activo para incluirlos en el resumen."
      />
      <DataTable table="gastos_fijos" columns={columns} orderBy="concepto" ascending={true} />
    </div>
  );
}
