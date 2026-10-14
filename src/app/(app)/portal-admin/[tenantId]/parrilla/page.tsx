"use client";

import { use, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ESTADOS_CONTENIDO } from "@/lib/portal/schemas";
import { Chip, ESTADO_LABEL, ESTADO_COLOR } from "@/components/portal/TarjetaSeccion";
import { FUENTE_DISPLAY } from "@/lib/portal/fuente";

type Cliente = { id: string; nombre: string; slug: string };
type Contenido = {
  id: string;
  titulo: string;
  tipo: string | null;
  plataforma: string | null;
  fecha_publicacion: string | null;
  estado: (typeof ESTADOS_CONTENIDO)[number];
  notas: string | null;
  link_referencia: string | null;
  link: string | null;
};

async function api(url: string, opts?: RequestInit) {
  const res = await fetch(url, {
    ...opts,
    headers: opts?.body ? { "Content-Type": "application/json" } : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Error ${res.status}`);
  return data;
}

export default function ParrillaAdminPage({ params }: { params: Promise<{ tenantId: string }> }) {
  const { tenantId } = use(params);
  const [cliente, setCliente] = useState<Cliente | null>(null);
  const [contenido, setContenido] = useState<Contenido[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [filtroEstado, setFiltroEstado] = useState<string | null>(null);

  async function cargar() {
    try {
      const data = await api(`/api/portal-admin/clientes/${tenantId}`);
      setCliente(data.cliente);
      setContenido(data.contenido);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Error cargando.");
    }
    setLoading(false);
  }

  useEffect(() => {
    cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantId]);

  const filtrado = useMemo(
    () => (filtroEstado ? contenido.filter((c) => c.estado === filtroEstado) : contenido),
    [contenido, filtroEstado]
  );

  async function agregar(payload: Record<string, string>) {
    const data = await api(`/api/portal-admin/clientes/${tenantId}/contenido`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
    setContenido((prev) => [...prev, data.contenido]);
  }
  async function cambiarEstado(id: string, estado: string) {
    const data = await api(`/api/portal-admin/clientes/${tenantId}/contenido/${id}`, {
      method: "PUT",
      body: JSON.stringify({ estado }),
    });
    setContenido((prev) => prev.map((c) => (c.id === id ? data.contenido : c)));
  }
  async function borrar(id: string) {
    await api(`/api/portal-admin/clientes/${tenantId}/contenido/${id}`, { method: "DELETE" });
    setContenido((prev) => prev.filter((c) => c.id !== id));
  }

  if (loading) return <p className="text-muted p-6">Cargando...</p>;
  if (!cliente) return <p className="text-muted p-6">{message || "Cliente no encontrado."}</p>;

  return (
    <div className="flex flex-col gap-6 max-w-4xl pb-10">
      <div>
        <Link href={`/portal-admin/${tenantId}`} className="text-sm text-muted hover:text-foreground">
          ← {cliente.nombre}
        </Link>
        <h1 className="text-2xl font-bold mt-1" style={{ fontFamily: FUENTE_DISPLAY }}>🚀 Parrilla de contenido</h1>
      </div>

      {message && (
        <div className="rounded-lg border border-border bg-surface-alt px-4 py-2 text-sm text-muted">{message}</div>
      )}

      <FormularioContenido onAgregar={agregar} />

      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setFiltroEstado(null)}
          className={`rounded-full px-3 py-1.5 text-xs font-semibold border ${
            filtroEstado === null ? "border-accent-bright bg-surface-alt" : "border-border text-muted"
          }`}
        >
          Todas · {contenido.length}
        </button>
        {ESTADOS_CONTENIDO.map((estado) => {
          const n = contenido.filter((c) => c.estado === estado).length;
          return (
            <button
              key={estado}
              onClick={() => setFiltroEstado(estado)}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold border flex items-center gap-1.5 ${
                filtroEstado === estado ? "border-accent-bright bg-surface-alt" : "border-border text-muted"
              }`}
            >
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: ESTADO_COLOR[estado] }} aria-hidden />
              {ESTADO_LABEL[estado]} · {n}
            </button>
          );
        })}
      </div>

      {filtrado.length === 0 ? (
        <p className="text-sm text-muted">No hay contenido en este filtro.</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {filtrado.map((c) => (
            <div key={c.id} className="glass glass-hover rounded-2xl p-4 flex flex-col gap-2">
              <div className="flex items-start justify-between gap-2">
                <Chip label={ESTADO_LABEL[c.estado]} color={ESTADO_COLOR[c.estado]} />
                <button onClick={() => borrar(c.id)} className="text-xs text-muted hover:text-foreground shrink-0">
                  Borrar
                </button>
              </div>
              <p className="font-medium text-sm">{c.titulo}</p>
              <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted">
                {c.tipo && <span>{c.tipo}</span>}
                {c.plataforma && <span>{c.plataforma}</span>}
                {c.fecha_publicacion && <span>Publica: {c.fecha_publicacion}</span>}
              </div>
              {c.notas && <p className="text-xs whitespace-pre-wrap">{c.notas}</p>}
              <div className="flex items-center gap-3 mt-1">
                {c.link_referencia && (
                  <a href={c.link_referencia} target="_blank" rel="noreferrer" className="text-xs underline">
                    Ver referencia
                  </a>
                )}
                {c.link && (
                  <a href={c.link} target="_blank" rel="noreferrer" className="text-xs underline">
                    Ver publicación
                  </a>
                )}
              </div>
              <select
                value={c.estado}
                onChange={(e) => cambiarEstado(c.id, e.target.value)}
                className="mt-1 text-xs w-fit"
              >
                {ESTADOS_CONTENIDO.map((e) => (
                  <option key={e} value={e}>
                    {ESTADO_LABEL[e]}
                  </option>
                ))}
              </select>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function FormularioContenido({ onAgregar }: { onAgregar: (payload: Record<string, string>) => Promise<void> }) {
  const [titulo, setTitulo] = useState("");
  const [tipo, setTipo] = useState("");
  const [plataforma, setPlataforma] = useState("");
  const [fechaPublicacion, setFechaPublicacion] = useState("");
  const [linkReferencia, setLinkReferencia] = useState("");
  const [enviando, setEnviando] = useState(false);

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        setEnviando(true);
        try {
          await onAgregar({ titulo, tipo, plataforma, fechaPublicacion, linkReferencia });
          setTitulo("");
          setTipo("");
          setPlataforma("");
          setFechaPublicacion("");
          setLinkReferencia("");
        } finally {
          setEnviando(false);
        }
      }}
      className="glass rounded-2xl p-4 grid gap-3 sm:grid-cols-2"
    >
      <input placeholder="Título" required value={titulo} onChange={(e) => setTitulo(e.target.value)} className="sm:col-span-2" />
      <input placeholder="Tipo (reel, carrusel, story...)" value={tipo} onChange={(e) => setTipo(e.target.value)} />
      <input placeholder="Plataforma (Instagram, TikTok...)" value={plataforma} onChange={(e) => setPlataforma(e.target.value)} />
      <input type="date" value={fechaPublicacion} onChange={(e) => setFechaPublicacion(e.target.value)} />
      <input
        placeholder="Link de referencia (video a imitar)"
        value={linkReferencia}
        onChange={(e) => setLinkReferencia(e.target.value)}
      />
      <button
        type="submit"
        disabled={enviando}
        className="rounded-md bg-accent text-accent-foreground px-4 py-2 text-sm font-medium w-fit sm:col-span-2 disabled:opacity-60"
      >
        {enviando ? "Agregando..." : "Agregar a la parrilla"}
      </button>
    </form>
  );
}
