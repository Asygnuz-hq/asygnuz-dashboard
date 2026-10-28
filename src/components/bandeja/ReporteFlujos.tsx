"use client";

import { useState, useEffect } from "react";

interface FilaReporte {
  flujo_id: string;
  flujo_nombre: string | null;
  media_id: string;
  disparos: number;
  dms_enviados: number;
  respuestas_publicas: number;
  errores: number;
  limites: number;
  clics: number;
}

function fechaIso(fecha: Date): string {
  return new Date(fecha.getTime() - 5 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

function tasa(clics: number, dms: number): string {
  return dms > 0 ? `${((clics / dms) * 100).toFixed(1)}%` : "—";
}

// Reporte por flujo y publicación de la cuenta seleccionada, con rango de fechas y CSV.
export function ReporteFlujos({ conexionId }: { conexionId: string }) {
  const [desde, setDesde] = useState(() => fechaIso(new Date(Date.now() - 29 * 86400000)));
  const [hasta, setHasta] = useState(() => fechaIso(new Date()));
  const [filas, setFilas] = useState<FilaReporte[]>([]);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const params = new URLSearchParams({ conexion_id: conexionId, desde, hasta });

  useEffect(() => {
    if (!conexionId || !desde || !hasta) return;
    let activo = true;
    async function cargar() {
      setCargando(true);
      setError(null);
      try {
        const res = await fetch(
          `/api/bandeja/reporte?${new URLSearchParams({ conexion_id: conexionId, desde, hasta })}`
        );
        const data = await res.json();
        if (!activo) return;
        if (!res.ok) {
          setError(data.error ?? "No se pudo cargar el reporte");
          setFilas([]);
        } else {
          setFilas(data.filas ?? []);
        }
      } catch {
        if (activo) setError("No se pudo cargar el reporte");
      } finally {
        if (activo) setCargando(false);
      }
    }
    cargar();
    return () => {
      activo = false;
    };
  }, [conexionId, desde, hasta]);

  const total = filas.reduce(
    (acc, f) => ({
      disparos: acc.disparos + f.disparos,
      dms: acc.dms + f.dms_enviados,
      publicas: acc.publicas + f.respuestas_publicas,
      errores: acc.errores + f.errores,
      limites: acc.limites + f.limites,
      clics: acc.clics + f.clics,
    }),
    { disparos: 0, dms: 0, publicas: 0, errores: 0, limites: 0, clics: 0 }
  );

  return (
    <div className="glass rounded-2xl p-5 border border-border flex flex-col gap-4">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div className="flex items-end gap-3 flex-wrap">
          <label className="flex flex-col gap-1 text-xs font-semibold text-muted">
            Desde
            <input
              type="date"
              value={desde}
              max={hasta}
              onChange={(e) => setDesde(e.target.value)}
              className="px-3 py-1.5 text-xs rounded-xl bg-surface-alt border border-border text-foreground focus:outline-none"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs font-semibold text-muted">
            Hasta
            <input
              type="date"
              value={hasta}
              min={desde}
              onChange={(e) => setHasta(e.target.value)}
              className="px-3 py-1.5 text-xs rounded-xl bg-surface-alt border border-border text-foreground focus:outline-none"
            />
          </label>
        </div>
        <a
          href={`/api/bandeja/reporte?${params}&formato=csv`}
          className="px-4 py-2 text-xs font-semibold rounded-xl bg-foreground text-background hover:opacity-90 transition-all text-center"
        >
          Descargar CSV
        </a>
      </div>

      {error && <p className="text-xs text-red-400">{error}</p>}

      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-left text-muted border-b border-border">
              <th className="py-2 pr-3 font-semibold">Flujo</th>
              <th className="py-2 pr-3 font-semibold">Publicación</th>
              <th className="py-2 pr-3 font-semibold text-right">Disparos</th>
              <th className="py-2 pr-3 font-semibold text-right">DMs</th>
              <th className="py-2 pr-3 font-semibold text-right">Públicas</th>
              <th className="py-2 pr-3 font-semibold text-right">Errores</th>
              <th className="py-2 pr-3 font-semibold text-right">Límites</th>
              <th className="py-2 pr-3 font-semibold text-right">Clics</th>
              <th className="py-2 font-semibold text-right">Tasa de clic</th>
            </tr>
          </thead>
          <tbody>
            {filas.map((f) => (
              <tr key={`${f.flujo_id}-${f.media_id}`} className="border-b border-border/50 text-foreground">
                <td className="py-2 pr-3">{f.flujo_nombre ?? "(flujo eliminado)"}</td>
                <td className="py-2 pr-3 text-muted">{f.media_id || "Sin publicación"}</td>
                <td className="py-2 pr-3 text-right">{f.disparos}</td>
                <td className="py-2 pr-3 text-right">{f.dms_enviados}</td>
                <td className="py-2 pr-3 text-right">{f.respuestas_publicas}</td>
                <td className="py-2 pr-3 text-right">{f.errores}</td>
                <td className="py-2 pr-3 text-right">{f.limites}</td>
                <td className="py-2 pr-3 text-right">{f.clics}</td>
                <td className="py-2 text-right">{tasa(f.clics, f.dms_enviados)}</td>
              </tr>
            ))}
            {filas.length > 0 && (
              <tr className="font-bold text-foreground">
                <td className="py-2 pr-3" colSpan={2}>Total</td>
                <td className="py-2 pr-3 text-right">{total.disparos}</td>
                <td className="py-2 pr-3 text-right">{total.dms}</td>
                <td className="py-2 pr-3 text-right">{total.publicas}</td>
                <td className="py-2 pr-3 text-right">{total.errores}</td>
                <td className="py-2 pr-3 text-right">{total.limites}</td>
                <td className="py-2 pr-3 text-right">{total.clics}</td>
                <td className="py-2 text-right">{tasa(total.clics, total.dms)}</td>
              </tr>
            )}
          </tbody>
        </table>
        {!cargando && filas.length === 0 && !error && (
          <p className="py-6 text-center text-xs text-muted">Sin actividad de flujos en este rango.</p>
        )}
        {cargando && <p className="py-6 text-center text-xs text-muted">Cargando reporte...</p>}
      </div>
    </div>
  );
}
