"use client";

import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { useMetricas } from "@/lib/kaneo/useMetricas";
import type { MetricasKaneo } from "@/lib/kaneo/metrics";

const ESTADO_COLOR: Record<string, string> = {
  "to-do": "bg-muted",
  "in-progress": "bg-accent-bright",
  "in-review": "bg-amber-500",
  done: "bg-emerald-500",
};

function EstadoBadge({ estado }: { estado: string }) {
  return <span className={`inline-block h-2 w-2 rounded-full shrink-0 ${ESTADO_COLOR[estado] ?? "bg-muted"}`} />;
}

function descargarCSV(metricas: MetricasKaneo) {
  const filas = [["Proyecto", "Frente", "Total tareas", "Completadas", "Atrasadas", "% avance"]];
  metricas.porProyecto.forEach((p) => {
    filas.push([p.nombre, p.frente, String(p.totalTareas), String(p.completadas), String(p.atrasadas), `${(p.pctAvance * 100).toFixed(1)}%`]);
  });
  filas.push([]);
  filas.push(["Persona", "Activas", "Atrasadas", "Completadas"]);
  metricas.porPersona.forEach((p) => {
    filas.push([p.nombre, String(p.activas), String(p.atrasadas), String(p.completadas)]);
  });

  const csv = filas.map((fila) => fila.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `asygnuz-reporte-kaneo-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function ReportePage() {
  const { metricas, error, loading } = useMetricas();
  const fecha = new Date().toLocaleDateString("es-CO", { year: "numeric", month: "long", day: "numeric" });

  return (
    <div className="flex flex-col gap-6">
      <div className="print:hidden flex items-center justify-between">
        <PageHeader title="Reporte para junta" subtitle="Vista consolidada, lista para descargar." />
        <div className="flex gap-2">
          <Link href="/metricas" className="text-sm rounded-md border border-border px-3 py-1.5 hover:bg-surface-alt">
            ← Vista ejecutiva
          </Link>
          <button
            onClick={() => metricas && descargarCSV(metricas)}
            disabled={!metricas}
            className="text-sm rounded-md border border-border px-3 py-1.5 hover:bg-surface-alt disabled:opacity-50"
          >
            Descargar CSV
          </button>
          <button
            onClick={() => window.print()}
            disabled={!metricas}
            className="text-sm rounded-md bg-accent text-accent-foreground px-3 py-1.5 hover:bg-accent-bright disabled:opacity-50"
          >
            Descargar PDF
          </button>
        </div>
      </div>

      {loading && <p className="text-sm text-muted print:hidden">Cargando…</p>}
      {error && <p className="text-sm text-danger print:hidden">{error}</p>}

      {metricas && (
        <div className="flex flex-col gap-8 print:text-black">
          {/* Encabezado solo visible al imprimir: el sidebar/logo del panel no sale en el PDF */}
          <div className="hidden print:flex items-center gap-3 pb-4 border-b border-border">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt="Asygnuz" className="h-8 w-auto" />
            <div>
              <p className="font-bold">Reporte operativo — ASYGNUZ</p>
              <p className="text-sm text-muted">Generado el {fecha}</p>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-4 print:grid-cols-4">
            {[
              ["Tareas activas", metricas.totalActivas],
              ["Avance global", `${((metricas.totalCompletadas / Math.max(metricas.totalTareas, 1)) * 100).toFixed(0)}%`],
              ["Atrasadas", metricas.totalAtrasadas],
              ["Sin asignar", metricas.sinAsignar],
            ].map(([label, value]) => (
              <div key={label as string} className="rounded-lg border border-border p-3 print:border-black/20">
                <p className="text-xs uppercase tracking-wide text-muted">{label}</p>
                <p className="text-xl font-bold">{value}</p>
              </div>
            ))}
          </div>

          <div>
            <h2 className="text-sm font-semibold text-muted uppercase tracking-wide mb-2">Por frente</h2>
            <table className="w-full text-sm border border-border print:border-black/20">
              <thead className="bg-surface-alt print:bg-transparent">
                <tr>
                  <th className="text-left px-3 py-2 border-b border-border">Frente</th>
                  <th className="text-right px-3 py-2 border-b border-border">Total</th>
                  <th className="text-right px-3 py-2 border-b border-border">Activas</th>
                  <th className="text-right px-3 py-2 border-b border-border">Completadas</th>
                  <th className="text-right px-3 py-2 border-b border-border">Atrasadas</th>
                </tr>
              </thead>
              <tbody>
                {metricas.porFrente.map((f) => (
                  <tr key={f.frente}>
                    <td className="px-3 py-1.5">{f.frente}</td>
                    <td className="px-3 py-1.5 text-right">{f.total}</td>
                    <td className="px-3 py-1.5 text-right">{f.activas}</td>
                    <td className="px-3 py-1.5 text-right">{f.completadas}</td>
                    <td className="px-3 py-1.5 text-right">{f.atrasadas}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div>
            <h2 className="text-sm font-semibold text-muted uppercase tracking-wide mb-2">Por proyecto</h2>
            <table className="w-full text-sm border border-border print:border-black/20">
              <thead className="bg-surface-alt print:bg-transparent">
                <tr>
                  <th className="text-left px-3 py-2 border-b border-border">Proyecto</th>
                  <th className="text-left px-3 py-2 border-b border-border">Frente</th>
                  <th className="text-right px-3 py-2 border-b border-border">Total</th>
                  <th className="text-right px-3 py-2 border-b border-border">Avance</th>
                  <th className="text-right px-3 py-2 border-b border-border">Atrasadas</th>
                </tr>
              </thead>
              <tbody>
                {metricas.porProyecto.map((p) => (
                  <tr key={p.id}>
                    <td className="px-3 py-1.5">{p.nombre}</td>
                    <td className="px-3 py-1.5 text-muted">{p.frente}</td>
                    <td className="px-3 py-1.5 text-right">{p.totalTareas}</td>
                    <td className="px-3 py-1.5 text-right">{(p.pctAvance * 100).toFixed(0)}%</td>
                    <td className="px-3 py-1.5 text-right">{p.atrasadas}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {metricas.porProyecto.some((p) => p.epics.length > 0) && (
            <div>
              <h2 className="text-sm font-semibold text-muted uppercase tracking-wide mb-2">
                Detalle por proyecto — épicas y tareas
              </h2>
              <div className="flex flex-col gap-4">
                {metricas.porProyecto
                  .filter((p) => p.epics.length > 0)
                  .map((p) => (
                    <div key={p.id} className="break-inside-avoid rounded-lg border border-border p-3 print:border-black/20">
                      <p className="font-medium mb-2">
                        {p.nombre} <span className="text-muted font-normal">({p.frente})</span>
                      </p>
                      <div className="flex flex-col gap-3">
                        {p.epics.map((epic) => (
                          <div key={epic.id}>
                            <div className="flex items-center gap-2 text-sm">
                              <EstadoBadge estado={epic.estado} />
                              <span className="font-medium">{epic.titulo}</span>
                              <span className="text-xs text-muted">
                                ({epic.hijos.filter((h) => h.estado === "done").length}/{epic.hijos.length} listas)
                              </span>
                            </div>
                            <ul className="mt-1 ml-6 flex flex-col gap-1">
                              {epic.hijos.map((hijo) => (
                                <li key={hijo.id} className="flex items-center gap-2 text-xs text-muted">
                                  <EstadoBadge estado={hijo.estado} />
                                  <span>{hijo.titulo}</span>
                                  {hijo.asignado && <span>· {hijo.asignado}</span>}
                                </li>
                              ))}
                            </ul>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}

          <div className="break-inside-avoid">
            <h2 className="text-sm font-semibold text-muted uppercase tracking-wide mb-2">Carga por persona</h2>
            <table className="w-full text-sm border border-border print:border-black/20">
              <thead className="bg-surface-alt print:bg-transparent">
                <tr>
                  <th className="text-left px-3 py-2 border-b border-border">Persona</th>
                  <th className="text-right px-3 py-2 border-b border-border">Activas</th>
                  <th className="text-right px-3 py-2 border-b border-border">Atrasadas</th>
                  <th className="text-right px-3 py-2 border-b border-border">Completadas</th>
                </tr>
              </thead>
              <tbody>
                {metricas.porPersona.map((p) => (
                  <tr key={p.nombre}>
                    <td className="px-3 py-1.5">{p.nombre}</td>
                    <td className="px-3 py-1.5 text-right">{p.activas}</td>
                    <td className="px-3 py-1.5 text-right">{p.atrasadas}</td>
                    <td className="px-3 py-1.5 text-right">{p.completadas}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
