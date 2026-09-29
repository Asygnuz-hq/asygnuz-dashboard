"use client";

import { use, useEffect, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { ESTADOS_CONTENIDO } from "@/lib/portal/schemas";

type Cliente = { id: string; nombre: string; slug: string };
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

const ESTADO_LABEL: Record<string, string> = {
  grabacion: "Grabación",
  revision: "Revisión",
  edicion: "Edición",
  publicado: "Publicado",
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
      await api(`/api/portal-admin/clientes/${tenantId}`, { method: "PUT", body: JSON.stringify(proyecto) });
      setMessage("Ficha del proyecto guardada.");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Error guardando.");
    }
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

  async function agregarContenido(titulo: string, tipo: string, fechaPublicacion: string) {
    const data = await api(`/api/portal-admin/clientes/${tenantId}/contenido`, {
      method: "POST",
      body: JSON.stringify({ titulo, tipo, fechaPublicacion }),
    });
    setContenido((prev) => [...prev, data.contenido]);
  }
  async function cambiarEstadoContenido(id: string, estado: string) {
    const data = await api(`/api/portal-admin/clientes/${tenantId}/contenido/${id}`, {
      method: "PUT",
      body: JSON.stringify({ estado }),
    });
    setContenido((prev) => prev.map((c) => (c.id === id ? data.contenido : c)));
  }
  async function borrarContenido(id: string) {
    await api(`/api/portal-admin/clientes/${tenantId}/contenido/${id}`, { method: "DELETE" });
    setContenido((prev) => prev.filter((c) => c.id !== id));
  }

  async function subirArchivo(file: File) {
    const form = new FormData();
    form.append("archivo", file);
    const data = await api(`/api/portal-admin/clientes/${tenantId}/archivos`, { method: "POST", body: form });
    setArchivos((prev) => [data.archivo, ...prev]);
  }
  async function borrarArchivo(id: string) {
    await api(`/api/portal-admin/clientes/${tenantId}/archivos/${id}`, { method: "DELETE" });
    setArchivos((prev) => prev.filter((a) => a.id !== id));
  }

  if (loading) return <p className="text-muted">Cargando...</p>;
  if (!cliente) return <p className="text-muted">{message || "Cliente no encontrado."}</p>;

  return (
    <div className="flex flex-col gap-8 max-w-3xl">
      <PageHeader title={cliente.nombre} subtitle={`Portal del cliente — ${cliente.slug}`} />
      {message && <p className="text-sm text-muted">{message}</p>}

      <VincularUsuario onVincular={vincular} />

      <form onSubmit={guardarProyecto} className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-4">
        <p className="text-xs uppercase tracking-wide text-muted">📌 Ficha del proyecto</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <Campo label="Tipo de proyecto" value={proyecto.tipo_proyecto} onChange={(v) => setProyecto({ ...proyecto, tipo_proyecto: v })} />
          <Campo label="Fecha de inicio" type="date" value={proyecto.fecha_inicio} onChange={(v) => setProyecto({ ...proyecto, fecha_inicio: v })} />
          <Campo label="Fecha de finalización" type="date" value={proyecto.fecha_fin} onChange={(v) => setProyecto({ ...proyecto, fecha_fin: v })} />
          <Campo label="Contacto (nombre)" value={proyecto.contacto_nombre} onChange={(v) => setProyecto({ ...proyecto, contacto_nombre: v })} />
          <Campo label="Contacto (correo)" type="email" value={proyecto.contacto_email} onChange={(v) => setProyecto({ ...proyecto, contacto_email: v })} />
          <Campo label="Responsable ASYGNUZ" value={proyecto.responsable_nombre} onChange={(v) => setProyecto({ ...proyecto, responsable_nombre: v })} />
          <Campo label="Correo del responsable" type="email" value={proyecto.responsable_email} onChange={(v) => setProyecto({ ...proyecto, responsable_email: v })} />
        </div>
        <label className="flex flex-col gap-1 text-sm">
          Descripción del proyecto
          <textarea
            value={proyecto.descripcion ?? ""}
            onChange={(e) => setProyecto({ ...proyecto, descripcion: e.target.value })}
            rows={3}
          />
        </label>
        <button type="submit" className="rounded-md bg-accent text-accent-foreground font-medium py-2 w-fit px-4">
          Guardar ficha
        </button>
      </form>

      <ListaContenido contenido={contenido} onAgregar={agregarContenido} onCambiarEstado={cambiarEstadoContenido} onBorrar={borrarContenido} />
      <ListaEnlaces enlaces={enlaces} onAgregar={agregarEnlace} onBorrar={borrarEnlace} />
      <ListaArchivos archivos={archivos} onSubir={subirArchivo} onBorrar={borrarArchivo} />
      <ListaReuniones reuniones={reuniones} onAgregar={agregarReunion} onBorrar={borrarReunion} />
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
      className="flex flex-wrap items-end gap-2 rounded-lg border border-border bg-surface p-4"
    >
      <label className="flex flex-col gap-1 text-sm flex-1 min-w-[200px]">
        Vincular usuario (ya creado en Authentication → Users)
        <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="cliente@correo.com" />
      </label>
      <button type="submit" disabled={enviando} className="rounded-md border border-border bg-surface-alt px-3 py-2 text-sm disabled:opacity-60">
        {enviando ? "Vinculando..." : "Vincular"}
      </button>
    </form>
  );
}

function ListaContenido({
  contenido,
  onAgregar,
  onCambiarEstado,
  onBorrar,
}: {
  contenido: Contenido[];
  onAgregar: (titulo: string, tipo: string, fecha: string) => Promise<void>;
  onCambiarEstado: (id: string, estado: string) => Promise<void>;
  onBorrar: (id: string) => Promise<void>;
}) {
  const [titulo, setTitulo] = useState("");
  const [tipo, setTipo] = useState("");
  const [fecha, setFecha] = useState("");
  return (
    <section className="flex flex-col gap-3">
      <p className="text-xs uppercase tracking-wide text-muted">🚀 Parrilla de contenido</p>
      <div className="flex flex-col gap-2">
        {contenido.map((c) => (
          <div key={c.id} className="flex flex-wrap items-center gap-2 rounded-md border border-border bg-surface p-2 text-sm">
            <span className="font-medium flex-1 min-w-[140px]">{c.titulo}</span>
            {c.tipo && <span className="text-xs text-muted">{c.tipo}</span>}
            <select value={c.estado} onChange={(e) => onCambiarEstado(c.id, e.target.value)} className="text-xs">
              {ESTADOS_CONTENIDO.map((estado) => (
                <option key={estado} value={estado}>
                  {ESTADO_LABEL[estado]}
                </option>
              ))}
            </select>
            <button onClick={() => onBorrar(c.id)} className="text-xs text-muted hover:text-foreground">
              Borrar
            </button>
          </div>
        ))}
      </div>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          await onAgregar(titulo, tipo, fecha);
          setTitulo("");
          setTipo("");
          setFecha("");
        }}
        className="flex flex-wrap gap-2 items-end"
      >
        <input placeholder="Título" required value={titulo} onChange={(e) => setTitulo(e.target.value)} className="flex-1 min-w-[140px]" />
        <input placeholder="Tipo (reel, post...)" value={tipo} onChange={(e) => setTipo(e.target.value)} className="w-32" />
        <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
        <button type="submit" className="rounded-md border border-border bg-surface-alt px-3 py-2 text-sm">
          Agregar
        </button>
      </form>
    </section>
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
    <section className="flex flex-col gap-3">
      <p className="text-xs uppercase tracking-wide text-muted">🔗 Enlaces</p>
      <div className="flex flex-col gap-1">
        {enlaces.map((e) => (
          <div key={e.id} className="flex items-center gap-2 text-sm">
            <a href={e.url} target="_blank" rel="noreferrer" className="underline flex-1">
              {e.titulo}
            </a>
            <button onClick={() => onBorrar(e.id)} className="text-xs text-muted hover:text-foreground">
              Borrar
            </button>
          </div>
        ))}
      </div>
      <form
        onSubmit={async (ev) => {
          ev.preventDefault();
          await onAgregar(titulo, url);
          setTitulo("");
          setUrl("");
        }}
        className="flex flex-wrap gap-2"
      >
        <input placeholder="Título" required value={titulo} onChange={(e) => setTitulo(e.target.value)} className="flex-1 min-w-[140px]" />
        <input placeholder="https://..." required value={url} onChange={(e) => setUrl(e.target.value)} className="flex-1 min-w-[180px]" />
        <button type="submit" className="rounded-md border border-border bg-surface-alt px-3 py-2 text-sm">
          Agregar
        </button>
      </form>
    </section>
  );
}

function ListaArchivos({
  archivos,
  onSubir,
  onBorrar,
}: {
  archivos: Archivo[];
  onSubir: (file: File) => Promise<void>;
  onBorrar: (id: string) => Promise<void>;
}) {
  const [subiendo, setSubiendo] = useState(false);
  return (
    <section className="flex flex-col gap-3">
      <p className="text-xs uppercase tracking-wide text-muted">📁 Archivos</p>
      <div className="flex flex-col gap-1">
        {archivos.map((a) => (
          <div key={a.id} className="flex items-center gap-2 text-sm">
            <span className="flex-1">{a.nombre}</span>
            <button onClick={() => onBorrar(a.id)} className="text-xs text-muted hover:text-foreground">
              Borrar
            </button>
          </div>
        ))}
      </div>
      <input
        type="file"
        disabled={subiendo}
        onChange={async (e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          setSubiendo(true);
          try {
            await onSubir(file);
          } finally {
            setSubiendo(false);
            e.target.value = "";
          }
        }}
      />
    </section>
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
    <section className="flex flex-col gap-3">
      <p className="text-xs uppercase tracking-wide text-muted">📝 Reuniones</p>
      <div className="flex flex-col gap-2">
        {reuniones.map((r) => (
          <div key={r.id} className="rounded-md border border-border bg-surface p-2 text-sm">
            <div className="flex items-center gap-2">
              <span className="font-medium flex-1">{r.titulo}</span>
              <span className="text-xs text-muted">{r.fecha}</span>
              <button onClick={() => onBorrar(r.id)} className="text-xs text-muted hover:text-foreground">
                Borrar
              </button>
            </div>
            {r.notas && <p className="text-xs mt-1 whitespace-pre-wrap">{r.notas}</p>}
          </div>
        ))}
      </div>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          await onAgregar(titulo, fecha, notas);
          setTitulo("");
          setFecha("");
          setNotas("");
        }}
        className="flex flex-col gap-2"
      >
        <div className="flex flex-wrap gap-2">
          <input placeholder="Título" required value={titulo} onChange={(e) => setTitulo(e.target.value)} className="flex-1 min-w-[140px]" />
          <input type="date" required value={fecha} onChange={(e) => setFecha(e.target.value)} />
        </div>
        <textarea placeholder="Notas de la reunión" value={notas} onChange={(e) => setNotas(e.target.value)} rows={2} />
        <button type="submit" className="rounded-md border border-border bg-surface-alt px-3 py-2 text-sm w-fit">
          Agregar
        </button>
      </form>
    </section>
  );
}
