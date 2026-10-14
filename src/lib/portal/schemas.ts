import { z } from "zod";

const slugRegex = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const texto = (max: number) => z.string().trim().min(1, "requerido").max(max);
const textoOpcional = (max: number) => z.string().trim().max(max).optional();
const fecha = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "fecha inválida (AAAA-MM-DD)");

export const crearClienteSchema = z.object({
  nombre: texto(80),
  slug: z.string().trim().toLowerCase().regex(slugRegex, "solo minúsculas, números y guiones"),
  fechaInicio: fecha.optional().or(z.literal("")),
  fechaFin: fecha.optional().or(z.literal("")),
  tipoProyecto: textoOpcional(80),
  // Algunos proyectos traen un brief largo (viabilidad, mercado...) — 2000
  // se quedaba corto y bloqueaba guardar desde la pantalla de gestión.
  descripcion: textoOpcional(20000),
  contactoNombre: textoOpcional(120),
  contactoEmail: z.string().trim().toLowerCase().email("correo inválido").optional().or(z.literal("")),
  responsableNombre: textoOpcional(120),
  responsableEmail: z.string().trim().toLowerCase().email("correo inválido").optional().or(z.literal("")),
});

export const actualizarProyectoSchema = crearClienteSchema.omit({ nombre: true, slug: true }).extend({
  // Vive en tenants (marca del cliente), no en portal_proyecto — se maneja
  // junto con la ficha por simplicidad de la pantalla, no por el modelo de
  // datos. "" borra el color (vuelve al verde genérico de ASYGNUZ).
  colorAcento: z
    .string()
    .trim()
    .regex(/^#[0-9a-fA-F]{6}$/, "color inválido (ej. #16233D)")
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

export const ESTADOS_CONTENIDO = ["grabacion", "revision", "edicion", "publicado"] as const;

export const crearContenidoSchema = z.object({
  titulo: texto(160),
  tipo: textoOpcional(60),
  plataforma: textoOpcional(40),
  fechaPublicacion: fecha.optional().or(z.literal("")),
  estado: z.enum(ESTADOS_CONTENIDO).default("grabacion"),
  notas: textoOpcional(4000),
  // Referencia: el video/imagen que se va a imitar/grabar. link: la
  // publicación ya hecha. Son cosas distintas, con su propio campo cada una.
  linkReferencia: z.string().trim().url("URL inválida").optional().or(z.literal("")),
  link: z.string().trim().url("URL inválida").optional().or(z.literal("")),
});

export const actualizarContenidoSchema = crearContenidoSchema.partial();

export const crearPilarSchema = z.object({
  icono: z.string().trim().min(1).max(8).default("🎯"),
  titulo: texto(80),
  texto: texto(600),
});

// Fuentes del Panel de Avance de un cliente: qué proyectos de Kaneo y qué
// conexiones de Meta son suyos. Se reemplaza la lista completa en cada PUT.
export const fuentesAvanceSchema = z.object({
  kaneoProyectos: z
    .array(z.object({ id: z.string().trim().min(1).max(64), nombre: texto(160) }))
    .max(20),
  metaConexiones: z.array(z.string().uuid()).max(20),
});
