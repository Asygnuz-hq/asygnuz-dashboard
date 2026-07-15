import { PageHeader } from "@/components/PageHeader";
import { DataTable } from "@/components/data-table/DataTable";
import type { ColumnDef } from "@/components/data-table/types";
import { ESTADOS_TAREA, TIPOS_PIEZA } from "@/lib/catalogs";

const disenadoresColumns: ColumnDef[] = [
  { key: "nombre", label: "Nombre", type: "text", required: true },
  { key: "activo", label: "Activo", type: "boolean", defaultValue: true },
];

const tareasColumns: ColumnDef[] = [
  {
    key: "disenador_id",
    label: "Diseñador",
    type: "foreign-select",
    required: true,
    foreignKey: { table: "disenadores", valueField: "id", labelField: "nombre" },
  },
  {
    key: "cliente_id",
    label: "Cliente",
    type: "foreign-select",
    foreignKey: { table: "clientes", valueField: "id", labelField: "nombre" },
  },
  { key: "mes", label: "Mes", type: "month", required: true },
  { key: "proyecto_tarea", label: "Proyecto / Tarea", type: "text", required: true },
  { key: "tipo", label: "Tipo", type: "select", options: TIPOS_PIEZA },
  { key: "piezas_entregadas", label: "Piezas Entregadas", type: "number" },
  { key: "revisiones", label: "Revisiones", type: "number" },
  { key: "fecha_limite", label: "Fecha Límite", type: "date" },
  { key: "fecha_entregada", label: "Fecha Entregada", type: "date" },
  { key: "estado", label: "Estado", type: "select", options: ESTADOS_TAREA, defaultValue: "Pendiente" },
  { key: "tarifa_cop", label: "Tarifa (COP)", type: "number" },
  { key: "total_cop", label: "Total (COP)", type: "readonly-cop" },
  { key: "calificacion", label: "Calificación (1-5)", type: "number" },
  { key: "aprobado", label: "¿Aprobado?", type: "boolean" },
  { key: "notas", label: "Notas", type: "text" },
];

export default function ControlMensualPage() {
  return (
    <div className="flex flex-col gap-8">
      <div>
        <PageHeader title="Diseñadores" subtitle="Agrega o desactiva diseñadores del equipo." />
        <DataTable table="disenadores" columns={disenadoresColumns} orderBy="nombre" ascending hasCreatedBy={false} />
      </div>

      <div>
        <PageHeader title="Control mensual de tareas" subtitle="Registra cada pieza entregada por diseñador." />
        <DataTable table="control_mensual_tareas" columns={tareasColumns} monthFilterKey="mes" orderBy="mes" ascending={false} />
      </div>
    </div>
  );
}
