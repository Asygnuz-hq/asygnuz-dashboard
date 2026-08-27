"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { PageHeader } from "@/components/PageHeader";
import { KpiCard } from "@/components/KpiCard";
import type { MetaInsightRow, InstagramMedia, PuntoDiario } from "@/lib/meta/client";

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

const TIPO_ICONO: Record<string, string> = {
  Reel: "🎬",
  Carrusel: "🎠",
  Imagen: "🖼️",
  Video: "📹",
  Historia: "⭕",
};

function tipoIcono(m: InstagramMedia): string {
  return TIPO_ICONO[tipoLegible(m)] ?? "📄";
}

function fechaCorta(iso: string): string {
  return new Date(iso).toLocaleDateString("es-CO", { day: "2-digit", month: "short" });
}

// Algunas métricas no aplican a todos los tipos de publicación (ej. "views"
// no existe en una foto) — se muestra "—" solo cuando de verdad no aplica,
// en vez de mezclar eso con un 0 real.
function numeroOMenos(valor: number | undefined): string {
  return valor !== undefined ? numero(String(valor)) : "—";
}

function interacciones(m: InstagramMedia): number {
  return (m.metricas.likes ?? 0) + (m.metricas.comments ?? 0) + (m.metricas.shares ?? 0) + (m.metricas.saved ?? 0);
}

// Interacciones sobre alcance — mide qué tan bien conectó la publicación
// con la gente que la vio, no solo cuánta gente la vio.
function tasaInteraccion(m: InstagramMedia): number | null {
  const alcance = m.metricas.reach;
  if (!alcance) return null;
  return (interacciones(m) / alcance) * 100;
}

// % de cambio vs. un período anterior — null cuando no hay con qué comparar
// (evita mostrar un falso "+infinito%" o "-100%" engañoso).
function pctDelta(actual: number, anterior: number): number | null {
  if (!anterior) return null;
  return (actual - anterior) / anterior;
}

const DIAS = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
const FRANJAS = [
  { nombre: "Madrugada (12am–6am)", desde: 0, hasta: 6 },
  { nombre: "Mañana (6am–12pm)", desde: 6, hasta: 12 },
  { nombre: "Tarde (12pm–6pm)", desde: 12, hasta: 18 },
  { nombre: "Noche (6pm–12am)", desde: 18, hasta: 24 },
];

type MomentoStats = { dia: string; franja: string; promedio: number; publicaciones: number };

// Agrupa las publicaciones por día de la semana + franja horaria y calcula
// la tasa de interacción promedio de cada combinación, para detectar cuándo
// conviene publicar. Necesita al menos un par de publicaciones por franja
// para que el promedio no sea ruido de una sola publicación.
function mejoresMomentos(media: InstagramMedia[]): MomentoStats[] {
  const grupos = new Map<string, { suma: number; cuenta: number }>();
  for (const m of media) {
    const tasa = tasaInteraccion(m);
    if (tasa === null) continue;
    const fecha = new Date(m.timestamp);
    const dia = DIAS[fecha.getDay()];
    const hora = fecha.getHours();
    const franja = FRANJAS.find((f) => hora >= f.desde && hora < f.hasta)?.nombre ?? FRANJAS[0].nombre;
    const key = `${dia}|${franja}`;
    const actual = grupos.get(key) ?? { suma: 0, cuenta: 0 };
    actual.suma += tasa;
    actual.cuenta += 1;
    grupos.set(key, actual);
  }
  return Array.from(grupos.entries())
    .map(([key, { suma, cuenta }]) => {
      const [dia, franja] = key.split("|");
      return { dia, franja, promedio: suma / cuenta, publicaciones: cuenta };
    })
    .filter((g) => g.publicaciones >= 2)
    .sort((a, b) => b.promedio - a.promedio);
}

const TIPO_METRIC_LABEL: Record<string, string> = {
  reach: "Alcance de la cuenta",
  profile_views: "Visitas al perfil",
  follower_count: "Seguidores nuevos",
};

type RendimientoTipo = { tipo: string; publicaciones: number; alcancePromedio: number; tasaPromedio: number };

// Promedio de alcance y tasa de interacción por tipo de contenido (Reel,
// Carrusel, Imagen, Video) — para ver de un vistazo qué formato le
// funciona mejor a esta cuenta, no solo publicación por publicación.
function rendimientoPorTipo(media: InstagramMedia[]): RendimientoTipo[] {
  const grupos = new Map<string, { alcance: number[]; tasas: number[] }>();
  for (const m of media) {
    const tipo = tipoLegible(m);
    const actual = grupos.get(tipo) ?? { alcance: [], tasas: [] };
    if (m.metricas.reach !== undefined) actual.alcance.push(m.metricas.reach);
    const tasa = tasaInteraccion(m);
    if (tasa !== null) actual.tasas.push(tasa);
    grupos.set(tipo, actual);
  }
  return Array.from(grupos.entries())
    .map(([tipo, { alcance, tasas }]) => ({
      tipo,
      publicaciones: Math.max(alcance.length, tasas.length),
      alcancePromedio: alcance.length ? alcance.reduce((a, b) => a + b, 0) / alcance.length : 0,
      tasaPromedio: tasas.length ? tasas.reduce((a, b) => a + b, 0) / tasas.length : 0,
    }))
    .sort((a, b) => b.tasaPromedio - a.tasaPromedio);
}

// Fechas YYYY-MM-DD para pedir el período de 30 días anterior al actual
// (31 a 60 días atrás) — se usa para las comparaciones "vs. mes anterior".
function rangoPeriodoAnterior(): { since: string; until: string } {
  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  const hoy = new Date();
  const finAnterior = new Date(hoy.getTime() - 31 * 86400000);
  const inicioAnterior = new Date(hoy.getTime() - 60 * 86400000);
  return { since: fmt(inicioAnterior), until: fmt(finAnterior) };
}

function descargarCSV(cliente: string, media: InstagramMedia[] | null, insights: MetaInsightRow[] | null) {
  const filas: string[][] = [];
  if (insights && insights.length > 0) {
    filas.push(["Anuncios — últimos 30 días"]);
    filas.push(["Campaña", "Gasto", "Impresiones", "Alcance", "CPC", "CPM", "CTR"]);
    insights.forEach((r) => {
      filas.push([r.campaign_name, r.spend, r.impressions, r.reach, r.cpc, r.cpm, r.ctr]);
    });
    filas.push([]);
  }
  if (media && media.length > 0) {
    filas.push(["Instagram — publicaciones"]);
    filas.push(["Fecha", "Tipo", "Alcance", "Interacción %", "Likes", "Comentarios", "Compartidos", "Guardados", "Reproducciones"]);
    media.forEach((m) => {
      const t = tasaInteraccion(m);
      filas.push([
        m.timestamp.slice(0, 10),
        tipoLegible(m),
        String(m.metricas.reach ?? ""),
        t !== null ? t.toFixed(1) : "",
        String(m.metricas.likes ?? ""),
        String(m.metricas.comments ?? ""),
        String(m.metricas.shares ?? ""),
        String(m.metricas.saved ?? ""),
        String(m.metricas.views ?? ""),
      ]);
    });
  }
  const csv = filas.map((fila) => fila.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `asygnuz-${cliente.toLowerCase().replace(/\s+/g, "-")}-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

type Tab = "resumen" | "anuncios" | "instagram" | "tendencia";

export default function MetricasClientesPage() {
  const searchParams = useSearchParams();
  const [conexiones, setConexiones] = useState<Conexion[] | null>(null);
  const [errorLista, setErrorLista] = useState<string | null>(null);
  const [nuevoCliente, setNuevoCliente] = useState("");
  const [seleccionado, setSeleccionado] = useState<Conexion | null>(null);
  const [insights, setInsights] = useState<MetaInsightRow[] | null>(null);
  const [insightsAnterior, setInsightsAnterior] = useState<MetaInsightRow[] | null>(null);
  const [errorInsights, setErrorInsights] = useState<string | null>(null);
  const [cargandoInsights, setCargandoInsights] = useState(false);
  const [media, setMedia] = useState<InstagramMedia[] | null>(null);
  const [historias, setHistorias] = useState<InstagramMedia[] | null>(null);
  const [errorInstagram, setErrorInstagram] = useState<string | null>(null);
  const [cargandoInstagram, setCargandoInstagram] = useState(false);
  const [tendencia, setTendencia] = useState<Record<string, PuntoDiario[]> | null>(null);
  const [desconectando, setDesconectando] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("resumen");
  const [vistaCliente, setVistaCliente] = useState(false);

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
    setTab("resumen");
    setInsights(null);
    setInsightsAnterior(null);
    setErrorInsights(null);
    setCargandoInsights(true);
    setMedia(null);
    setHistorias(null);
    setErrorInstagram(null);
    setTendencia(null);

    const promesaAds = fetch(`/api/meta/insights?conexion_id=${conexion.id}`)
      .then((res) => res.json().then((data) => ({ res, data })))
      .then(({ res, data }) => {
        if (!res.ok) throw new Error(data.error);
        setInsights(data.insights);
      })
      .catch((err) => setErrorInsights(err instanceof Error ? err.message : "Error desconocido"))
      .finally(() => setCargandoInsights(false));

    const { since, until } = rangoPeriodoAnterior();
    const promesaAdsAnterior = fetch(`/api/meta/insights?conexion_id=${conexion.id}&since=${since}&until=${until}`)
      .then((res) => res.json().then((data) => ({ res, data })))
      .then(({ res, data }) => {
        if (res.ok) setInsightsAnterior(data.insights);
      })
      .catch(() => {
        // Comparación mes vs. mes anterior es un extra — si falla no tapa el resto.
      });

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
      const promesaTendencia = fetch(`/api/meta/instagram-tendencia?conexion_id=${conexion.id}`)
        .then((res) => res.json().then((data) => ({ res, data })))
        .then(({ res, data }) => {
          if (res.ok) setTendencia(data.tendencia);
        })
        .catch(() => {
          // La tendencia es un extra — si falla no debe tapar el resto del dashboard.
        });
      await Promise.all([promesaAds, promesaAdsAnterior, promesaIg, promesaTendencia]);
    } else {
      await Promise.all([promesaAds, promesaAdsAnterior]);
    }
  }

  const conectado = searchParams.get("conectado");
  const errorConexion = searchParams.get("error");

  const totalGasto = insights?.reduce((acc, r) => acc + Number(r.spend), 0) ?? 0;
  const totalImpresiones = insights?.reduce((acc, r) => acc + Number(r.impressions), 0) ?? 0;
  const totalAlcanceAds = insights?.reduce((acc, r) => acc + Number(r.reach), 0) ?? 0;
  const cpmPonderado = totalImpresiones ? (totalGasto / totalImpresiones) * 1000 : 0;

  const gastoAnterior = insightsAnterior?.reduce((acc, r) => acc + Number(r.spend), 0) ?? 0;
  const impresionesAnterior = insightsAnterior?.reduce((acc, r) => acc + Number(r.impressions), 0) ?? 0;

  // Con hasta 50 publicaciones recientes se puede aproximar el mes anterior
  // sin pedirle otra vez la API — se parte lo que ya se trajo por fecha.
  const hoyTs = Date.now();
  const mediaActual = media?.filter((m) => hoyTs - new Date(m.timestamp).getTime() <= 30 * 86400000) ?? [];
  const mediaAnterior =
    media?.filter((m) => {
      const dias = (hoyTs - new Date(m.timestamp).getTime()) / 86400000;
      return dias > 30 && dias <= 60;
    }) ?? [];

  const totalAlcanceIG = mediaActual.reduce((acc, m) => acc + (m.metricas.reach ?? 0), 0);
  const totalInteraccionesIG = mediaActual.reduce((acc, m) => acc + interacciones(m), 0);
  const totalAlcanceIGAnterior = mediaAnterior.reduce((acc, m) => acc + (m.metricas.reach ?? 0), 0);
  const totalInteraccionesIGAnterior = mediaAnterior.reduce((acc, m) => acc + interacciones(m), 0);

  const mejorPublicacion =
    media && media.length > 0 ? [...media].sort((a, b) => (b.metricas.reach ?? 0) - (a.metricas.reach ?? 0))[0] : null;
  const tasasValidas = media?.map(tasaInteraccion).filter((t): t is number => t !== null) ?? [];
  const tasaPromedio = tasasValidas.length ? tasasValidas.reduce((a, b) => a + b, 0) / tasasValidas.length : null;
  const momentos = media ? mejoresMomentos(media) : [];
  const publicacionesConTasa = media?.filter((m) => tasaInteraccion(m) !== null) ?? [];
  const topPublicaciones = [...publicacionesConTasa].sort(
    (a, b) => (tasaInteraccion(b) ?? 0) - (tasaInteraccion(a) ?? 0)
  );
  const mejores5 = topPublicaciones.slice(0, 5);
  // Solo se muestran las que peor rindieron si hay suficientes publicaciones
  // para que "peor" no sea simplemente repetir las mismas 5 de arriba.
  const peores5 = topPublicaciones.length > 8 ? [...topPublicaciones].reverse().slice(0, 5) : [];
  const porTipo = media ? rendimientoPorTipo(media) : [];

  const tieneAds = Boolean(insights && insights.length > 0);
  const tieneIG = Boolean(seleccionado?.instagram_business_id);

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Métricas por Cliente — Meta Ads"
        subtitle="Conecta la cuenta de anuncios de un cliente y consulta sus campañas sin salir del dashboard."
      />

      {conectado && (
        <p className="text-sm rounded-md border border-border bg-surface p-3 text-accent-bright print:hidden">
          "{conectado}" quedó conectado correctamente.
        </p>
      )}
      {errorConexion && (
        <p className="text-sm rounded-md border border-border bg-surface p-3 text-danger print:hidden">{errorConexion}</p>
      )}

      <div className="rounded-lg border border-border bg-surface p-4 flex items-end gap-3 print:hidden">
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

      <div className="print:hidden">
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
        <div className="flex flex-col gap-4 pt-4 border-t border-border print:text-black">
          {/* Encabezado solo visible al imprimir — el sidebar y los botones no salen en el PDF */}
          <div className="hidden print:flex items-center gap-3 pb-4 border-b border-border">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt="Asygnuz" className="h-8 w-auto" />
            <div>
              <p className="font-bold">Reporte de métricas — {seleccionado.cliente_nombre}</p>
              <p className="text-sm text-muted">
                Generado el {new Date().toLocaleDateString("es-CO", { year: "numeric", month: "long", day: "numeric" })}
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between print:hidden">
            <h2 className="text-lg font-semibold">{seleccionado.cliente_nombre} — últimos 30 días</h2>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setVistaCliente((v) => !v)}
                className={`text-sm rounded-md px-3 py-1.5 font-medium border ${
                  vistaCliente ? "bg-accent text-accent-foreground border-accent" : "border-border hover:bg-surface-alt"
                }`}
              >
                {vistaCliente ? "Vista de trabajo" : "Vista para cliente"}
              </button>
              <button
                onClick={() => descargarCSV(seleccionado.cliente_nombre, media, insights)}
                className="text-sm rounded-md border border-border px-3 py-1.5 hover:bg-surface-alt"
              >
                Descargar Excel
              </button>
              <button
                onClick={() => window.print()}
                className="text-sm rounded-md bg-accent text-accent-foreground px-3 py-1.5 hover:bg-accent-bright"
              >
                Descargar PDF
              </button>
            </div>
          </div>
          <h2 className="hidden print:block text-lg font-semibold">Últimos 30 días</h2>

          {/* Pestañas — no se ven al imprimir, ahí sale todo junto */}
          <div className="flex gap-1 border-b border-border print:hidden">
            {(
              [
                ["resumen", "Resumen"],
                ["anuncios", "Anuncios"],
                ["instagram", "Instagram"],
                ["tendencia", "Tendencia"],
              ] as [Tab, string][]
            ).map(([valor, label]) => (
              <button
                key={valor}
                onClick={() => setTab(valor)}
                className={`text-sm px-3 py-2 border-b-2 -mb-px transition ${
                  tab === valor ? "border-accent text-foreground font-medium" : "border-transparent text-muted hover:text-foreground"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {cargandoInsights && <p className="text-sm text-muted print:hidden">Consultando Meta…</p>}
          {errorInsights && <p className="text-sm text-danger print:hidden">No se pudo leer Meta: {errorInsights}</p>}

          {/* -------- RESUMEN -------- */}
          <div className={`${tab === "resumen" ? "flex" : "hidden"} print:flex flex-col gap-4`}>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {tieneAds && (
                <>
                  <KpiCard
                    label="Inversión en anuncios (30d)"
                    value={moneda(String(totalGasto))}
                    delta={
                      pctDelta(totalGasto, gastoAnterior) !== null
                        ? { pct: pctDelta(totalGasto, gastoAnterior)! }
                        : undefined
                    }
                  />
                  <KpiCard
                    label="Impresiones"
                    value={numero(String(totalImpresiones))}
                    delta={
                      pctDelta(totalImpresiones, impresionesAnterior) !== null
                        ? { pct: pctDelta(totalImpresiones, impresionesAnterior)! }
                        : undefined
                    }
                  />
                </>
              )}
              {tieneIG && media && media.length > 0 && (
                <>
                  <KpiCard
                    label="Alcance orgánico (30d)"
                    value={numero(String(totalAlcanceIG))}
                    delta={
                      pctDelta(totalAlcanceIG, totalAlcanceIGAnterior) !== null
                        ? { pct: pctDelta(totalAlcanceIG, totalAlcanceIGAnterior)! }
                        : undefined
                    }
                  />
                  <KpiCard
                    label="Interacciones orgánicas (30d)"
                    value={numero(String(totalInteraccionesIG))}
                    delta={
                      pctDelta(totalInteraccionesIG, totalInteraccionesIGAnterior) !== null
                        ? { pct: pctDelta(totalInteraccionesIG, totalInteraccionesIGAnterior)! }
                        : undefined
                    }
                  />
                </>
              )}
            </div>

            {!tieneAds && !tieneIG && (
              <p className="text-sm text-muted">Conecta anuncios o Instagram para este cliente para ver su resumen.</p>
            )}

            {momentos.length > 0 && (
              <div className="rounded-lg border border-border bg-surface p-4">
                <h3 className="text-sm font-semibold text-muted uppercase tracking-wide mb-3">
                  Mejor momento para publicar (según el histórico de esta cuenta)
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                  {momentos.slice(0, 3).map((m, i) => (
                    <div key={`${m.dia}-${m.franja}`} className="rounded-md bg-surface-alt p-3 text-sm">
                      <p className="font-medium">
                        {i === 0 && "🏆 "}
                        {m.dia} — {m.franja}
                      </p>
                      <p className="text-muted text-xs mt-1">
                        {m.promedio.toFixed(1)}% interacción promedio · {m.publicaciones} publicaciones
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {mejores5.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-muted uppercase tracking-wide mb-2">
                  Top 5 publicaciones (por tasa de interacción)
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                  {mejores5.map((m) => (
                    <a
                      key={m.id}
                      href={m.permalink}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-lg border border-border bg-surface overflow-hidden text-xs hover:border-accent flex flex-col"
                    >
                      {m.imagenUrl && (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img src={m.imagenUrl} alt="" className="w-full aspect-square object-cover bg-surface-alt" />
                      )}
                      <div className="p-2">
                        <p className="font-medium">{tasaInteraccion(m)?.toFixed(1)}% interacción</p>
                        <p className="text-muted">
                          {tipoIcono(m)} {tipoLegible(m)} · {fechaCorta(m.timestamp)}
                        </p>
                      </div>
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* -------- ANUNCIOS -------- */}
          <div className={`${tab === "anuncios" ? "flex" : "hidden"} print:flex flex-col gap-4`}>
            {insights && insights.length === 0 && (
              <p className="text-sm text-muted">Sin campañas con actividad en este período.</p>
            )}
            {insights && insights.length > 0 && (
              <>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <KpiCard
                    label="Inversión (30d)"
                    value={moneda(String(totalGasto))}
                    delta={
                      pctDelta(totalGasto, gastoAnterior) !== null
                        ? { pct: pctDelta(totalGasto, gastoAnterior)! }
                        : undefined
                    }
                  />
                  <KpiCard label="Impresiones" value={numero(String(totalImpresiones))} />
                  <KpiCard label="Alcance" value={numero(String(totalAlcanceAds))} />
                  <KpiCard label="CPM ponderado" value={moneda(String(cpmPonderado))} />
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

          {/* -------- INSTAGRAM -------- */}
          {tieneIG && (
            <div className={`${tab === "instagram" ? "flex" : "hidden"} print:flex flex-col gap-4`}>
              {cargandoInstagram && <p className="text-sm text-muted print:hidden">Consultando Instagram…</p>}
              {errorInstagram && <p className="text-sm text-danger print:hidden">No se pudo leer Instagram: {errorInstagram}</p>}

              {media && media.length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <KpiCard label={`Publicaciones (últimas ${media.length})`} value={String(media.length)} />
                  <KpiCard
                    label="Alcance total"
                    value={numero(String(totalAlcanceIG))}
                    delta={
                      pctDelta(totalAlcanceIG, totalAlcanceIGAnterior) !== null
                        ? { pct: pctDelta(totalAlcanceIG, totalAlcanceIGAnterior)! }
                        : undefined
                    }
                  />
                  <KpiCard
                    label="Tasa de interacción promedio"
                    value={tasaPromedio !== null ? `${tasaPromedio.toFixed(1)}%` : "—"}
                  />
                  <KpiCard
                    label="Mejor publicación (alcance)"
                    value={mejorPublicacion ? numeroOMenos(mejorPublicacion.metricas.reach) : "—"}
                  />
                </div>
              )}

              {porTipo.length > 1 && (
                <div className="rounded-lg border border-border bg-surface p-4">
                  <h3 className="text-sm font-semibold text-muted uppercase tracking-wide mb-3">
                    Rendimiento por tipo de contenido
                  </h3>
                  <ResponsiveContainer width="100%" height={180} className="print:hidden">
                    <BarChart data={porTipo}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis
                        dataKey="tipo"
                        tick={{ fontSize: 11 }}
                        stroke="var(--muted)"
                        tickFormatter={(v) => `${TIPO_ICONO[v] ?? ""} ${v}`}
                      />
                      <YAxis tick={{ fontSize: 11 }} stroke="var(--muted)" unit="%" />
                      <Tooltip
                        formatter={(v) => `${Number(v).toFixed(1)}%`}
                        contentStyle={{ background: "var(--surface)", border: "1px solid var(--border)", fontSize: 12 }}
                      />
                      <Bar dataKey="tasaPromedio" name="Interacción promedio" fill="var(--accent-bright)" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                  <div className="overflow-x-auto mt-2">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-left text-xs uppercase tracking-wide text-muted border-b border-border">
                          <th className="p-2">Tipo</th>
                          <th className="p-2 text-right">Publicaciones</th>
                          <th className="p-2 text-right">Alcance promedio</th>
                          <th className="p-2 text-right">Interacción promedio</th>
                        </tr>
                      </thead>
                      <tbody>
                        {porTipo.map((t, i) => (
                          <tr key={t.tipo} className="border-b border-border last:border-0">
                            <td className="p-2 font-medium">
                              {i === 0 && "🏆 "}
                              {TIPO_ICONO[t.tipo] ?? ""} {t.tipo}
                            </td>
                            <td className="p-2 text-right">{t.publicaciones}</td>
                            <td className="p-2 text-right">{numero(String(Math.round(t.alcancePromedio)))}</td>
                            <td className="p-2 text-right">{t.tasaPromedio.toFixed(1)}%</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <p className="text-xs text-muted mt-2">
                    Esto te dice qué formato conviene usar más — no solo cuál publicación individual funcionó mejor.
                  </p>
                </div>
              )}

              {mejores5.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-muted uppercase tracking-wide mb-2">
                    Top 5 publicaciones (por tasa de interacción)
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                    {mejores5.map((m) => (
                      <a
                        key={m.id}
                        href={m.permalink}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded-lg border border-border bg-surface overflow-hidden text-xs hover:border-accent flex flex-col"
                      >
                        {m.imagenUrl && (
                          /* eslint-disable-next-line @next/next/no-img-element */
                          <img src={m.imagenUrl} alt="" className="w-full aspect-square object-cover bg-surface-alt" />
                        )}
                        <div className="p-2">
                          <p className="font-medium">{tasaInteraccion(m)?.toFixed(1)}% interacción</p>
                          <p className="text-muted">
                            {tipoIcono(m)} {tipoLegible(m)} · {fechaCorta(m.timestamp)}
                          </p>
                        </div>
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {peores5.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-muted uppercase tracking-wide mb-2">Lo que menos funcionó</h3>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                    {peores5.map((m) => (
                      <a
                        key={m.id}
                        href={m.permalink}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded-lg border border-border bg-surface overflow-hidden text-xs hover:border-danger flex flex-col opacity-80"
                      >
                        {m.imagenUrl && (
                          /* eslint-disable-next-line @next/next/no-img-element */
                          <img src={m.imagenUrl} alt="" className="w-full aspect-square object-cover bg-surface-alt" />
                        )}
                        <div className="p-2">
                          <p className="font-medium">{tasaInteraccion(m)?.toFixed(1)}% interacción</p>
                          <p className="text-muted">
                            {tipoIcono(m)} {tipoLegible(m)} · {fechaCorta(m.timestamp)}
                          </p>
                        </div>
                      </a>
                    ))}
                  </div>
                </div>
              )}

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
                        className="rounded-lg border border-border bg-surface overflow-hidden text-xs hover:border-accent flex flex-col"
                      >
                        {h.imagenUrl && (
                          /* eslint-disable-next-line @next/next/no-img-element */
                          <img src={h.imagenUrl} alt="" className="w-full aspect-[9/16] object-cover bg-surface-alt" />
                        )}
                        <div className="p-2">
                          <p className="font-medium">Alcance: {numeroOMenos(h.metricas.reach)}</p>
                          <p className="text-muted">Respuestas: {numeroOMenos(h.metricas.replies)}</p>
                        </div>
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

              {!vistaCliente && media && media.length > 0 && (
                <div className="overflow-x-auto rounded-lg border border-border bg-surface">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-xs uppercase tracking-wide text-muted border-b border-border">
                        <th className="p-3">Publicación</th>
                        <th className="p-3">Tipo</th>
                        <th className="p-3">Fecha</th>
                        <th className="p-3 text-right">Alcance</th>
                        <th className="p-3 text-right">Interacción</th>
                        <th className="p-3 text-right">Likes</th>
                        <th className="p-3 text-right">Comentarios</th>
                        <th className="p-3 text-right">Compartidos</th>
                        <th className="p-3 text-right">Guardados</th>
                        <th className="p-3 text-right">Reproducciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {media.map((m) => (
                        <tr
                          key={m.id}
                          className={`border-b border-border last:border-0 ${
                            mejorPublicacion?.id === m.id ? "bg-surface-alt" : ""
                          }`}
                        >
                          <td className="p-3">
                            <a href={m.permalink} target="_blank" rel="noreferrer" className="flex items-center gap-3 hover:underline">
                              {m.imagenUrl ? (
                                /* eslint-disable-next-line @next/next/no-img-element */
                                <img
                                  src={m.imagenUrl}
                                  alt=""
                                  className="w-10 h-10 rounded object-cover shrink-0 bg-surface-alt"
                                />
                              ) : (
                                <span className="w-10 h-10 rounded shrink-0 bg-surface-alt" />
                              )}
                              <span className="max-w-xs truncate">
                                {mejorPublicacion?.id === m.id && "⭐ "}
                                {m.caption ? m.caption.slice(0, 60) : "(sin texto)"}
                              </span>
                            </a>
                          </td>
                          <td className="p-3">
                            <span className="text-xs rounded-full bg-surface-alt px-2 py-0.5">
                              {tipoIcono(m)} {tipoLegible(m)}
                            </span>
                          </td>
                          <td className="p-3 text-muted">{fechaCorta(m.timestamp)}</td>
                          <td className="p-3 text-right">{numeroOMenos(m.metricas.reach)}</td>
                          <td className="p-3 text-right">
                            {(() => {
                              const t = tasaInteraccion(m);
                              return t !== null ? `${t.toFixed(1)}%` : "—";
                            })()}
                          </td>
                          <td className="p-3 text-right">{numeroOMenos(m.metricas.likes)}</td>
                          <td className="p-3 text-right">{numeroOMenos(m.metricas.comments)}</td>
                          <td className="p-3 text-right">{numeroOMenos(m.metricas.shares)}</td>
                          <td className="p-3 text-right">{numeroOMenos(m.metricas.saved)}</td>
                          <td className="p-3 text-right">{numeroOMenos(m.metricas.views)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* -------- TENDENCIA -------- */}
          {tieneIG && tendencia && Object.keys(tendencia).length > 0 && (
            <div className={`${tab === "tendencia" ? "grid" : "hidden"} print:grid grid-cols-1 md:grid-cols-2 gap-4`}>
              {Object.entries(tendencia).map(([metric, puntos]) => (
                <div key={metric} className="rounded-lg border border-border bg-surface p-4">
                  <h3 className="text-sm font-semibold text-muted uppercase tracking-wide mb-3">
                    {TIPO_METRIC_LABEL[metric] ?? metric} — últimos 30 días
                  </h3>
                  <ResponsiveContainer width="100%" height={200}>
                    <LineChart data={puntos.map((p) => ({ ...p, fecha: fechaCorta(p.fecha) }))}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis dataKey="fecha" tick={{ fontSize: 11 }} stroke="var(--muted)" />
                      <YAxis tick={{ fontSize: 11 }} stroke="var(--muted)" />
                      <Tooltip
                        contentStyle={{ background: "var(--surface)", border: "1px solid var(--border)", fontSize: 12 }}
                      />
                      <Line type="monotone" dataKey="valor" stroke="var(--accent-bright)" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
