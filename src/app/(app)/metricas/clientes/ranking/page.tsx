"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import type { ResumenCliente } from "@/app/api/meta/resumen/route";

function numero(valor: number): string {
  return new Intl.NumberFormat("es-CO", { maximumFractionDigits: 0 }).format(valor);
}

// Cada cuenta de anuncios tiene su propia moneda real (Meta no siempre
// usa USD) — se muestra la de cada cliente, no una fija.
function moneda(valor: number, codigoMoneda: string): string {
  return new Intl.NumberFormat("es-CO", { style: "currency", currency: codigoMoneda, maximumFractionDigits: 2 }).format(
    valor
  );
}

type Orden = "tasa" | "alcance" | "gasto";

export default function RankingClientesPage() {
  const [resumenes, setResumenes] = useState<ResumenCliente[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [orden, setOrden] = useState<Orden>("tasa");

  useEffect(() => {
    fetch("/api/meta/resumen")
      .then((res) => res.json().then((data) => ({ res, data })))
      .then(({ res, data }) => {
        if (!res.ok) throw new Error(data.error);
        setResumenes(data.resumenes);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Error desconocido"));
  }, []);

  const ordenados = resumenes
    ? [...resumenes].sort((a, b) => {
        if (orden === "tasa") return (b.tasaInteraccionPromedio ?? -1) - (a.tasaInteraccionPromedio ?? -1);
        if (orden === "alcance")
          return b.alcanceAnuncios + b.alcanceInstagram - (a.alcanceAnuncios + a.alcanceInstagram);
        return b.gastoAnuncios - a.gastoAnuncios;
      })
    : [];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Ranking entre Clientes"
        subtitle="Compara a todos tus clientes conectados de un vistazo — anuncios e Instagram."
      />

      <div className="flex items-center gap-2">
        <span className="text-xs text-muted uppercase tracking-wide">Ordenar por</span>
        {(
          [
            ["tasa", "Tasa de interacción"],
            ["alcance", "Alcance total"],
            ["gasto", "Inversión en anuncios"],
          ] as [Orden, string][]
        ).map(([valor, label]) => (
          <button
            key={valor}
            onClick={() => setOrden(valor)}
            className={`text-xs rounded-md px-3 py-1.5 font-medium ${
              orden === valor ? "bg-accent text-accent-foreground" : "bg-surface-alt hover:bg-surface"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {error && <p className="text-sm text-danger">{error}</p>}
      {!error && !resumenes && <p className="text-sm text-muted">Consultando Meta para cada cliente… puede tardar un momento.</p>}
      {resumenes && resumenes.length === 0 && (
        <p className="text-sm text-muted">
          No hay clientes conectados todavía. <Link href="/metricas/clientes" className="underline">Conecta uno aquí</Link>.
        </p>
      )}

      {ordenados.some((r) => r.tieneAnuncios && r.monedaAnuncios !== "USD") && orden === "gasto" && (
        <p className="text-xs text-muted">
          Ojo: algunos clientes manejan su cuenta de anuncios en una moneda distinta a otros (ej. pesos vs.
          dólares) — este orden compara los números tal cual, sin convertir a una sola moneda.
        </p>
      )}

      {ordenados.length > 0 && (
        <div className="overflow-x-auto glass rounded-2xl">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-muted border-b border-border">
                <th className="p-3">#</th>
                <th className="p-3">Cliente</th>
                <th className="p-3 text-right">Inversión anuncios</th>
                <th className="p-3 text-right">Alcance anuncios</th>
                <th className="p-3 text-right">Publicaciones IG</th>
                <th className="p-3 text-right">Alcance IG</th>
                <th className="p-3 text-right">Interacciones IG</th>
                <th className="p-3 text-right">Tasa de interacción</th>
              </tr>
            </thead>
            <tbody>
              {ordenados.map((r, i) => (
                <tr key={r.id} className="border-b border-border last:border-0">
                  <td className="p-3 text-muted">{i + 1}</td>
                  <td className="p-3">
                    <Link href="/metricas/clientes" className="font-medium hover:underline">
                      {r.cliente_nombre}
                    </Link>
                    {r.error && <p className="text-xs text-danger mt-0.5">{r.error}</p>}
                  </td>
                  <td className="p-3 text-right">
                    {r.tieneAnuncios ? moneda(r.gastoAnuncios, r.monedaAnuncios) : "—"}
                  </td>
                  <td className="p-3 text-right">{r.tieneAnuncios ? numero(r.alcanceAnuncios) : "—"}</td>
                  <td className="p-3 text-right">{r.tieneInstagram ? numero(r.publicaciones) : "—"}</td>
                  <td className="p-3 text-right">{r.tieneInstagram ? numero(r.alcanceInstagram) : "—"}</td>
                  <td className="p-3 text-right">{r.tieneInstagram ? numero(r.interaccionesInstagram) : "—"}</td>
                  <td className="p-3 text-right font-medium">
                    {r.tasaInteraccionPromedio !== null ? `${r.tasaInteraccionPromedio.toFixed(1)}%` : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
