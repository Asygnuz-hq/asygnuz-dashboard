"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { KpiCard } from "@/components/KpiCard";
import { DataTable } from "@/components/data-table/DataTable";
import type { ColumnDef } from "@/components/data-table/types";
import { formatCOP } from "@/lib/format";
import { ESTADOS_TAREA, TIPOS_PIEZA } from "@/lib/catalogs";

type Disenador = { id: string; nombre: string; activo: boolean };
type Tarea = {
  piezas_entregadas: number | null;
  total_cop: number | null;
  calificacion: number | null;
  estado: string;
};

const tareaColumns: ColumnDef[] = [
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

export default function DisenadorDetailPage() {
  const params = useParams<{ id: string }>();
  const disenadorId = params.id;
  const [disenador, setDisenador] = useState<Disenador | null>(null);
  const [tareas, setTareas] = useState<Tarea[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const supabase = createClient();
    const [{ data: d }, { data: t }] = await Promise.all([
      supabase.from("disenadores").select("*").eq("id", disenadorId).single(),
      supabase
        .from("control_mensual_tareas")
        .select("piezas_entregadas, total_cop, calificacion, estado")
        .eq("disenador_id", disenadorId),
    ]);
    setDisenador(d as Disenador);
    setTareas((t as Tarea[]) ?? []);
    setLoading(false);
  }, [disenadorId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  if (loading) return <p className="text-muted">Cargando...</p>;
  if (!disenador) return <p className="text-danger">Diseñador no encontrado.</p>;

  const totalPagado = tareas.reduce((sum, t) => sum + (t.total_cop ?? 0), 0);
  const totalPiezas = tareas.reduce((sum, t) => sum + (t.piezas_entregadas ?? 0), 0);
  const calificaciones = tareas.map((t) => t.calificacion).filter((c): c is number => c !== null);
  const calificacionProm = calificaciones.length > 0 ? calificaciones.reduce((a, b) => a + b, 0) / calificaciones.length : null;
  const aprobadas = tareas.filter((t) => t.estado === "Aprobado").length;
  const pctAprobadas = tareas.length > 0 ? aprobadas / tareas.length : null;

  return (
    <div className="flex flex-col gap-8">
      <PageHeader title={disenador.nombre} subtitle={disenador.activo ? "Activo" : "Inactivo"} />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard label="Total histórico pagado" value={formatCOP(totalPagado)} />
        <KpiCard label="Piezas entregadas" value={String(totalPiezas)} />
        <KpiCard label="Calificación promedio" value={calificacionProm !== null ? calificacionProm.toFixed(1) : "-"} />
        <KpiCard label="% Aprobadas" value={pctAprobadas !== null ? `${(pctAprobadas * 100).toFixed(0)}%` : "-"} />
      </div>

      <div>
        <h2 className="text-sm font-semibold mb-3">Tareas de {disenador.nombre}</h2>
        <DataTable
          table="control_mensual_tareas"
          columns={tareaColumns}
          filters={[{ column: "disenador_id", value: disenadorId }]}
          fixedValues={{ disenador_id: disenadorId }}
          monthFilterKey="mes"
          orderBy="mes"
          ascending={false}
          onChange={load}
        />
      </div>
    </div>
  );
}
