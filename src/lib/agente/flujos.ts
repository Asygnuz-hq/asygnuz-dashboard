import { z } from "zod";
import { normalizarTexto } from "@/lib/bandeja/texto";
import type { Denegado } from "@/lib/agente/permisos";

// Meta rechaza los mensajes de Instagram de más de 1000 bytes.
const MAX_BYTES_DM = 1000;
// Lo que ocupa el enlace de rastreo en el DM: dominio de la cuenta + /r/<uuid>.
const BYTES_ENLACE = 80;

const botonSchema = z.object({
  titulo: z.string().trim().min(1).max(80),
  url: z.string().trim().url().refine((u) => u.startsWith("https://"), { message: "La URL debe usar https://" }),
});

// Una palabra sin letras ni números ("!!!") queda vacía al normalizar y nunca dispararía el flujo.
const palabrasSchema = z
  .array(
    z.string().trim().min(1).max(50).refine((p) => normalizarTexto(p) !== "", {
      message: "La palabra clave necesita letras o números",
    })
  )
  .min(1)
  .max(20)
  .transform((palabras) => [...new Map(palabras.map((p) => [normalizarTexto(p), p])).values()]);

const nombreSchema = z.string().trim().min(1).max(100);
const aplicaASchema = z.enum(["todas", "comentarios", "mensajes"]);
const respuestaPrivadaSchema = z.string().trim().min(1);
const respuestaPublicaSchema = z.array(z.string().trim().min(1).max(2200)).max(20);
const botonesSchema = z.array(botonSchema).max(5);

// Nace apagado: un flujo activo responde a personas reales y prenderlo debe ser explícito.
export const crearFlujoSchema = z
  .object({
    nombre: nombreSchema,
    conexion_id: z.string().uuid().optional(),
    palabras_clave: palabrasSchema,
    aplica_a: aplicaASchema.default("todas"),
    respuesta_privada: respuestaPrivadaSchema,
    respuesta_publica: respuestaPublicaSchema.default([]),
    botones: botonesSchema.default([]),
    activo: z.boolean().default(false),
  })
  .strict();

// strict: tenant_id y conexion_id no se cambian, así un flujo no puede pasar a otra cuenta.
export const actualizarFlujoSchema = z
  .object({
    nombre: nombreSchema.optional(),
    palabras_clave: palabrasSchema.optional(),
    aplica_a: aplicaASchema.optional(),
    respuesta_privada: respuestaPrivadaSchema.optional(),
    respuesta_publica: respuestaPublicaSchema.optional(),
    botones: botonesSchema.optional(),
    activo: z.boolean().optional(),
  })
  .strict()
  .refine((campos) => Object.keys(campos).length > 0, { message: "No hay campos para actualizar" });

type Boton = { titulo: string; url: string };
type FlujoActivo = { id: string; nombre: string; palabras_clave: string[]; aplica_a: string };
type LinkBase = { id: string; url_destino: string; titulo: string | null };

// Mismo formato que armarTextoConBotones en bandeja/procesar.ts.
export function errorDeLargoDm(respuestaPrivada: string, botones: Boton[]): string | null {
  const bytes =
    Buffer.byteLength(respuestaPrivada) +
    botones.reduce((total, b) => total + Buffer.byteLength(`\n\n👉 ${b.titulo}: `) + BYTES_ENLACE, 0);
  if (bytes <= MAX_BYTES_DM) return null;
  return `El DM con sus botones ocupa unos ${bytes} bytes y Meta permite ${MAX_BYTES_DM}`;
}

// El tenant nunca viene del cliente: la cuenta debe ser una de las que tiene vinculadas el portal.
export function resolverConexion(vinculadas: string[], pedida?: string): { conexionId: string } | Denegado {
  if (vinculadas.length === 0) {
    return { error: "Este portal no tiene una cuenta de Instagram vinculada: vincúlala en /portal-admin", status: 409 };
  }
  if (pedida) {
    return vinculadas.includes(pedida)
      ? { conexionId: pedida }
      : { error: "Esa cuenta no pertenece a este portal", status: 403 };
  }
  if (vinculadas.length > 1) {
    return { error: "El portal tiene varias cuentas: indica conexion_id (ver contexto)", status: 400 };
  }
  return { conexionId: vinculadas[0] };
}

function palabrasChocan(a: string, b: string): boolean {
  const [x, y] = [` ${normalizarTexto(a)} `, ` ${normalizarTexto(b)} `];
  return x.includes(y) || y.includes(x);
}

// El motor responde con el primer flujo activo que coincida, sin orden definido: dos que
// compiten por la misma palabra harían que la respuesta dependiera del azar.
export function errorDeChoquePalabras(
  flujo: { id?: string; palabras_clave: string[]; aplica_a: string },
  activos: FlujoActivo[]
): string | null {
  for (const otro of activos) {
    if (otro.id === flujo.id) continue;
    const mismoCanal = flujo.aplica_a === "todas" || otro.aplica_a === "todas" || flujo.aplica_a === otro.aplica_a;
    if (!mismoCanal) continue;
    const palabra = flujo.palabras_clave.find((p) => otro.palabras_clave.some((o) => palabrasChocan(p, o)));
    if (palabra) return `La palabra "${palabra}" ya la responde el flujo activo "${otro.nombre}"`;
  }
  return null;
}

// Solo toca lo que cambió: el id del link base no debe perderse si el botón sigue igual,
// porque de él cuelgan sus clics.
export function cambiosDeEnlaces(base: LinkBase[], botones: Boton[]): { borrar: string[]; crear: Boton[] } {
  const clave = (url: string, titulo: string | null) => JSON.stringify([url, titulo]);
  const actuales = new Set(botones.map((b) => clave(b.url, b.titulo)));
  const existentes = new Set(base.map((l) => clave(l.url_destino, l.titulo)));
  return {
    borrar: base.filter((l) => !actuales.has(clave(l.url_destino, l.titulo))).map((l) => l.id),
    crear: botones.filter((b) => !existentes.has(clave(b.url, b.titulo))),
  };
}

type LinkRastreo = { id: string; flujo_id: string | null; titulo: string | null; url_destino: string; clics_count: number; por_envio: boolean };

// Un renglón por botón: los clics de los links de cada envío se suman a su link base.
export function enlacesConClics(links: LinkRastreo[]) {
  const base = links
    .filter((l) => !l.por_envio)
    .map(({ id, flujo_id, titulo, url_destino, clics_count }) => ({ id, flujo_id, titulo, url_destino, clics_count }));
  for (const envio of links.filter((l) => l.por_envio)) {
    const destino = base.find((b) => b.flujo_id === envio.flujo_id && b.url_destino === envio.url_destino);
    if (destino) destino.clics_count += envio.clics_count;
  }
  return base;
}
