"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { KpiCard } from "@/components/KpiCard";
import { DataTable } from "@/components/data-table/DataTable";
import type { ColumnDef } from "@/components/data-table/types";
import { formatCOP, formatMonth } from "@/lib/format";
import { MONEDAS } from "@/lib/catalogs";

const columns: ColumnDef[] = [
  { key: "nombre", label: "Nombre", type: "text", required: true },
  { key: "rol", label: "Rol", type: "text" },
  { key: "moneda", label: "Moneda", type: "select", options: MONEDAS, defaultValue: "COP" },
  { key: "costo_mensual", label: "Costo Mensual", type: "number", required: true },
  { key: "trm_aplicada", label: "TRM aplicada", type: "number" },
  { key: "costo_mensual_cop", label: "Costo Mensual COP", type: "readonly-cop" },
  { key: "activo", label: "Activo", type: "boolean", defaultValue: true },
  { key: "fecha_ingreso", label: "Fecha Ingreso", type: "date" },
  { key: "notas", label: "Notas", type: "text" },
];

type CostoEquipo = {
  mes: string;
  costo_fijo_cop: number;
  costo_disenadores_cop: number;
  costo_total_cop: number;
};

export default function EquipoPage() {
  const [costo, setCosto] = useState<CostoEquipo | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase.from("v_costo_equipo_mes").select("*").maybeSingle();
    setCosto(data as CostoEquipo | null);
    setLoading(false);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Equipo / RRHH"
        subtitle="Personal de costo fijo. Los diseñadores por pieza se suman automático desde Control Mensual."
      />

      {!loading && costo && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <KpiCard label="Mes activo" value={formatMonth(costo.mes)} />
          <KpiCard label="Costo fijo (equipo)" value={formatCOP(costo.costo_fijo_cop)} count={costo.costo_fijo_cop} formatCount={formatCOP} />
          <KpiCard label="Costo diseñadores (por pieza)" value={formatCOP(costo.costo_disenadores_cop)} count={costo.costo_disenadores_cop} formatCount={formatCOP} />
          <KpiCard label="Costo total de equipo" value={formatCOP(costo.costo_total_cop)} count={costo.costo_total_cop} formatCount={formatCOP} />
        </div>
      )}

      <DataTable table="equipo" columns={columns} orderBy="nombre" ascending onChange={load} />
    </div>
  );
}
