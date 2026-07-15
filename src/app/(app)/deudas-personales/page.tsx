import { PageHeader } from "@/components/PageHeader";
import { DataTable } from "@/components/data-table/DataTable";
import type { ColumnDef } from "@/components/data-table/types";
import { MONEDAS } from "@/lib/catalogs";

const columns: ColumnDef[] = [
  {
    key: "acreedor",
    label: "A quién le deben",
    type: "select",
    options: ["Juan Manuel", "Pablo", "Andres"],
    required: true,
  },
  { key: "deudor", label: "Quién debe", type: "text", required: true },
  { key: "monto", label: "Monto", type: "number" },
  { key: "moneda", label: "Moneda", type: "select", options: MONEDAS, defaultValue: "COP" },
  { key: "fecha", label: "Fecha", type: "date" },
  { key: "estado", label: "Estado", type: "select", options: ["Pendiente", "Pagado"], defaultValue: "Pendiente" },
  { key: "notas", label: "Notas", type: "text" },
];

export default function DeudasPersonalesPage() {
  return (
    <div>
      <PageHeader title="Deudas personales" subtitle="Quién le debe a quién entre los socios (incluye deudas de Asygnuz como entidad)." />
      <DataTable table="deudas_personales" columns={columns} orderBy="acreedor" ascending />
    </div>
  );
}
