import { z } from "zod";

export const confirmarConexionSchema = z.object({
  pendienteId: z.string().uuid("id inválido"),
  indice: z.number().int().nonnegative(),
});

export const desconectarConexionSchema = z.object({
  id: z.string().uuid("id inválido"),
});

export const publicacionNotaSchema = z.object({
  conexionId: z.string().uuid("id inválido"),
  mediaId: z.string().trim().min(1, "requerido"),
  // Vacía o ausente borra la nota (comportamiento previo, ver route.ts).
  etiqueta: z.string().optional(),
});
