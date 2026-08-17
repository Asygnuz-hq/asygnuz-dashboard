"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { KpiCard } from "@/components/KpiCard";
import { DataTable } from "@/components/data-table/DataTable";
import type { ColumnDef } from "@/components/data-table/types";

const columns: ColumnDef[] = [
  { key: "nombre", label: "Nombre", type: "text", required: true },
  { key: "necesidad", label: "Necesidad", type: "text", required: true },
  { key: "zona", label: "Zona", type: "text" },
  { key: "ubicacion_detalle", label: "Ubicación (detalle)", type: "text" },
  { key: "estado", label: "Estado", type: "select", options: ["Pendiente", "Atendido"], defaultValue: "Pendiente" },
  { key: "fuente", label: "Fuente", type: "text", defaultValue: "Manual" },
  { key: "notas", label: "Notas", type: "text" },
];

type Caso = {
  id: string;
  nombre: string;
  zona: string | null;
  estado: "Pendiente" | "Atendido";
  creado_en: string;
  atendido_en: string | null;
};

function diasDesde(iso: string): number {
  return Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / (1000 * 60 * 60 * 24)));
}

export default function EmergenciaPage() {
  const [casos, setCasos] = useState<Caso[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from("casos_emergencia")
      .select("id, nombre, zona, estado, creado_en, atendido_en")
      .order("creado_en", { ascending: false });
    setCasos((data as Caso[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const total = casos.length;
  const pendientes = casos.filter((c) => c.estado === "Pendiente");
  const atendidos = casos.filter((c) => c.estado === "Atendido");
  const pctAtendido = total > 0 ? atendidos.length / total : 0;

  const diasPendientes = pendientes.map((c) => diasDesde(c.creado_en));
  const promedioSinAtender =
    diasPendientes.length > 0 ? diasPendientes.reduce((a, b) => a + b, 0) / diasPendientes.length : 0;
  const masAntiguoSinAtender = diasPendientes.length > 0 ? Math.max(...diasPendientes) : 0;

  const zonaMap = new Map<string, { total: number; pendientes: number }>();
  for (const c of casos) {
    const zona = c.zona?.trim() || "Sin zona";
    const acc = zonaMap.get(zona) ?? { total: 0, pendientes: 0 };
    acc.total += 1;
    if (c.estado === "Pendiente") acc.pendientes += 1;
    zonaMap.set(zona, acc);
  }
  const porZona = Array.from(zonaMap.entries())
    .map(([zona, v]) => ({ zona, ...v }))
    .sort((a, b) => b.total - a.total);

  return (
    <div className="flex flex-col gap-8">
      <PageHeader title="Emergencia — Casos del terremoto" subtitle="Seguimiento de personas atendidas y pendientes." />

      {loading ? (
        <p className="text-sm text-muted">Cargando casos…</p>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <KpiCard label="Casos activos" value={String(total)} />
            <KpiCard label="Pendientes" value={String(pendientes.length)} hint="Sin atender todavía" />
            <KpiCard label="Atendidos" value={`${(pctAtendido * 100).toFixed(0)}%`} hint={`${atendidos.length} de ${total}`} />
            <KpiCard
              label="Tiempo sin atender"
              value={promedioSinAtender < 1 ? "< 1 día" : `${promedioSinAtender.toFixed(1)} días`}
              hint={masAntiguoSinAtender > 0 ? `el más antiguo lleva ${masAntiguoSinAtender}d` : undefined}
            />
          </div>

          <div>
            <h2 className="text-sm font-semibold text-muted uppercase tracking-wide mb-3">Por zona</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {porZona.map((z) => (
                <div key={z.zona} className="rounded-lg border border-border bg-surface p-3 flex items-center justify-between">
                  <span className="text-sm">{z.zona}</span>
                  <span className="text-sm text-muted">
                    {z.total} <span className="text-danger">{z.pendientes > 0 ? `· ${z.pendientes} pendientes` : ""}</span>
                  </span>
                </div>
              ))}
              {porZona.length === 0 && <p className="text-sm text-muted">Sin casos todavía.</p>}
            </div>
          </div>

          <div>
            <h2 className="text-sm font-semibold text-muted uppercase tracking-wide mb-3">Casos</h2>
            <DataTable table="casos_emergencia" columns={columns} orderBy="creado_en" ascending={false} onChange={load} />
          </div>
        </>
      )}
    </div>
  );
}
