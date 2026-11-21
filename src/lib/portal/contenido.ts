import type { z } from "zod";
import type { actualizarContenidoSchema } from "@/lib/portal/schemas";

// Campos del body (camelCase, "" = borrar) → columnas de portal_contenido.
// Solo incluye lo que vino, para que un update no pise los demás campos.
export function columnasContenido(datos: z.infer<typeof actualizarContenidoSchema>): Record<string, unknown> {
  const {
    titulo,
    tipo,
    plataforma,
    fechaPublicacion,
    estado,
    notas,
    linkReferencia,
    link,
    hora,
    pilar,
    copy,
    linkDrive,
    campana,
    uso,
    procedimiento,
    duracion,
    gancho,
    cuerpo,
    cta,
    visibleCliente,
    guionVisibleCliente,
    aprobacionCliente,
    comentarioCliente,
  } = datos;

  const columnas: Record<string, unknown> = {};
  if (titulo !== undefined) columnas.titulo = titulo;
  if (tipo !== undefined) columnas.tipo = tipo || null;
  if (plataforma !== undefined) columnas.plataforma = plataforma || null;
  if (fechaPublicacion !== undefined) columnas.fecha_publicacion = fechaPublicacion || null;
  if (estado !== undefined) columnas.estado = estado;
  if (notas !== undefined) columnas.notas = notas || null;
  if (linkReferencia !== undefined) columnas.link_referencia = linkReferencia || null;
  if (link !== undefined) columnas.link = link || null;
  if (hora !== undefined) columnas.hora = hora || null;
  if (pilar !== undefined) columnas.pilar = pilar || null;
  if (copy !== undefined) columnas.copy = copy || null;
  if (linkDrive !== undefined) columnas.link_drive = linkDrive || null;
  if (campana !== undefined) columnas.campana = campana || null;
  if (uso !== undefined) columnas.uso = uso || null;
  if (procedimiento !== undefined) columnas.procedimiento = procedimiento || null;
  if (duracion !== undefined) columnas.duracion = duracion || null;
  if (gancho !== undefined) columnas.gancho = gancho || null;
  if (cuerpo !== undefined) columnas.cuerpo = cuerpo || null;
  if (cta !== undefined) columnas.cta = cta || null;
  if (visibleCliente !== undefined) columnas.visible_cliente = visibleCliente;
  if (guionVisibleCliente !== undefined) columnas.guion_visible_cliente = guionVisibleCliente;
  if (aprobacionCliente !== undefined) columnas.aprobacion_cliente = aprobacionCliente;
  if (comentarioCliente !== undefined) columnas.comentario_cliente = comentarioCliente || null;
  return columnas;
}
