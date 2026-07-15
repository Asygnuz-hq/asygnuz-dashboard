import { PageHeader } from "@/components/PageHeader";
import { DataTable } from "@/components/data-table/DataTable";
import type { ColumnDef } from "@/components/data-table/types";
import { MONEDAS } from "@/lib/catalogs";

const columns: ColumnDef[] = [
  { key: "fecha", label: "Fecha", type: "date", required: true },
  { key: "causa_proyecto", label: "Causa / Proyecto", type: "text", required: true },
  { key: "beneficiario", label: "Beneficiario", type: "text" },
  { key: "descripcion", label: "Descripción", type: "text" },
  { key: "moneda", label: "Moneda", type: "select", options: MONEDAS, required: true, defaultValue: "COP" },
  { key: "monto", label: "Monto", type: "number" },
  { key: "trm_aplicada", label: "TRM aplicada", type: "number" },
  { key: "monto_cop", label: "Equiv. COP", type: "readonly-cop" },
  { key: "estado", label: "Estado", type: "select", options: ["Comprometido", "Pagado"], defaultValue: "Comprometido" },
  { key: "fecha_pago", label: "Fecha Pago", type: "date" },
];

export default function FundacionPage() {
  return (
    <div>
      <PageHeader
        title="Fundación — donaciones"
        subtitle="Comprometido = intención confirmada · Pagado = desembolsado."
      />
      <DataTable table="fundacion_donaciones" columns={columns} orderBy="fecha" ascending={false} />
    </div>
  );
}
