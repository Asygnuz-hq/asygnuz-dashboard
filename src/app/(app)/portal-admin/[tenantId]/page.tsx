"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  CalendarDots,
  ChartBar,
  Eye,
  FolderSimple,
  Globe,
  InstagramLogo,
  Key,
  LinkSimple,
  Notebook,
  PaintBrush,
  Sparkle,
  Table,
  Target,
  UploadSimple,
} from "@phosphor-icons/react";
import { PageHeader } from "@/components/PageHeader";
import { ESTADOS_CONTENIDO } from "@/lib/portal/schemas";
import { TarjetaSeccion, Chip, ESTADO_LABEL, ESTADO_COLOR } from "@/components/portal/TarjetaSeccion";
import { FuentesAvance } from "@/components/portal/FuentesAvance";
import { SeccionInstagramCliente } from "@/components/portal/SeccionInstagramCliente";
import type { HojaTrabajo } from "@/lib/portal/hojasTipos";

type Cliente = {
  id: string;
  nombre: string;
  slug: string;
  subdominio: string | null;
  logo_url: string | null;
  color_acento: string | null;
  tagline_portal: string | null;
  splash_habilitado: boolean;
};
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
  aprobacion_cliente?: string | null;
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

const PALETAS_SUGERIDAS = [
  { label: "Dorado Lumia", hex: "#C9A45C" },
  { label: "Navy Médico", hex: "#16233D" },
  { label: "Esmeralda", hex: "#1D9E75" },
  { label: "Cobre", hex: "#C67D52" },
  { label: "Plata", hex: "#94A3B8" },
];

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
  const [subdominio, setSubdominio] = useState("");
  const [taglinePortal, setTaglinePortal] = useState("");
  const [splashHabilitado, setSplashHabilitado] = useState(true);
  const [logoUrl, setLogoUrl] = useState("");
  const [subiendoLogo, setSubiendoLogo] = useState(false);
  const [pilares, setPilares] = useState<Pilar[]>([]);
  const [enlaces, setEnlaces] = useState<Enlace[]>([]);
  const [reuniones, setReuniones] = useState<Reunion[]>([]);
  const [archivos, setArchivos] = useState<Archivo[]>([]);
  const [contenido, setContenido] = useState<Contenido[]>([]);
  const [hojas, setHojas] = useState<HojaTrabajo[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelado = false;
    api(`/api/portal-admin/clientes/${tenantId}`)
      .then((data) => {
        if (cancelado) return;
        setCliente(data.cliente);
        setProyecto(data.proyecto ?? PROYECTO_VACIO);
        setColorAcento(data.cliente?.color_acento ?? "");
        setSubdominio(data.cliente?.subdominio ?? data.cliente?.slug ?? "");
        setTaglinePortal(data.cliente?.tagline_portal ?? "");
        setSplashHabilitado(data.cliente?.splash_habilitado ?? true);
        setLogoUrl(data.cliente?.logo_url ?? "");
        setPilares(data.pilares ?? []);
        setEnlaces(data.enlaces ?? []);
        setReuniones(data.reuniones ?? []);
        setArchivos(data.archivos ?? []);
        setContenido(data.contenido ?? []);
        setHojas(data.hojas ?? []);
      })
      .catch((err) => {
        if (!cancelado) setMessage(err instanceof Error ? err.message : "Error cargando el cliente.");
      })
      .finally(() => {
        if (!cancelado) setLoading(false);
      });
    return () => {
      cancelado = true;
    };
  }, [tenantId]);

  async function guardarProyecto(e: React.FormEvent) {
    e.preventDefault();
    try {
      await api(`/api/portal-admin/clientes/${tenantId}`, {
        method: "PUT",
        body: JSON.stringify({
          ...proyecto,
          colorAcento,
          subdominio: subdominio.trim().toLowerCase(),
          taglinePortal: taglinePortal.trim(),
          splashHabilitado,
          logoUrl: logoUrl.trim(),
        }),
      });
      setCliente((prev) =>
        prev
          ? {
              ...prev,
              color_acento: colorAcento || null,
              subdominio: subdominio.trim().toLowerCase() || null,
              tagline_portal: taglinePortal.trim() || null,
              splash_habilitado: splashHabilitado,
              logo_url: logoUrl.trim() || null,
            }
          : prev
      );
      setMessage("Marca y ficha del portal guardadas.");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Error guardando.");
    }
  }

  async function subirLogo(file: File) {
    setSubiendoLogo(true);
    setMessage(null);
    try {
      const form = new FormData();
      form.append("logo", file);
      const data = await api(`/api/portal-admin/clientes/${tenantId}/logo`, {
        method: "POST",
        body: form,
      });
      setLogoUrl(data.logoUrl);
      setCliente((prev) => (prev ? { ...prev, logo_url: data.logoUrl } : prev));
      setMessage("Logo actualizado.");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "No se pudo subir el logo.");
    } finally {
      setSubiendoLogo(false);
    }
  }

  function avisarError(err: unknown, porDefecto: string) {
    setMessage(err instanceof Error ? err.message : porDefecto);
  }

  async function agregarPilar(icono: string, titulo: string, texto: string) {
    try {
      const data = await api(`/api/portal-admin/clientes/${tenantId}/pilares`, {
        method: "POST",
        body: JSON.stringify({ icono, titulo, texto }),
      });
      setPilares((prev) => [...prev, data.pilar]);
    } catch (err) {
      avisarError(err, "No se pudo agregar el pilar.");
    }
  }
  async function borrarPilar(id: string) {
    try {
      await api(`/api/portal-admin/clientes/${tenantId}/pilares/${id}`, { method: "DELETE" });
      setPilares((prev) => prev.filter((p) => p.id !== id));
    } catch (err) {
      avisarError(err, "No se pudo borrar el pilar.");
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
    const urlCompleta = /^[a-z][a-z0-9+.-]*:\/\//i.test(url.trim()) ? url.trim() : `https://${url.trim()}`;
    try {
      const data = await api(`/api/portal-admin/clientes/${tenantId}/enlaces`, {
        method: "POST",
        body: JSON.stringify({ titulo, url: urlCompleta }),
      });
      setEnlaces((prev) => [...prev, data.enlace]);
    } catch (err) {
      avisarError(err, "No se pudo agregar el enlace.");
    }
  }
  async function borrarEnlace(id: string) {
    try {
      await api(`/api/portal-admin/clientes/${tenantId}/enlaces/${id}`, { method: "DELETE" });
      setEnlaces((prev) => prev.filter((e) => e.id !== id));
    } catch (err) {
      avisarError(err, "No se pudo borrar el enlace.");
    }
  }

  async function agregarReunion(titulo: string, fecha: string, notas: string) {
    try {
      const data = await api(`/api/portal-admin/clientes/${tenantId}/reuniones`, {
        method: "POST",
        body: JSON.stringify({ titulo, fecha, notas }),
      });
      setReuniones((prev) => [data.reunion, ...prev]);
    } catch (err) {
      avisarError(err, "No se pudo agregar la reunión.");
    }
  }
  async function borrarReunion(id: string) {
    try {
      await api(`/api/portal-admin/clientes/${tenantId}/reuniones/${id}`, { method: "DELETE" });
      setReuniones((prev) => prev.filter((r) => r.id !== id));
    } catch (err) {
      avisarError(err, "No se pudo borrar la reunión.");
    }
  }

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

  const acento = colorAcento || "#C9A45C";
  const hojasVisibles = hojas.filter((h) => h.visible_cliente).length;
  const hojasInternas = hojas.length - hojasVisibles;

  return (
    <div className="flex flex-col gap-6 max-w-4xl pb-12">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <PageHeader
          title={cliente.nombre}
          subtitle={`${subdominio || cliente.slug}.asygnuz.com · Portal exclusivo`}
        />
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={`/portal-admin/${tenantId}/vista-previa`}
            className="inline-flex items-center gap-2 rounded-full bg-accent text-accent-foreground px-4 py-2 text-xs font-semibold"
          >
            <Eye size={15} />
            <span>Ver como lo ve el cliente</span>
          </Link>
        </div>
      </div>

      {message && (
        <div className="sticky top-2 z-20 rounded-xl border border-white/15 bg-surface-alt px-4 py-2.5 text-sm text-foreground shadow-lg">
          {message}
        </div>
      )}

      {/* Accesos rápidos a las 2 herramientas tipo Excel */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Link
          href={`/portal-admin/${tenantId}/parrilla`}
          className="portal-card portal-card-interactive rounded-2xl p-5 flex items-center justify-between gap-4"
        >
          <div className="flex flex-col gap-1">
            <span className="inline-flex items-center gap-2 text-sm font-semibold text-white">
              <CalendarDots size={17} style={{ color: acento }} />
              Parrilla de contenido
            </span>
            <p className="text-xs text-muted">
              {contenido.length} piezas · importar .xlsx, guiones y aprobaciones
            </p>
          </div>
          <ArrowRight size={16} className="text-muted shrink-0" />
        </Link>

        <Link
          href={`/portal-admin/${tenantId}/hojas`}
          className="portal-card portal-card-interactive rounded-2xl p-5 flex items-center justify-between gap-4"
        >
          <div className="flex flex-col gap-1">
            <span className="inline-flex items-center gap-2 text-sm font-semibold text-white">
              <Table size={17} style={{ color: acento }} />
              Hojas de trabajo (Excel)
            </span>
            <p className="text-xs text-muted">
              {hojasVisibles} visibles al cliente · {hojasInternas} internas ASYGNUZ
            </p>
          </div>
          <ArrowRight size={16} className="text-muted shrink-0" />
        </Link>
      </div>

      <TarjetaSeccion icono={<Key size={16} />} titulo="Acceso del cliente" acento={acento}>
        <VincularUsuario onVincular={vincular} />
      </TarjetaSeccion>

      {/* Identidad, Subdominio, Logo animado y Ficha */}
      <TarjetaSeccion
        icono={<PaintBrush size={16} />}
        titulo="Marca exclusiva, subdominio y ficha"
        subtitulo="Logo de apertura, subdominio propio y datos generales del proyecto"
        acento={acento}
      >
        <form onSubmit={guardarProyecto} className="flex flex-col gap-5">
          {/* Logo del cliente */}
          <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-4 flex flex-col gap-3">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="flex h-16 w-40 items-center justify-center rounded-xl border border-white/10 bg-[#050507] p-2.5">
                  {logoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={logoUrl} alt={cliente.nombre} className="max-h-11 w-auto object-contain" />
                  ) : (
                    <span className="text-xs text-white/35">Sin logo</span>
                  )}
                </div>
                <div className="flex flex-col gap-1">
                  <p className="text-sm font-medium text-white">Logo del portal y apertura</p>
                  <p className="text-xs text-muted">PNG o SVG con fondo transparente (ideal sobre fondo negro).</p>
                  <label className="inline-flex items-center gap-1.5 text-xs font-semibold cursor-pointer mt-1" style={{ color: acento }}>
                    <UploadSimple size={14} />
                    <span>{subiendoLogo ? "Subiendo..." : "Subir archivo de logo"}</span>
                    <input
                      type="file"
                      accept="image/png,image/svg+xml,image/webp,image/jpeg"
                      className="hidden"
                      disabled={subiendoLogo}
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) subirLogo(f);
                        e.target.value = "";
                      }}
                    />
                  </label>
                </div>
              </div>
            </div>
            <label className="flex flex-col gap-1 text-xs text-muted">
              O ruta/URL del logo (ej. /lumia/media/lumia-logo.png)
              <input
                type="text"
                value={logoUrl}
                onChange={(e) => setLogoUrl(e.target.value)}
                placeholder="/lumia/media/lumia-logo.png"
              />
            </label>
          </div>

          {/* Subdominio y apertura animada */}
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="flex flex-col gap-1 text-sm">
              <span className="inline-flex items-center gap-1.5">
                <Globe size={14} style={{ color: acento }} />
                Subdominio del portal
              </span>
              <div className="flex items-center gap-1.5">
                <input
                  type="text"
                  value={subdominio}
                  onChange={(e) => setSubdominio(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
                  placeholder="lumia"
                  className="flex-1"
                />
                <span className="text-xs text-muted shrink-0">.asygnuz.com</span>
              </div>
              {subdominio && (
                <a
                  href={`https://${subdominio}.asygnuz.com`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs underline mt-0.5"
                  style={{ color: acento }}
                >
                  https://{subdominio}.asygnuz.com ↗
                </a>
              )}
            </label>

            <label className="flex flex-col gap-1 text-sm">
              Tagline del portal (subtítulo bajo el logo)
              <input
                type="text"
                value={taglinePortal}
                onChange={(e) => setTaglinePortal(e.target.value)}
                placeholder="Clínica de autor · Diseño de sonrisa e implantología"
              />
            </label>
          </div>

          {/* Color de marca + swatches + toggle apertura */}
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-white/[0.08] bg-white/[0.02] p-3.5">
            <div className="flex flex-wrap items-center gap-3">
              <label className="flex items-center gap-2 text-xs text-muted">
                Color de marca
                <input
                  type="color"
                  value={colorAcento || "#C9A45C"}
                  onChange={(e) => setColorAcento(e.target.value)}
                  className="h-8 w-11 shrink-0 cursor-pointer p-0.5"
                />
              </label>
              <div className="flex items-center gap-1.5">
                {PALETAS_SUGERIDAS.map((p) => (
                  <button
                    key={p.hex}
                    type="button"
                    onClick={() => setColorAcento(p.hex)}
                    title={p.label}
                    className="h-6 w-6 rounded-full border border-white/25 cursor-pointer"
                    style={{ backgroundColor: p.hex }}
                  />
                ))}
              </div>
            </div>

            <label className="inline-flex items-center gap-2 text-xs text-foreground cursor-pointer">
              <input
                type="checkbox"
                checked={splashHabilitado}
                onChange={(e) => setSplashHabilitado(e.target.checked)}
              />
              <Sparkle size={14} style={{ color: acento }} />
              <span>Apertura cinematográfica con logo</span>
            </label>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Campo label="Tipo de proyecto" value={proyecto.tipo_proyecto} onChange={(v) => setProyecto({ ...proyecto, tipo_proyecto: v })} />
            <Campo label="Fecha de inicio" type="date" value={proyecto.fecha_inicio} onChange={(v) => setProyecto({ ...proyecto, fecha_inicio: v })} />
            <Campo label="Fecha de finalización" type="date" value={proyecto.fecha_fin} onChange={(v) => setProyecto({ ...proyecto, fecha_fin: v })} />
            <Campo label="Contacto (nombre)" value={proyecto.contacto_nombre} onChange={(v) => setProyecto({ ...proyecto, contacto_nombre: v })} />
            <Campo label="Contacto (correo)" type="email" value={proyecto.contacto_email} onChange={(v) => setProyecto({ ...proyecto, contacto_email: v })} />
            <Campo label="Responsable ASYGNUZ" value={proyecto.responsable_nombre} onChange={(v) => setProyecto({ ...proyecto, responsable_nombre: v })} />
            <Campo label="Correo del responsable" type="email" value={proyecto.responsable_email} onChange={(v) => setProyecto({ ...proyecto, responsable_email: v })} />
          </div>

          <label className="flex flex-col gap-1 text-sm">
            Descripción ejecutiva del proyecto
            <textarea
              value={proyecto.descripcion ?? ""}
              onChange={(e) => setProyecto({ ...proyecto, descripcion: e.target.value })}
              rows={3}
            />
          </label>
          <button type="submit" className="rounded-md bg-accent text-accent-foreground font-medium py-2 w-fit px-5 cursor-pointer">
            Guardar marca y ficha
          </button>
        </form>
      </TarjetaSeccion>

      <TarjetaSeccion icono={<ChartBar size={16} />} titulo="Fuentes del avance (Kaneo y Meta)" acento={acento}>
        <FuentesAvance tenantId={tenantId} />
      </TarjetaSeccion>

      <TarjetaSeccion icono={<InstagramLogo size={16} />} titulo="Instagram & Automatizaciones" acento={acento}>
        <SeccionInstagramCliente tenantId={tenantId} />
      </TarjetaSeccion>

      <TarjetaSeccion icono={<Target size={16} />} titulo="Pilares estratégicos" acento={acento}>
        <ListaPilares pilares={pilares} onAgregar={agregarPilar} onBorrar={borrarPilar} />
      </TarjetaSeccion>

      <TarjetaSeccion icono={<CalendarDots size={16} />} titulo="Parrilla de contenido" acento={acento}>
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

      <TarjetaSeccion icono={<LinkSimple size={16} />} titulo="Enlaces" acento={acento}>
        <ListaEnlaces enlaces={enlaces} onAgregar={agregarEnlace} onBorrar={borrarEnlace} />
      </TarjetaSeccion>

      <TarjetaSeccion icono={<FolderSimple size={16} />} titulo="Archivos" acento={acento}>
        <ListaArchivos archivos={archivos} onSubir={subirArchivo} onVer={verArchivo} onBorrar={borrarArchivo} />
      </TarjetaSeccion>

      <TarjetaSeccion icono={<Notebook size={16} />} titulo="Reuniones" acento={acento}>
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
        Correo (creado en Supabase → Authentication → Users)
        <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="cliente@correo.com" />
      </label>
      <button type="submit" disabled={enviando} className="rounded-md bg-accent text-accent-foreground px-4 py-2 text-sm font-medium disabled:opacity-60 cursor-pointer">
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
              <button onClick={() => onBorrar(e.id)} className="text-xs text-muted hover:text-foreground shrink-0 cursor-pointer">
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
        <button type="submit" className="rounded-md bg-accent text-accent-foreground px-3 py-2 text-sm font-medium cursor-pointer">
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
  const [icono, setIcono] = useState("01");
  const [titulo, setTitulo] = useState("");
  const [texto, setTexto] = useState("");
  return (
    <div className="flex flex-col gap-3">
      {pilares.length === 0 ? (
        <p className="text-sm text-muted">Sin pilares todavía.</p>
      ) : (
        <div className="grid gap-2 sm:grid-cols-2">
          {pilares.map((p, idx) => (
            <div key={p.id} className="rounded-lg bg-surface-alt p-3 text-sm">
              <div className="flex items-start justify-between gap-2">
                <span className="font-medium">
                  {String(idx + 1).padStart(2, "0")} · {p.titulo}
                </span>
                <button onClick={() => onBorrar(p.id)} className="text-xs text-muted hover:text-foreground shrink-0 cursor-pointer">
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
          setTitulo("");
          setTexto("");
        }}
        className="flex flex-col gap-2 pt-2 border-t border-border"
      >
        <div className="flex gap-2">
          <input value={icono} onChange={(e) => setIcono(e.target.value)} className="w-16 text-center" maxLength={4} />
          <input placeholder="Título (ej. Criterio del Dr. Alejo)" required value={titulo} onChange={(e) => setTitulo(e.target.value)} className="flex-1" />
        </div>
        <textarea placeholder="Texto del pilar" required value={texto} onChange={(e) => setTexto(e.target.value)} rows={2} />
        <button type="submit" className="rounded-md bg-accent text-accent-foreground px-3 py-2 text-sm font-medium w-fit cursor-pointer">
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
              <button onClick={() => onVer(a.id)} className="flex-1 truncate text-left underline decoration-dotted cursor-pointer">
                {a.nombre}
              </button>
              <button onClick={() => onBorrar(a.id)} className="text-xs text-muted hover:text-foreground shrink-0 cursor-pointer">
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
                <button onClick={() => onBorrar(r.id)} className="text-xs text-muted hover:text-foreground cursor-pointer">
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
        <button type="submit" className="rounded-md bg-accent text-accent-foreground px-3 py-2 text-sm font-medium w-fit cursor-pointer">
          Agregar
        </button>
      </form>
    </div>
  );
}
