"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { KpiCard } from "@/components/KpiCard";
import { DataTable } from "@/components/data-table/DataTable";
import type { ColumnDef } from "@/components/data-table/types";
import { formatCOP, formatPercent } from "@/lib/format";
import { PLATAFORMAS_MARKETING, TIPOS_RESULTADO_MARKETING, ESTADOS_CAMPANA, MONEDAS } from "@/lib/catalogs";

const columns: ColumnDef[] = [
  { key: "nombre", label: "Campaña", type: "text", required: true },
  { key: "plataforma", label: "Plataforma", type: "select", options: PLATAFORMAS_MARKETING, defaultValue: "Meta Ads" },
  { key: "fecha_inicio", label: "Fecha Inicio", type: "date" },
  { key: "fecha_fin", label: "Fecha Fin", type: "date" },
  { key: "moneda", label: "Moneda", type: "select", options: MONEDAS, defaultValue: "COP" },
  { key: "inversion", label: "Inversión", type: "number", required: true },
  { key: "trm_aplicada", label: "TRM aplicada", type: "number" },
  { key: "inversion_cop", label: "Inversión COP", type: "readonly-cop" },
  { key: "resultado_tipo", label: "Resultado", type: "select", options: TIPOS_RESULTADO_MARKETING, defaultValue: "Leads" },
  { key: "resultado_cantidad", label: "Cantidad Resultado", type: "number" },
  { key: "ingresos_generados_cop", label: "Ingresos Generados COP", type: "number" },
  { key: "estado", label: "Estado", type: "select", options: ESTADOS_CAMPANA, defaultValue: "Activa" },
  { key: "notas", label: "Notas", type: "text" },
];

type Resumen = { inversion_cop: number; roi_pct: number | null };

export default function MarketingPage() {
  const [resumen, setResumen] = useState<Resumen[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase.from("v_roi_campanas").select("inversion_cop, roi_pct");
    setResumen((data as Resumen[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  const totalInvertido = resumen.reduce((sum, r) => sum + (r.inversion_cop ?? 0), 0);
  const roiValidos = resumen.filter((r) => r.roi_pct !== null).map((r) => r.roi_pct as number);
  const roiPromedio = roiValidos.length > 0 ? roiValidos.reduce((a, b) => a + b, 0) / roiValidos.length : null;

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Marketing"
        subtitle="Registra cada campaña, lo que invertiste y lo que trajo de vuelta. El ROI se calcula solo."
      />

      {!loading && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 max-w-2xl">
          <KpiCard label="Total invertido" value={formatCOP(totalInvertido)} />
          <KpiCard label="Campañas registradas" value={String(resumen.length)} />
          <KpiCard label="ROI promedio" value={roiPromedio !== null ? formatPercent(roiPromedio) : "-"} />
        </div>
      )}

      <DataTable
        table="campanas_marketing"
        columns={columns}
        orderBy="fecha_inicio"
        ascending={false}
        onChange={load}
      />
    </div>
  );
}
