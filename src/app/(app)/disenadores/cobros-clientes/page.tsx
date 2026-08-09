import { PageHeader } from "@/components/PageHeader";
import { ReadOnlyTable } from "@/components/data-table/ReadOnlyTable";
import type { ColumnDef } from "@/components/data-table/types";

const columns: ColumnDef[] = [
  { key: "cliente", label: "Cliente", type: "text" },
  { key: "mes", label: "Mes", type: "month" },
  { key: "proyecto_pieza", label: "Proyecto / Pieza", type: "text" },
  { key: "tipo", label: "Tipo", type: "text" },
  { key: "piezas_cobradas", label: "Piezas Cobradas", type: "readonly-number" },
  { key: "tarifa_unit_usd", label: "Tarifa Unit. USD", type: "readonly-number" },
  { key: "total_cobrado_usd", label: "Total Cobrado USD", type: "readonly-usd" },
  { key: "estado_cobro", label: "Estado Cobro", type: "text" },
];

export default function CobrosClientesPage() {
  return (
    <div>
      <PageHeader
        title="Cobros a clientes por diseño (histórico)"
        subtitle="Este módulo quedó reemplazado por Ingresos (tipo 'Piezas adicionales'), donde sí se ve en el Dashboard y en pendientes por cobrar. Esto queda solo de consulta, ya no se agregan filas nuevas aquí."
      />
      <ReadOnlyTable source="cobros_clientes" columns={columns} orderBy="mes" ascending={false} />
    </div>
  );
}
