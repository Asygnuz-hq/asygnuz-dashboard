"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { PageHeader } from "@/components/PageHeader";
import { KpiCard } from "@/components/KpiCard";
import type { MetaInsightRow } from "@/lib/meta/client";

type Conexion = {
  id: string;
  cliente_nombre: string;
  ad_account_id: string | null;
  instagram_business_id: string | null;
  token_expira_en: string | null;
};

const ACCION_LABEL: Record<string, string> = {
  "offsite_conversion.fb_pixel_lead": "Leads",
  onsite_conversion_messaging_conversation_started_7d: "Conversaciones",
  link_click: "Clics en el enlace",
  purchase: "Compras",
};

function numero(valor: string): string {
  return new Intl.NumberFormat("es-CO", { maximumFractionDigits: 0 }).format(Number(valor));
}

function moneda(valor: string): string {
  return new Intl.NumberFormat("es-CO", { style: "currency", currency: "USD", maximumFractionDigits: 2 }).format(
    Number(valor)
  );
}

export default function MetricasClientesPage() {
  const searchParams = useSearchParams();
  const [conexiones, setConexiones] = useState<Conexion[] | null>(null);
  const [errorLista, setErrorLista] = useState<string | null>(null);
  const [nuevoCliente, setNuevoCliente] = useState("");
  const [seleccionado, setSeleccionado] = useState<Conexion | null>(null);
  const [insights, setInsights] = useState<MetaInsightRow[] | null>(null);
  const [errorInsights, setErrorInsights] = useState<string | null>(null);
  const [cargandoInsights, setCargandoInsights] = useState(false);

  async function cargarConexiones() {
    try {
      const res = await fetch("/api/meta/conexiones");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setConexiones(data.conexiones);
    } catch (err) {
      setErrorLista(err instanceof Error ? err.message : "Error desconocido");
    }
  }

  useEffect(() => {
    cargarConexiones();
  }, []);

  async function verMetricas(conexion: Conexion) {
    setSeleccionado(conexion);
    setInsights(null);
    setErrorInsights(null);
    setCargandoInsights(true);
    try {
      const res = await fetch(`/api/meta/insights?conexion_id=${conexion.id}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setInsights(data.insights);
    } catch (err) {
      setErrorInsights(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setCargandoInsights(false);
    }
  }

  const conectado = searchParams.get("conectado");
  const errorConexion = searchParams.get("error");

  const totalGasto = insights?.reduce((acc, r) => acc + Number(r.spend), 0) ?? 0;
  const totalImpresiones = insights?.reduce((acc, r) => acc + Number(r.impressions), 0) ?? 0;
  const cpmPonderado = totalImpresiones ? (totalGasto / totalImpresiones) * 1000 : 0;

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Métricas por Cliente — Meta Ads"
        subtitle="Conecta la cuenta de anuncios de un cliente y consulta sus campañas sin salir del dashboard."
      />

      {conectado && (
        <p className="text-sm rounded-md border border-border bg-surface p-3 text-accent-bright">
          "{conectado}" quedó conectado correctamente.
        </p>
      )}
      {errorConexion && (
        <p className="text-sm rounded-md border border-border bg-surface p-3 text-danger">{errorConexion}</p>
      )}

      <div className="rounded-lg border border-border bg-surface p-4 flex items-end gap-3">
        <label className="flex flex-col gap-1 text-sm flex-1 max-w-sm">
          Nombre del cliente
          <input
            value={nuevoCliente}
            onChange={(e) => setNuevoCliente(e.target.value)}
            placeholder="Ej. MIA, Expo 2160..."
            className="w-full"
          />
        </label>
        <a
          href={nuevoCliente ? `/api/meta/connect?cliente=${encodeURIComponent(nuevoCliente)}` : "#"}
          aria-disabled={!nuevoCliente}
          className={`text-sm rounded-md px-4 py-2 font-medium ${
            nuevoCliente
              ? "bg-accent text-accent-foreground"
              : "bg-surface-alt text-muted pointer-events-none"
          }`}
        >
          Conectar cliente
        </a>
      </div>

      <div>
        <h2 className="text-sm font-semibold text-muted uppercase tracking-wide mb-3">Clientes conectados</h2>
        {errorLista && <p className="text-sm text-danger">{errorLista}</p>}
        {conexiones && conexiones.length === 0 && (
          <p className="text-sm text-muted">Todavía no has conectado ningún cliente.</p>
        )}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {conexiones?.map((c) => (
            <button
              key={c.id}
              onClick={() => verMetricas(c)}
              className={`text-left rounded-lg border p-4 hover:bg-surface-alt transition ${
                seleccionado?.id === c.id ? "border-accent" : "border-border"
              } bg-surface`}
            >
              <p className="font-medium">{c.cliente_nombre}</p>
              <p className="text-xs text-muted mt-1">
                {c.ad_account_id ?? "sin cuenta de anuncios"}
                {c.instagram_business_id && " · IG conectado"}
              </p>
            </button>
          ))}
        </div>
      </div>

      {seleccionado && (
        <div className="flex flex-col gap-4 pt-4 border-t border-border">
          <h2 className="text-lg font-semibold">{seleccionado.cliente_nombre} — últimos 30 días</h2>

          {cargandoInsights && <p className="text-sm text-muted">Consultando Meta…</p>}
          {errorInsights && (
            <p className="text-sm text-danger">
              No se pudo leer Meta: {errorInsights}
            </p>
          )}

          {insights && insights.length === 0 && (
            <p className="text-sm text-muted">Sin campañas con actividad en este período.</p>
          )}

          {insights && insights.length > 0 && (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <KpiCard label="Inversión (30d)" value={moneda(String(totalGasto))} />
                <KpiCard label="Impresiones" value={numero(String(totalImpresiones))} />
                <KpiCard label="CPM ponderado" value={moneda(String(cpmPonderado))} />
                <KpiCard label="Campañas activas" value={String(insights.length)} />
              </div>

              <div className="overflow-x-auto rounded-lg border border-border bg-surface">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs uppercase tracking-wide text-muted border-b border-border">
                      <th className="p-3">Campaña</th>
                      <th className="p-3 text-right">Gasto</th>
                      <th className="p-3 text-right">Impresiones</th>
                      <th className="p-3 text-right">Alcance</th>
                      <th className="p-3 text-right">CPC</th>
                      <th className="p-3 text-right">CPM</th>
                      <th className="p-3 text-right">CTR</th>
                      <th className="p-3 text-right">Resultado principal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {insights.map((r, i) => {
                      const accionPrincipal = r.actions?.sort((a, b) => Number(b.value) - Number(a.value))[0];
                      return (
                        <tr key={i} className="border-b border-border last:border-0">
                          <td className="p-3">{r.campaign_name}</td>
                          <td className="p-3 text-right">{moneda(r.spend)}</td>
                          <td className="p-3 text-right">{numero(r.impressions)}</td>
                          <td className="p-3 text-right">{numero(r.reach)}</td>
                          <td className="p-3 text-right">{moneda(r.cpc)}</td>
                          <td className="p-3 text-right">{moneda(r.cpm)}</td>
                          <td className="p-3 text-right">{Number(r.ctr).toFixed(2)}%</td>
                          <td className="p-3 text-right">
                            {accionPrincipal
                              ? `${numero(accionPrincipal.value)} ${ACCION_LABEL[accionPrincipal.action_type] ?? accionPrincipal.action_type}`
                              : "—"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
