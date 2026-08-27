"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { PageHeader } from "@/components/PageHeader";
import { KpiCard } from "@/components/KpiCard";
import type { MetaInsightRow, InstagramMedia } from "@/lib/meta/client";

type Conexion = {
  id: string;
  cliente_nombre: string;
  ad_account_id: string | null;
  instagram_business_id: string | null;
  instagram_username: string | null;
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

function tipoLegible(m: InstagramMedia): string {
  if (m.media_product_type === "STORY") return "Historia";
  if (m.media_product_type === "REELS") return "Reel";
  if (m.media_type === "CAROUSEL_ALBUM") return "Carrusel";
  if (m.media_type === "VIDEO") return "Video";
  return "Imagen";
}

function fechaCorta(iso: string): string {
  return new Date(iso).toLocaleDateString("es-CO", { day: "2-digit", month: "short" });
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
  const [media, setMedia] = useState<InstagramMedia[] | null>(null);
  const [historias, setHistorias] = useState<InstagramMedia[] | null>(null);
  const [errorInstagram, setErrorInstagram] = useState<string | null>(null);
  const [cargandoInstagram, setCargandoInstagram] = useState(false);
  const [desconectando, setDesconectando] = useState<string | null>(null);

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

  async function desconectar(c: Conexion) {
    if (!confirm(`¿Desconectar "${c.cliente_nombre}"? Puedes volver a conectarla cuando quieras.`)) return;
    setDesconectando(c.id);
    try {
      const res = await fetch("/api/meta/desconectar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: c.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      if (seleccionado?.id === c.id) setSeleccionado(null);
      await cargarConexiones();
    } catch (err) {
      setErrorLista(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setDesconectando(null);
    }
  }

  async function verMetricas(conexion: Conexion) {
    setSeleccionado(conexion);
    setInsights(null);
    setErrorInsights(null);
    setCargandoInsights(true);
    setMedia(null);
    setHistorias(null);
    setErrorInstagram(null);

    const promesaAds = fetch(`/api/meta/insights?conexion_id=${conexion.id}`)
      .then((res) => res.json().then((data) => ({ res, data })))
      .then(({ res, data }) => {
        if (!res.ok) throw new Error(data.error);
        setInsights(data.insights);
      })
      .catch((err) => setErrorInsights(err instanceof Error ? err.message : "Error desconocido"))
      .finally(() => setCargandoInsights(false));

    if (conexion.instagram_business_id) {
      setCargandoInstagram(true);
      const promesaIg = fetch(`/api/meta/instagram?conexion_id=${conexion.id}`)
        .then((res) => res.json().then((data) => ({ res, data })))
        .then(({ res, data }) => {
          if (!res.ok) throw new Error(data.error);
          setMedia(data.media);
          setHistorias(data.historias);
        })
        .catch((err) => setErrorInstagram(err instanceof Error ? err.message : "Error desconocido"))
        .finally(() => setCargandoInstagram(false));
      await Promise.all([promesaAds, promesaIg]);
    } else {
      await promesaAds;
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
          Conectar anuncios
        </a>
        <a
          href={nuevoCliente ? `/api/meta/instagram-connect?cliente=${encodeURIComponent(nuevoCliente)}` : "#"}
          aria-disabled={!nuevoCliente}
          className={`text-sm rounded-md px-4 py-2 font-medium border ${
            nuevoCliente
              ? "border-border hover:bg-surface-alt"
              : "border-border text-muted pointer-events-none opacity-50"
          }`}
        >
          Conectar Instagram
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
            <div
              key={c.id}
              className={`relative rounded-lg border p-4 transition ${
                seleccionado?.id === c.id ? "border-accent" : "border-border"
              } bg-surface`}
            >
              <button onClick={() => verMetricas(c)} className="text-left w-full hover:opacity-80">
                <p className="font-medium pr-16">{c.cliente_nombre}</p>
                <p className="text-xs text-muted mt-1">{c.ad_account_id ?? "sin cuenta de anuncios"}</p>
                <p className="text-xs text-muted">
                  {c.instagram_username ? `Instagram: @${c.instagram_username}` : "Instagram no conectado"}
                </p>
              </button>
              <button
                onClick={() => desconectar(c)}
                disabled={desconectando === c.id}
                className="absolute top-3 right-3 text-xs text-muted hover:text-danger disabled:opacity-50"
              >
                {desconectando === c.id ? "..." : "Desconectar"}
              </button>
              {!c.instagram_business_id && (
                <a
                  href={`/api/meta/instagram-connect?cliente=${encodeURIComponent(c.cliente_nombre)}`}
                  className="mt-2 inline-block text-xs rounded-md px-2 py-1 bg-surface-alt hover:bg-accent hover:text-accent-foreground transition"
                >
                  Conectar Instagram
                </a>
              )}
            </div>
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

          {seleccionado.instagram_business_id && (
            <div className="flex flex-col gap-4 pt-4 border-t border-border">
              <h2 className="text-lg font-semibold">Instagram — contenido orgánico</h2>

              {cargandoInstagram && <p className="text-sm text-muted">Consultando Instagram…</p>}
              {errorInstagram && <p className="text-sm text-danger">No se pudo leer Instagram: {errorInstagram}</p>}

              {historias && historias.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-muted uppercase tracking-wide mb-2">
                    Historias activas ahora ({historias.length})
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2">
                    {historias.map((h) => (
                      <a
                        key={h.id}
                        href={h.permalink}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded-lg border border-border bg-surface p-2 text-xs hover:border-accent"
                      >
                        <p className="font-medium">Alcance: {h.metricas.reach ?? "—"}</p>
                        <p className="text-muted">Respuestas: {h.metricas.replies ?? 0}</p>
                      </a>
                    ))}
                  </div>
                  <p className="text-xs text-muted mt-1">
                    Solo se pueden leer las historias mientras siguen activas (24h) — Meta no expone historial de historias vencidas.
                  </p>
                </div>
              )}

              {media && media.length === 0 && (
                <p className="text-sm text-muted">Sin publicaciones recientes en esta cuenta.</p>
              )}

              {media && media.length > 0 && (
                <div className="overflow-x-auto rounded-lg border border-border bg-surface">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-xs uppercase tracking-wide text-muted border-b border-border">
                        <th className="p-3">Publicación</th>
                        <th className="p-3">Tipo</th>
                        <th className="p-3">Fecha</th>
                        <th className="p-3 text-right">Alcance</th>
                        <th className="p-3 text-right">Likes</th>
                        <th className="p-3 text-right">Comentarios</th>
                        <th className="p-3 text-right">Compartidos</th>
                        <th className="p-3 text-right">Guardados</th>
                        <th className="p-3 text-right">Reproducciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {media.map((m) => (
                        <tr key={m.id} className="border-b border-border last:border-0">
                          <td className="p-3 max-w-xs truncate">
                            <a href={m.permalink} target="_blank" rel="noreferrer" className="hover:underline">
                              {m.caption ? m.caption.slice(0, 60) : "(sin texto)"}
                            </a>
                          </td>
                          <td className="p-3">
                            <span className="text-xs rounded-full bg-surface-alt px-2 py-0.5">{tipoLegible(m)}</span>
                          </td>
                          <td className="p-3 text-muted">{fechaCorta(m.timestamp)}</td>
                          <td className="p-3 text-right">{m.metricas.reach ?? "—"}</td>
                          <td className="p-3 text-right">{m.metricas.likes ?? "—"}</td>
                          <td className="p-3 text-right">{m.metricas.comments ?? "—"}</td>
                          <td className="p-3 text-right">{m.metricas.shares ?? "—"}</td>
                          <td className="p-3 text-right">{m.metricas.saved ?? "—"}</td>
                          <td className="p-3 text-right">{m.metricas.plays ?? "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
