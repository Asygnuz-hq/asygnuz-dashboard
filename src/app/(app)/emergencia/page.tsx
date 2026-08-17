"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
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

const columnasInventario: ColumnDef[] = [
  { key: "item", label: "Item", type: "text", required: true },
  { key: "cantidad", label: "Cantidad", type: "number", required: true, defaultValue: 0 },
  { key: "unidad", label: "Unidad", type: "text", defaultValue: "unidades" },
  { key: "notas", label: "Notas", type: "text" },
];

type Caso = {
  id: string;
  nombre: string;
  necesidad: string;
  zona: string | null;
  estado: "Pendiente" | "Atendido";
  creado_en: string;
  atendido_en: string | null;
};

type ItemInventario = {
  id: string;
  item: string;
  cantidad: number;
  unidad: string;
};

function diasDesde(iso: string): number {
  return Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / (1000 * 60 * 60 * 24)));
}

// Cruce simple por palabras en común entre lo que pide el caso y el nombre
// del item en bodega ("agua" en necesidad ↔ "Agua embotellada" en bodega).
// No es IA, es una coincidencia de texto — funciona bien para esto y no
// depende de nada externo.
const PALABRAS_VACIAS = new Set(["de", "la", "el", "los", "las", "y", "para", "con", "en", "un", "una"]);

function palabrasClave(texto: string): string[] {
  return texto
    .toLowerCase()
    .replace(/[.,;:()]/g, " ")
    .split(/\s+/)
    .filter((p) => p.length > 2 && !PALABRAS_VACIAS.has(p));
}

function hayCoincidencia(necesidad: string, item: string): boolean {
  const palabrasNecesidad = palabrasClave(necesidad);
  const palabrasItem = palabrasClave(item);
  return palabrasNecesidad.some((pn) => palabrasItem.some((pi) => pi.includes(pn) || pn.includes(pi)));
}

export default function EmergenciaPage() {
  const [casos, setCasos] = useState<Caso[]>([]);
  const [inventario, setInventario] = useState<ItemInventario[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const supabase = createClient();
    const [{ data: c }, { data: i }] = await Promise.all([
      supabase
        .from("casos_emergencia")
        .select("id, nombre, necesidad, zona, estado, creado_en, atendido_en")
        .order("creado_en", { ascending: false }),
      supabase.from("inventario_emergencia").select("id, item, cantidad, unidad").order("item"),
    ]);
    setCasos((c as Caso[]) ?? []);
    setInventario((i as ItemInventario[]) ?? []);
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

  const sugerencias = useMemo(() => {
    const disponibles = inventario.filter((i) => i.cantidad > 0);
    return pendientes
      .flatMap((caso) =>
        disponibles
          .filter((item) => hayCoincidencia(caso.necesidad, item.item))
          .map((item) => ({ caso, item }))
      )
      .slice(0, 20);
  }, [pendientes, inventario]);

  return (
    <div className="flex flex-col gap-8">
      <PageHeader title="Emergencia — Casos del terremoto" subtitle="Seguimiento de personas atendidas y pendientes." />

      {loading ? (
        <p className="text-sm text-muted">Cargando…</p>
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
            <h2 className="text-sm font-semibold text-muted uppercase tracking-wide mb-3">
              Qué le podemos dar a quién — según lo que hay en bodega
            </h2>
            <div className="flex flex-col gap-2">
              {sugerencias.map(({ caso, item }, idx) => (
                <div
                  key={`${caso.id}-${item.id}-${idx}`}
                  className="rounded-lg border border-accent/40 bg-accent/5 p-3 flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <p className="text-sm">
                      <span className="font-medium">{caso.nombre}</span>{" "}
                      <span className="text-muted">necesita: {caso.necesidad}</span>
                    </p>
                    <p className="text-xs text-muted">{caso.zona || "Sin zona"}</p>
                  </div>
                  <span className="text-xs shrink-0 rounded-full bg-accent text-accent-foreground px-2.5 py-1">
                    Tienes {item.cantidad} {item.unidad} de {item.item}
                  </span>
                </div>
              ))}
              {sugerencias.length === 0 && (
                <p className="text-sm text-muted">
                  Sin coincidencias todavía entre lo pendiente y lo que hay en bodega.
                </p>
              )}
            </div>
          </div>

          <div>
            <h2 className="text-sm font-semibold text-muted uppercase tracking-wide mb-3">Bodega — lo que tenemos para repartir</h2>
            <DataTable table="inventario_emergencia" columns={columnasInventario} orderBy="item" ascending onChange={load} />
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
