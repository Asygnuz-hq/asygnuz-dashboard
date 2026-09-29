"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useTenantActual } from "@/lib/useTenantActual";
import { ESTADOS_CONTENIDO } from "@/lib/portal/schemas";

type Proyecto = {
  fecha_inicio: string | null;
  fecha_fin: string | null;
  tipo_proyecto: string | null;
  descripcion: string | null;
  contacto_nombre: string | null;
  contacto_email: string | null;
  responsable_nombre: string | null;
  responsable_email: string | null;
};
type Enlace = { id: string; titulo: string; url: string };
type Reunion = { id: string; titulo: string; fecha: string; notas: string | null };
type Archivo = { id: string; nombre: string; storage_path: string; subido_en: string };
type Contenido = {
  id: string;
  titulo: string;
  tipo: string | null;
  fecha_publicacion: string | null;
  estado: (typeof ESTADOS_CONTENIDO)[number];
  notas: string | null;
  link: string | null;
};

const ESTADO_LABEL: Record<string, string> = {
  grabacion: "Grabación",
  revision: "Revisión",
  edicion: "Edición",
  publicado: "Publicado",
};
// Mismo criterio de color que el resto del dashboard (labels.ts de Kaneo):
// gris = por hacer, ámbar = en revisión, azul = en curso, verde = terminado.
const ESTADO_COLOR: Record<string, string> = {
  grabacion: "var(--muted)",
  revision: "var(--warning)",
  edicion: "var(--accent-bright)",
  publicado: "var(--success)",
};

function formatearFecha(f: string | null) {
  if (!f) return null;
  return new Date(`${f}T00:00:00`).toLocaleDateString("es-CO", { day: "numeric", month: "short", year: "numeric" });
}

function Seccion({ icono, titulo, children }: { icono: string; titulo: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="flex items-center gap-2 text-sm font-semibold">
        <span aria-hidden>{icono}</span>
        {titulo}
      </h2>
      {children}
    </section>
  );
}

export default function PortalClientePage() {
  const tenant = useTenantActual();
  const [loading, setLoading] = useState(true);
  const [proyecto, setProyecto] = useState<Proyecto | null>(null);
  const [enlaces, setEnlaces] = useState<Enlace[]>([]);
  const [reuniones, setReuniones] = useState<Reunion[]>([]);
  const [archivos, setArchivos] = useState<Archivo[]>([]);
  const [contenido, setContenido] = useState<Contenido[]>([]);

  useEffect(() => {
    async function cargar() {
      const supabase = createClient();
      const [p, e, r, a, c] = await Promise.all([
        supabase.from("portal_proyecto").select("*").maybeSingle(),
        supabase.from("portal_enlaces").select("*").order("orden"),
        supabase.from("portal_reuniones").select("*").order("fecha", { ascending: false }),
        supabase.from("portal_archivos").select("*").order("subido_en", { ascending: false }),
        supabase.from("portal_contenido").select("*").order("orden"),
      ]);
      setProyecto(p.data);
      setEnlaces(e.data ?? []);
      setReuniones(r.data ?? []);
      setArchivos(a.data ?? []);
      setContenido(c.data ?? []);
      setLoading(false);
    }
    cargar();
  }, []);

  async function descargar(archivo: Archivo) {
    const supabase = createClient();
    const { data, error } = await supabase.storage
      .from("portal-archivos")
      .createSignedUrl(archivo.storage_path, 60);
    if (error || !data) {
      alert("No se pudo generar el link de descarga. Intenta de nuevo.");
      return;
    }
    window.open(data.signedUrl, "_blank");
  }

  if (loading) return <p className="text-muted p-6">Cargando...</p>;

  const duracion = proyecto && (proyecto.fecha_inicio || proyecto.fecha_fin)
    ? `${formatearFecha(proyecto.fecha_inicio) ?? "—"} → ${formatearFecha(proyecto.fecha_fin) ?? "—"}`
    : null;

  return (
    <div className="flex flex-col gap-8 pb-10">
      {/* Banner de bienvenida, mismo tono que la ficha de un proyecto en Notion */}
      <div className="rounded-lg border border-border bg-surface-alt p-5">
        <p className="text-lg font-semibold">👋 Bienvenido a tu portal con ASYGNUZ</p>
        <p className="text-sm text-muted mt-1">
          Este es tu espacio: el avance de tu proyecto, la parrilla de contenido, los enlaces y archivos que te
          compartimos, y las notas de nuestras reuniones — todo en un solo lugar.
          {proyecto?.responsable_email && (
            <> Cualquier duda, escríbenos a <a className="underline" href={`mailto:${proyecto.responsable_email}`}>{proyecto.responsable_email}</a>.</>
          )}
        </p>
      </div>

      {proyecto && (proyecto.tipo_proyecto || duracion || proyecto.responsable_nombre || proyecto.descripcion) && (
        <div className="rounded-lg border border-border bg-surface p-5 grid gap-4 sm:grid-cols-3">
          {tenant?.nombre && (
            <div className="sm:col-span-3">
              <p className="text-xl font-bold">{tenant.nombre}</p>
            </div>
          )}
          {proyecto.tipo_proyecto && (
            <div>
              <p className="text-xs uppercase tracking-wide text-muted">🏷️ Tipo de proyecto</p>
              <p className="mt-0.5">{proyecto.tipo_proyecto}</p>
            </div>
          )}
          {duracion && (
            <div>
              <p className="text-xs uppercase tracking-wide text-muted">📅 Duración</p>
              <p className="mt-0.5">{duracion}</p>
            </div>
          )}
          {proyecto.responsable_nombre && (
            <div>
              <p className="text-xs uppercase tracking-wide text-muted">👤 Responsable ASYGNUZ</p>
              <p className="mt-0.5">{proyecto.responsable_nombre}</p>
            </div>
          )}
          {proyecto.descripcion && (
            <div className="sm:col-span-3 pt-2 border-t border-border">
              <p className="text-xs uppercase tracking-wide text-muted mb-1">Descripción del proyecto</p>
              <p className="whitespace-pre-wrap text-sm">{proyecto.descripcion}</p>
            </div>
          )}
        </div>
      )}

      <Seccion icono="🚀" titulo="Parrilla de contenido">
        {contenido.length === 0 ? (
          <p className="text-sm text-muted">Todavía no hay contenido cargado.</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {ESTADOS_CONTENIDO.map((estado) => {
              const items = contenido.filter((c) => c.estado === estado);
              return (
                <div key={estado} className="flex flex-col gap-2 rounded-lg border border-border bg-surface p-2">
                  <p
                    className="text-xs font-medium uppercase tracking-wide px-2 py-1 rounded w-fit"
                    style={{ backgroundColor: `color-mix(in srgb, ${ESTADO_COLOR[estado]} 20%, transparent)`, color: ESTADO_COLOR[estado] }}
                  >
                    {ESTADO_LABEL[estado]} · {items.length}
                  </p>
                  {items.map((c) => (
                    <div key={c.id} className="rounded-md border border-border bg-surface-alt p-3 text-sm">
                      <p className="font-medium">{c.titulo}</p>
                      {c.tipo && <p className="text-xs text-muted">{c.tipo}</p>}
                      {c.fecha_publicacion && (
                        <p className="text-xs text-muted">Publica: {formatearFecha(c.fecha_publicacion)}</p>
                      )}
                      {c.notas && <p className="mt-1 text-xs whitespace-pre-wrap">{c.notas}</p>}
                      {c.link && (
                        <a href={c.link} target="_blank" rel="noreferrer" className="text-xs underline block mt-1">
                          Ver publicación →
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        )}
      </Seccion>

      <div className="grid gap-8 sm:grid-cols-2">
        <Seccion icono="🔗" titulo="Enlaces">
          {enlaces.length === 0 ? (
            <p className="text-sm text-muted">Sin enlaces todavía.</p>
          ) : (
            <div className="rounded-lg border border-border bg-surface divide-y divide-border">
              {enlaces.map((e) => (
                <a
                  key={e.id}
                  href={e.url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-between gap-2 px-3 py-2 text-sm hover:bg-surface-alt"
                >
                  {e.titulo} <span className="text-muted">→</span>
                </a>
              ))}
            </div>
          )}
        </Seccion>

        <Seccion icono="📁" titulo="Archivos">
          {archivos.length === 0 ? (
            <p className="text-sm text-muted">Sin archivos todavía.</p>
          ) : (
            <div className="rounded-lg border border-border bg-surface divide-y divide-border">
              {archivos.map((a) => (
                <button
                  key={a.id}
                  onClick={() => descargar(a)}
                  className="flex w-full items-center justify-between gap-2 px-3 py-2 text-sm text-left hover:bg-surface-alt"
                >
                  {a.nombre} <span className="text-muted">⬇</span>
                </button>
              ))}
            </div>
          )}
        </Seccion>
      </div>

      <Seccion icono="📝" titulo="Reuniones">
        {reuniones.length === 0 ? (
          <p className="text-sm text-muted">Sin reuniones registradas todavía.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {reuniones.map((r) => (
              <div key={r.id} className="rounded-lg border border-border bg-surface p-3 text-sm">
                <p className="font-medium">
                  {r.titulo} <span className="text-xs text-muted font-normal">— {formatearFecha(r.fecha)}</span>
                </p>
                {r.notas && <p className="mt-1 whitespace-pre-wrap text-xs text-muted">{r.notas}</p>}
              </div>
            ))}
          </div>
        )}
      </Seccion>
    </div>
  );
}
