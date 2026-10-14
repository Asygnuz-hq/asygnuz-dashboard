"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { ESTADOS_CONTENIDO } from "@/lib/portal/schemas";
import { Chip, ESTADO_LABEL, ESTADO_COLOR } from "@/components/portal/TarjetaSeccion";
import { FUENTE_DISPLAY } from "@/lib/portal/fuente";

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

function formatearFecha(f: string | null) {
  if (!f) return null;
  return new Date(`${f}T00:00:00`).toLocaleDateString("es-CO", { day: "numeric", month: "short", year: "numeric" });
}

export default function ParrillaClientePage() {
  const [loading, setLoading] = useState(true);
  const [contenido, setContenido] = useState<Contenido[]>([]);
  const [filtroEstado, setFiltroEstado] = useState<string | null>(null);

  useEffect(() => {
    async function cargar() {
      const supabase = createClient();
      const { data } = await supabase.from("portal_contenido").select("*").order("orden");
      setContenido(data ?? []);
      setLoading(false);
    }
    cargar();
  }, []);

  const filtrado = useMemo(
    () => (filtroEstado ? contenido.filter((c) => c.estado === filtroEstado) : contenido),
    [contenido, filtroEstado]
  );

  if (loading) return <p className="text-muted p-6">Cargando...</p>;

  return (
    <div className="flex flex-col gap-6 pb-10">
      <div>
        <Link href="/portal" className="text-sm text-muted hover:text-foreground">
          ← Mi Portal
        </Link>
        <h1 className="text-2xl font-bold mt-1" style={{ fontFamily: FUENTE_DISPLAY }}>🚀 Parrilla de contenido</h1>
      </div>

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
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtrado.map((c) => (
            <div key={c.id} className="glass glass-hover rounded-2xl p-4 flex flex-col gap-2">
              <Chip label={ESTADO_LABEL[c.estado]} color={ESTADO_COLOR[c.estado]} />
              <p className="font-medium text-sm">{c.titulo}</p>
              <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted">
                {c.tipo && <span>{c.tipo}</span>}
                {c.plataforma && <span>{c.plataforma}</span>}
                {c.fecha_publicacion && <span>Publica: {formatearFecha(c.fecha_publicacion)}</span>}
              </div>
              {c.notas && <p className="text-xs whitespace-pre-wrap">{c.notas}</p>}
              <div className="flex gap-3 mt-1">
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
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
