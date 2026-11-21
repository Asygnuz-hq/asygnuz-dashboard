import { z } from "zod";

const slugRegex = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const texto = (max: number) => z.string().trim().min(1, "requerido").max(max);
const textoOpcional = (max: number) => z.string().trim().max(max).optional();
const fecha = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "fecha inválida (AAAA-MM-DD)");

export const crearClienteSchema = z.object({
  nombre: texto(80),
  slug: z.string().trim().toLowerCase().regex(slugRegex, "solo minúsculas, números y guiones"),
  subdominio: z
    .string()
    .trim()
    .toLowerCase()
    .regex(slugRegex, "solo minúsculas, números y guiones")
    .max(40)
    .optional()
    .or(z.literal("")),
  fechaInicio: fecha.optional().or(z.literal("")),
  fechaFin: fecha.optional().or(z.literal("")),
  tipoProyecto: textoOpcional(80),
  descripcion: textoOpcional(20000),
  contactoNombre: textoOpcional(120),
  contactoEmail: z.string().trim().toLowerCase().email("correo inválido").optional().or(z.literal("")),
  responsableNombre: textoOpcional(120),
  responsableEmail: z.string().trim().toLowerCase().email("correo inválido").optional().or(z.literal("")),
});

export const actualizarProyectoSchema = crearClienteSchema.omit({ nombre: true, slug: true }).extend({
  colorAcento: z
    .string()
    .trim()
    .regex(/^#[0-9a-fA-F]{6}$/, "color inválido (ej. #C9A45C)")
    .optional()
    .or(z.literal("")),
  taglinePortal: textoOpcional(180),
  splashHabilitado: z.boolean().optional(),
  logoUrl: z
    .string()
    .trim()
    .max(500)
    .refine(
      (v) => !v || v.startsWith("/") || v.startsWith("https://") || v.startsWith("http://"),
      "URL o ruta de logo inválida"
    )
    .optional()
    .or(z.literal("")),
});

export const vincularUsuarioSchema = z.object({
  email: z.string().trim().toLowerCase().email("correo inválido"),
  rol: z.enum(["admin", "miembro"]).default("admin"),
});

export const crearEnlaceSchema = z.object({
  titulo: texto(120),
  url: z.string().trim().url("URL inválida"),
});

export const crearReunionSchema = z.object({
  titulo: texto(120),
  fecha,
  notas: textoOpcional(4000),
});

// Orden = flujo real de una pieza: idea → grabación → edición → revisión del
// cliente → programada en la red → publicada.
export const ESTADOS_CONTENIDO = ["idea", "grabacion", "edicion", "revision", "programado", "publicado"] as const;
export const ESTADOS_APROBACION = ["pendiente", "aprobado", "cambios"] as const;

export const crearContenidoSchema = z.object({
  titulo: texto(160),
  tipo: textoOpcional(60),
  plataforma: textoOpcional(40),
  fechaPublicacion: fecha.optional().or(z.literal("")),
  estado: z.enum(ESTADOS_CONTENIDO).default("grabacion"),
  notas: textoOpcional(4000),
  linkReferencia: z.string().trim().url("URL inválida").optional().or(z.literal("")),
  link: z.string().trim().url("URL inválida").optional().or(z.literal("")),
  hora: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/, "hora inválida (HH:MM)").optional().or(z.literal("")),
  pilar: textoOpcional(60),
  copy: textoOpcional(4000),
  linkDrive: z.string().trim().url("URL inválida").optional().or(z.literal("")),
  // Parrilla v2 (estructura tipo Excel de Lumia)
  campana: textoOpcional(80),
  uso: textoOpcional(40),
  procedimiento: textoOpcional(80),
  duracion: textoOpcional(40),
  gancho: textoOpcional(2000),
  cuerpo: textoOpcional(4000),
  cta: textoOpcional(1000),
  visibleCliente: z.boolean().optional(),
  guionVisibleCliente: z.boolean().optional(),
  aprobacionCliente: z.enum(ESTADOS_APROBACION).optional(),
  comentarioCliente: textoOpcional(2000),
});

export const actualizarContenidoSchema = crearContenidoSchema.partial();

export const importarContenidoSchema = z.object({
  campana: textoOpcional(80),
  filas: z.array(crearContenidoSchema).min(1, "al menos una fila").max(250),
});

export const aprobacionClienteSchema = z.object({
  estado: z.enum(ESTADOS_APROBACION),
  comentario: textoOpcional(2000),
});

export const crearPilarSchema = z.object({
  icono: z.string().trim().min(1).max(8).default("🎯"),
  titulo: texto(80),
  texto: texto(600),
});

const columnaHojaSchema = z.object({
  key: z.string().trim().min(1).max(60),
  label: z.string().trim().min(1).max(80),
  tipo: z.enum(["texto", "select", "check", "numero", "puntaje", "oportunidad", "link"]),
  opciones: z.array(z.string().max(80)).max(30).optional(),
  ancho: z.string().max(24).optional(),
});

const filaHojaSchema = z
  .object({ id: z.string().min(1).max(80) })
  .catchall(z.union([z.string().max(4000), z.number(), z.boolean(), z.null()]));

export const crearHojaSchema = z.object({
  titulo: texto(100),
  tipo: z.enum(["tabla", "ideas", "benchmarking", "matriz", "tomas"]).default("tabla"),
  descripcion: textoOpcional(500),
  visibleCliente: z.boolean().default(false),
  columnas: z.array(columnaHojaSchema).max(30).default([]),
  filas: z.array(filaHojaSchema).max(400).default([]),
});

export const actualizarHojaSchema = crearHojaSchema.partial();

export const fuentesAvanceSchema = z.object({
  kaneoProyectos: z
    .array(z.object({ id: z.string().trim().min(1).max(64), nombre: texto(160) }))
    .max(20),
  metaConexiones: z.array(z.string().uuid()).max(20),
  presupuestoMensualPauta: z.number().nonnegative().nullable().optional(),
});
