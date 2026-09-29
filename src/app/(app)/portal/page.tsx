"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { ESTADOS_CONTENIDO } from "@/lib/portal/schemas";

type Proyecto = {
  fecha_inicio: string | null;
  fecha_fin: string | null;
  tipo_proyecto: string | null;
  descripcion: string | null;
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
const ESTADO_COLOR: Record<string, string> = {
  grabacion: "#8b93a6",
  revision: "#c9a227",
  edicion: "#3c5e99",
  publicado: "#5c8a72",
};

function formatearFecha(f: string | null) {
  if (!f) return "—";
  return new Date(`${f}T00:00:00`).toLocaleDateString("es-CO", { day: "numeric", month: "short", year: "numeric" });
}

export default function PortalClientePage() {
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

  if (loading) return <p className="text-muted">Cargando...</p>;

  return (
    <div className="flex flex-col gap-8">
      <PageHeader title="Mi Portal" subtitle="Todo lo de tu proyecto con ASYGNUZ, en un solo lugar." />

      {proyecto && (
        <div className="rounded-lg border border-border bg-surface p-4 grid gap-3 sm:grid-cols-2">
          {proyecto.tipo_proyecto && (
            <div>
              <p className="text-xs uppercase tracking-wide text-muted">Tipo de proyecto</p>
              <p>{proyecto.tipo_proyecto}</p>
            </div>
          )}
          {(proyecto.fecha_inicio || proyecto.fecha_fin) && (
            <div>
              <p className="text-xs uppercase tracking-wide text-muted">Duración</p>
              <p>{formatearFecha(proyecto.fecha_inicio)} → {formatearFecha(proyecto.fecha_fin)}</p>
            </div>
          )}
          {proyecto.responsable_nombre && (
            <div>
              <p className="text-xs uppercase tracking-wide text-muted">Responsable ASYGNUZ</p>
              <p>
                {proyecto.responsable_nombre}
                {proyecto.responsable_email && (
                  <> · <a className="underline" href={`mailto:${proyecto.responsable_email}`}>{proyecto.responsable_email}</a></>
                )}
              </p>
            </div>
          )}
          {proyecto.descripcion && (
            <div className="sm:col-span-2">
              <p className="text-xs uppercase tracking-wide text-muted">Descripción</p>
              <p className="whitespace-pre-wrap">{proyecto.descripcion}</p>
            </div>
          )}
        </div>
      )}

      <section>
        <h2 className="text-sm font-medium uppercase tracking-wide text-muted mb-3">
          Parrilla de contenido
        </h2>
        {contenido.length === 0 ? (
          <p className="text-sm text-muted">Todavía no hay contenido cargado.</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {ESTADOS_CONTENIDO.map((estado) => (
              <div key={estado} className="flex flex-col gap-2">
                <p
                  className="text-xs font-medium uppercase tracking-wide px-2 py-1 rounded w-fit"
                  style={{ backgroundColor: `${ESTADO_COLOR[estado]}22`, color: ESTADO_COLOR[estado] }}
                >
                  {ESTADO_LABEL[estado]}
                </p>
                {contenido
                  .filter((c) => c.estado === estado)
                  .map((c) => (
                    <div key={c.id} className="rounded-md border border-border bg-surface p-3 text-sm">
                      <p className="font-medium">{c.titulo}</p>
                      {c.tipo && <p className="text-xs text-muted">{c.tipo}</p>}
                      {c.fecha_publicacion && (
                        <p className="text-xs text-muted">Publica: {formatearFecha(c.fecha_publicacion)}</p>
                      )}
                      {c.notas && <p className="mt-1 text-xs whitespace-pre-wrap">{c.notas}</p>}
                      {c.link && (
                        <a href={c.link} target="_blank" rel="noreferrer" className="text-xs underline block mt-1">
                          Ver publicación
                        </a>
                      )}
                    </div>
                  ))}
              </div>
            ))}
          </div>
        )}
      </section>

      <div className="grid gap-8 sm:grid-cols-2">
        <section>
          <h2 className="text-sm font-medium uppercase tracking-wide text-muted mb-3">Enlaces</h2>
          {enlaces.length === 0 ? (
            <p className="text-sm text-muted">Sin enlaces todavía.</p>
          ) : (
            <ul className="flex flex-col gap-1">
              {enlaces.map((e) => (
                <li key={e.id}>
                  <a href={e.url} target="_blank" rel="noreferrer" className="text-sm underline">
                    {e.titulo}
                  </a>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section>
          <h2 className="text-sm font-medium uppercase tracking-wide text-muted mb-3">Archivos</h2>
          {archivos.length === 0 ? (
            <p className="text-sm text-muted">Sin archivos todavía.</p>
          ) : (
            <ul className="flex flex-col gap-1">
              {archivos.map((a) => (
                <li key={a.id}>
                  <button onClick={() => descargar(a)} className="text-sm underline text-left">
                    {a.nombre}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section>
        <h2 className="text-sm font-medium uppercase tracking-wide text-muted mb-3">Reuniones</h2>
        {reuniones.length === 0 ? (
          <p className="text-sm text-muted">Sin reuniones registradas todavía.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {reuniones.map((r) => (
              <div key={r.id} className="rounded-md border border-border bg-surface p-3 text-sm">
                <p className="font-medium">
                  {r.titulo} <span className="text-xs text-muted font-normal">— {formatearFecha(r.fecha)}</span>
                </p>
                {r.notas && <p className="mt-1 whitespace-pre-wrap text-xs">{r.notas}</p>}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
