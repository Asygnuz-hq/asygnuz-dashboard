import { PageHeader } from "@/components/PageHeader";
import { DataTable } from "@/components/data-table/DataTable";
import type { ColumnDef } from "@/components/data-table/types";
import { ESTADOS_CLIENTE } from "@/lib/catalogs";

const columns: ColumnDef[] = [
  { key: "nombre", label: "Cliente", type: "text", required: true },
  { key: "tipo", label: "Tipo", type: "text" },
  { key: "estado", label: "Estado", type: "select", options: ESTADOS_CLIENTE, defaultValue: "Activo" },
  { key: "fecha_inicio", label: "Fecha Inicio", type: "date" },
  { key: "contacto", label: "Contacto", type: "text" },
  { key: "notas", label: "Notas", type: "text" },
];

export default function ClientesPage() {
  return (
    <div>
      <PageHeader
        title="Clientes"
        subtitle="Tu lista maestra de clientes. Haz clic en 'Ver' para su ficha completa: ingresos, cobros y actividades."
      />
      <DataTable
        table="clientes"
        columns={columns}
        orderBy="nombre"
        ascending
        hasCreatedBy
        detailBasePath="/clientes"
      />
    </div>
  );
}
