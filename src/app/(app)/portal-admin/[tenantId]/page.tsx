"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { ESTADOS_CONTENIDO } from "@/lib/portal/schemas";
import { TarjetaSeccion, Chip, ESTADO_LABEL, ESTADO_COLOR } from "@/components/portal/TarjetaSeccion";
import { FuentesAvance } from "@/components/portal/FuentesAvance";
import { SeccionInstagramCliente } from "@/components/portal/SeccionInstagramCliente";

type Cliente = { id: string; nombre: string; slug: string; color_acento: string | null };
type Pilar = { id: string; icono: string; titulo: string; texto: string };
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
type Archivo = { id: string; nombre: string; tamano_bytes: number | null };
type Contenido = {
  id: string;
  titulo: string;
  tipo: string | null;
  fecha_publicacion: string | null;
  estado: (typeof ESTADOS_CONTENIDO)[number];
  notas: string | null;
  link: string | null;
};

const PROYECTO_VACIO: Proyecto = {
  fecha_inicio: null,
  fecha_fin: null,
  tipo_proyecto: null,
  descripcion: null,
  contacto_nombre: null,
  contacto_email: null,
  responsable_nombre: null,
  responsable_email: null,
};

async function api(url: string, opts?: RequestInit) {
  const res = await fetch(url, {
    ...opts,
    headers: opts?.body && !(opts.body instanceof FormData) ? { "Content-Type": "application/json" } : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Error ${res.status}`);
  return data;
}

export default function GestionarClientePage({ params }: { params: Promise<{ tenantId: string }> }) {
  const { tenantId } = use(params);
  const [cliente, setCliente] = useState<Cliente | null>(null);
  const [proyecto, setProyecto] = useState<Proyecto>(PROYECTO_VACIO);
  const [colorAcento, setColorAcento] = useState("");
  const [pilares, setPilares] = useState<Pilar[]>([]);
  const [enlaces, setEnlaces] = useState<Enlace[]>([]);
  const [reuniones, setReuniones] = useState<Reunion[]>([]);
  const [archivos, setArchivos] = useState<Archivo[]>([]);
  const [contenido, setContenido] = useState<Contenido[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);

  async function cargar() {
    try {
      const data = await api(`/api/portal-admin/clientes/${tenantId}`);
      setCliente(data.cliente);
      setProyecto(data.proyecto ?? PROYECTO_VACIO);
      setColorAcento(data.cliente?.color_acento ?? "");
      setPilares(data.pilares ?? []);
      setEnlaces(data.enlaces);
      setReuniones(data.reuniones);
      setArchivos(data.archivos);
      setContenido(data.contenido);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Error cargando el cliente.");
    }
    setLoading(false);
  }

  useEffect(() => {
    cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantId]);

  async function guardarProyecto(e: React.FormEvent) {
    e.preventDefault();
    try {
      await api(`/api/portal-admin/clientes/${tenantId}`, {
        method: "PUT",
        body: JSON.stringify({ ...proyecto, colorAcento }),
      });
      setCliente((prev) => (prev ? { ...prev, color_acento: colorAcento || null } : prev));
      setMessage("Ficha del proyecto guardada.");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Error guardando.");
    }
  }

  async function agregarPilar(icono: string, titulo: string, texto: string) {
    const data = await api(`/api/portal-admin/clientes/${tenantId}/pilares`, {
      method: "POST",
      body: JSON.stringify({ icono, titulo, texto }),
    });
    setPilares((prev) => [...prev, data.pilar]);
  }
  async function borrarPilar(id: string) {
    await api(`/api/portal-admin/clientes/${tenantId}/pilares/${id}`, { method: "DELETE" });
    setPilares((prev) => prev.filter((p) => p.id !== id));
  }

  async function vincular(email: string) {
    try {
      const data = await api(`/api/portal-admin/clientes/${tenantId}/vincular`, {
        method: "POST",
        body: JSON.stringify({ email, rol: "admin" }),
      });
      setMessage(data.mensaje || "Usuario vinculado.");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Error vinculando el usuario.");
    }
  }

  async function agregarEnlace(titulo: string, url: string) {
    const data = await api(`/api/portal-admin/clientes/${tenantId}/enlaces`, {
      method: "POST",
      body: JSON.stringify({ titulo, url }),
    });
    setEnlaces((prev) => [...prev, data.enlace]);
  }
  async function borrarEnlace(id: string) {
    await api(`/api/portal-admin/clientes/${tenantId}/enlaces/${id}`, { method: "DELETE" });
    setEnlaces((prev) => prev.filter((e) => e.id !== id));
  }

  async function agregarReunion(titulo: string, fecha: string, notas: string) {
    const data = await api(`/api/portal-admin/clientes/${tenantId}/reuniones`, {
      method: "POST",
      body: JSON.stringify({ titulo, fecha, notas }),
    });
    setReuniones((prev) => [data.reunion, ...prev]);
  }
  async function borrarReunion(id: string) {
    await api(`/api/portal-admin/clientes/${tenantId}/reuniones/${id}`, { method: "DELETE" });
    setReuniones((prev) => prev.filter((r) => r.id !== id));
  }

  // Agregar/editar/borrar contenido ahora vive en /portal-admin/[tenantId]/parrilla
  // (pantalla propia, con filtros) — acá solo se necesitan los conteos.

  async function subirArchivo(file: File) {
    const form = new FormData();
    form.append("archivo", file);
    const data = await api(`/api/portal-admin/clientes/${tenantId}/archivos`, { method: "POST", body: form });
    setArchivos((prev) => [data.archivo, ...prev]);
  }
  async function verArchivo(id: string) {
    const data = await api(`/api/portal-admin/clientes/${tenantId}/archivos/${id}`);
    window.open(data.url, "_blank");
  }
  async function borrarArchivo(id: string) {
    await api(`/api/portal-admin/clientes/${tenantId}/archivos/${id}`, { method: "DELETE" });
    setArchivos((prev) => prev.filter((a) => a.id !== id));
  }

  if (loading) return <p className="text-muted p-6">Cargando...</p>;
  if (!cliente) return <p className="text-muted p-6">{message || "Cliente no encontrado."}</p>;

  return (
    <div className="flex flex-col gap-6 max-w-3xl pb-10">
      <div className="flex items-start justify-between gap-4">
        <PageHeader title={cliente.nombre} subtitle={`Portal del cliente — ${cliente.slug}`} />
        <Link
          href={`/portal-admin/${tenantId}/vista-previa`}
          className="shrink-0 rounded-md bg-accent text-accent-foreground px-4 py-2 text-sm font-medium"
        >
          👁️ Ver como lo ve el cliente
        </Link>
      </div>

      {message && (
        <div className="rounded-lg border border-border bg-surface-alt px-4 py-2 text-sm text-muted">{message}</div>
      )}

      <TarjetaSeccion icono="🔑" titulo="Acceso del cliente">
        <VincularUsuario onVincular={vincular} />
      </TarjetaSeccion>

      <TarjetaSeccion icono="📌" titulo="Ficha del proyecto">
        <form onSubmit={guardarProyecto} className="flex flex-col gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Campo label="Tipo de proyecto" value={proyecto.tipo_proyecto} onChange={(v) => setProyecto({ ...proyecto, tipo_proyecto: v })} />
            <Campo label="Fecha de inicio" type="date" value={proyecto.fecha_inicio} onChange={(v) => setProyecto({ ...proyecto, fecha_inicio: v })} />
            <Campo label="Fecha de finalización" type="date" value={proyecto.fecha_fin} onChange={(v) => setProyecto({ ...proyecto, fecha_fin: v })} />
            <Campo label="Contacto (nombre)" value={proyecto.contacto_nombre} onChange={(v) => setProyecto({ ...proyecto, contacto_nombre: v })} />
            <Campo label="Contacto (correo)" type="email" value={proyecto.contacto_email} onChange={(v) => setProyecto({ ...proyecto, contacto_email: v })} />
            <Campo label="Responsable ASYGNUZ" value={proyecto.responsable_nombre} onChange={(v) => setProyecto({ ...proyecto, responsable_nombre: v })} />
            <Campo label="Correo del responsable" type="email" value={proyecto.responsable_email} onChange={(v) => setProyecto({ ...proyecto, responsable_email: v })} />
          </div>
          <label className="flex items-center gap-3 text-sm">
            Color de marca (el portal de este cliente usa este color en vez del verde de ASYGNUZ)
            <input
              type="color"
              value={colorAcento || "#1d9e75"}
              onChange={(e) => setColorAcento(e.target.value)}
              className="h-9 w-14 shrink-0 cursor-pointer p-0.5"
            />
            {colorAcento && (
              <button type="button" onClick={() => setColorAcento("")} className="text-xs text-muted hover:text-foreground">
                Quitar
              </button>
            )}
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Descripción del proyecto (resumen corto — el detalle largo va en Pilares, abajo)
            <textarea
              value={proyecto.descripcion ?? ""}
              onChange={(e) => setProyecto({ ...proyecto, descripcion: e.target.value })}
              rows={4}
            />
          </label>
          <button type="submit" className="rounded-md bg-accent text-accent-foreground font-medium py-2 w-fit px-4">
            Guardar ficha
          </button>
        </form>
      </TarjetaSeccion>

      <TarjetaSeccion icono="📊" titulo="Fuentes del avance (Kaneo y Meta)">
        <FuentesAvance tenantId={tenantId} />
      </TarjetaSeccion>

      <TarjetaSeccion icono="📸" titulo="Instagram & Automatizaciones">
        <SeccionInstagramCliente tenantId={tenantId} />
      </TarjetaSeccion>

      <TarjetaSeccion icono="🎯" titulo="Pilares estratégicos">
        <ListaPilares pilares={pilares} onAgregar={agregarPilar} onBorrar={borrarPilar} />
      </TarjetaSeccion>

      <TarjetaSeccion icono="🚀" titulo="Parrilla de contenido">
        {contenido.length === 0 ? (
          <p className="text-sm text-muted">Todavía no hay contenido cargado.</p>
        ) : (
          <div className="flex flex-wrap gap-4">
            {ESTADOS_CONTENIDO.map((estado) => (
              <Chip
                key={estado}
                label={`${ESTADO_LABEL[estado]} · ${contenido.filter((c) => c.estado === estado).length}`}
                color={ESTADO_COLOR[estado]}
              />
            ))}
          </div>
        )}
        <Link href={`/portal-admin/${tenantId}/parrilla`} className="text-sm underline w-fit">
          Gestionar parrilla completa →
        </Link>
      </TarjetaSeccion>

      <TarjetaSeccion icono="🔗" titulo="Enlaces">
        <ListaEnlaces enlaces={enlaces} onAgregar={agregarEnlace} onBorrar={borrarEnlace} />
      </TarjetaSeccion>

      <TarjetaSeccion icono="📁" titulo="Archivos">
        <ListaArchivos archivos={archivos} onSubir={subirArchivo} onVer={verArchivo} onBorrar={borrarArchivo} />
      </TarjetaSeccion>

      <TarjetaSeccion icono="📝" titulo="Reuniones">
        <ListaReuniones reuniones={reuniones} onAgregar={agregarReunion} onBorrar={borrarReunion} />
      </TarjetaSeccion>
    </div>
  );
}

function Campo({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string | null;
  onChange: (v: string) => void;
  type?: string;
}) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      {label}
      <input type={type} value={value ?? ""} onChange={(e) => onChange(e.target.value)} />
    </label>
  );
}

function VincularUsuario({ onVincular }: { onVincular: (email: string) => Promise<void> }) {
  const [email, setEmail] = useState("");
  const [enviando, setEnviando] = useState(false);
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        setEnviando(true);
        await onVincular(email);
        setEnviando(false);
        setEmail("");
      }}
      className="flex flex-wrap items-end gap-2"
    >
      <label className="flex flex-col gap-1 text-sm flex-1 min-w-[200px]">
        Correo (ya creado en Authentication → Users)
        <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="cliente@correo.com" />
      </label>
      <button type="submit" disabled={enviando} className="rounded-md bg-accent text-accent-foreground px-4 py-2 text-sm font-medium disabled:opacity-60">
        {enviando ? "Vinculando..." : "Vincular"}
      </button>
    </form>
  );
}

function ListaEnlaces({
  enlaces,
  onAgregar,
  onBorrar,
}: {
  enlaces: Enlace[];
  onAgregar: (titulo: string, url: string) => Promise<void>;
  onBorrar: (id: string) => Promise<void>;
}) {
  const [titulo, setTitulo] = useState("");
  const [url, setUrl] = useState("");
  return (
    <div className="flex flex-col gap-3">
      {enlaces.length === 0 ? (
        <p className="text-sm text-muted">Sin enlaces todavía.</p>
      ) : (
        <div className="rounded-lg bg-surface-alt divide-y divide-border overflow-hidden">
          {enlaces.map((e) => (
            <div key={e.id} className="flex items-center gap-2 px-3 py-2 text-sm">
              <a href={e.url} target="_blank" rel="noreferrer" className="underline flex-1 truncate">
                {e.titulo}
              </a>
              <button onClick={() => onBorrar(e.id)} className="text-xs text-muted hover:text-foreground shrink-0">
                Borrar
              </button>
            </div>
          ))}
        </div>
      )}
      <form
        onSubmit={async (ev) => {
          ev.preventDefault();
          await onAgregar(titulo, url);
          setTitulo("");
          setUrl("");
        }}
        className="flex flex-wrap gap-2 pt-2 border-t border-border"
      >
        <input placeholder="Título" required value={titulo} onChange={(e) => setTitulo(e.target.value)} className="flex-1 min-w-[140px]" />
        <input placeholder="https://..." required value={url} onChange={(e) => setUrl(e.target.value)} className="flex-1 min-w-[180px]" />
        <button type="submit" className="rounded-md bg-accent text-accent-foreground px-3 py-2 text-sm font-medium">
          Agregar
        </button>
      </form>
    </div>
  );
}

function ListaPilares({
  pilares,
  onAgregar,
  onBorrar,
}: {
  pilares: Pilar[];
  onAgregar: (icono: string, titulo: string, texto: string) => Promise<void>;
  onBorrar: (id: string) => Promise<void>;
}) {
  const [icono, setIcono] = useState("🎯");
  const [titulo, setTitulo] = useState("");
  const [texto, setTexto] = useState("");
  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs text-muted">
        Bloques cortos para explicar la estrategia (posicionamiento, mercado, pauta, blindaje legal...) en vez de un
        solo párrafo largo.
      </p>
      {pilares.length === 0 ? (
        <p className="text-sm text-muted">Sin pilares todavía.</p>
      ) : (
        <div className="grid gap-2 sm:grid-cols-2">
          {pilares.map((p) => (
            <div key={p.id} className="rounded-lg bg-surface-alt p-3 text-sm">
              <div className="flex items-start justify-between gap-2">
                <span className="font-medium">
                  {p.icono} {p.titulo}
                </span>
                <button onClick={() => onBorrar(p.id)} className="text-xs text-muted hover:text-foreground shrink-0">
                  Borrar
                </button>
              </div>
              <p className="text-xs mt-1 text-muted">{p.texto}</p>
            </div>
          ))}
        </div>
      )}
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          await onAgregar(icono, titulo, texto);
          setIcono("🎯");
          setTitulo("");
          setTexto("");
        }}
        className="flex flex-col gap-2 pt-2 border-t border-border"
      >
        <div className="flex gap-2">
          <input value={icono} onChange={(e) => setIcono(e.target.value)} className="w-14 text-center" maxLength={4} />
          <input placeholder="Título (ej. Posicionamiento)" required value={titulo} onChange={(e) => setTitulo(e.target.value)} className="flex-1" />
        </div>
        <textarea placeholder="Texto del pilar" required value={texto} onChange={(e) => setTexto(e.target.value)} rows={2} />
        <button type="submit" className="rounded-md bg-accent text-accent-foreground px-3 py-2 text-sm font-medium w-fit">
          Agregar pilar
        </button>
      </form>
    </div>
  );
}

function ListaArchivos({
  archivos,
  onSubir,
  onVer,
  onBorrar,
}: {
  archivos: Archivo[];
  onSubir: (file: File) => Promise<void>;
  onVer: (id: string) => Promise<void>;
  onBorrar: (id: string) => Promise<void>;
}) {
  const [subiendo, setSubiendo] = useState(false);
  return (
    <div className="flex flex-col gap-3">
      {archivos.length === 0 ? (
        <p className="text-sm text-muted">Sin archivos todavía.</p>
      ) : (
        <div className="rounded-lg bg-surface-alt divide-y divide-border overflow-hidden">
          {archivos.map((a) => (
            <div key={a.id} className="flex items-center gap-2 px-3 py-2 text-sm">
              <button onClick={() => onVer(a.id)} className="flex-1 truncate text-left underline decoration-dotted">
                📄 {a.nombre}
              </button>
              <button onClick={() => onBorrar(a.id)} className="text-xs text-muted hover:text-foreground shrink-0">
                Borrar
              </button>
            </div>
          ))}
        </div>
      )}
      <input
        type="file"
        multiple
        disabled={subiendo}
        className="pt-2 border-t border-border text-sm"
        onChange={async (e) => {
          const files = e.target.files ? Array.from(e.target.files) : [];
          if (files.length === 0) return;
          setSubiendo(true);
          try {
            // Uno por uno (no en paralelo): si uno falla, se sabe cuál y
            // los de antes ya quedaron subidos.
            for (const file of files) await onSubir(file);
          } finally {
            setSubiendo(false);
            e.target.value = "";
          }
        }}
      />
    </div>
  );
}

function ListaReuniones({
  reuniones,
  onAgregar,
  onBorrar,
}: {
  reuniones: Reunion[];
  onAgregar: (titulo: string, fecha: string, notas: string) => Promise<void>;
  onBorrar: (id: string) => Promise<void>;
}) {
  const [titulo, setTitulo] = useState("");
  const [fecha, setFecha] = useState("");
  const [notas, setNotas] = useState("");
  return (
    <div className="flex flex-col gap-3">
      {reuniones.length === 0 ? (
        <p className="text-sm text-muted">Sin reuniones registradas todavía.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {reuniones.map((r) => (
            <div key={r.id} className="rounded-lg bg-surface-alt p-3 text-sm">
              <div className="flex items-center gap-2">
                <span className="font-medium flex-1">{r.titulo}</span>
                <span className="text-xs text-muted">{r.fecha}</span>
                <button onClick={() => onBorrar(r.id)} className="text-xs text-muted hover:text-foreground">
                  Borrar
                </button>
              </div>
              {r.notas && <p className="text-xs mt-1 whitespace-pre-wrap text-muted">{r.notas}</p>}
            </div>
          ))}
        </div>
      )}
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          await onAgregar(titulo, fecha, notas);
          setTitulo("");
          setFecha("");
          setNotas("");
        }}
        className="flex flex-col gap-2 pt-2 border-t border-border"
      >
        <div className="flex flex-wrap gap-2">
          <input placeholder="Título" required value={titulo} onChange={(e) => setTitulo(e.target.value)} className="flex-1 min-w-[140px]" />
          <input type="date" required value={fecha} onChange={(e) => setFecha(e.target.value)} />
        </div>
        <textarea placeholder="Notas de la reunión" value={notas} onChange={(e) => setNotas(e.target.value)} rows={2} />
        <button type="submit" className="rounded-md bg-accent text-accent-foreground px-3 py-2 text-sm font-medium w-fit">
          Agregar
        </button>
      </form>
    </div>
  );
}
