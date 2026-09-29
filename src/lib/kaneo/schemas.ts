import { z } from "zod";

// Un solo lugar con los estados/prioridades válidos de Kaneo — mismo set que
// src/lib/kaneo/labels.ts (no se importa de ahí porque ese archivo trae
// también colores/textos que no hacen falta aquí).
export const KANEO_ESTADOS = ["to-do", "in-progress", "in-review", "done"] as const;
export const KANEO_PRIORIDADES = ["no-priority", "low", "medium", "high", "urgent"] as const;

const idNoVacio = z.string().trim().min(1, "requerido");

export const crearTareaSchema = z.object({
  projectId: idNoVacio,
  title: idNoVacio,
  status: z
    .string()
    .optional()
    .transform((v) => (v && v.trim() ? v.trim() : "to-do")),
  priority: z.enum(KANEO_PRIORIDADES).optional(),
  description: z.string().optional(),
});

export const crearComentarioSchema = z.object({
  content: z.string().trim().min(1, "requerido"),
});

export const actualizarDescripcionSchema = z.object({
  description: z.string(),
});

export const actualizarPrioridadSchema = z.object({
  priority: z.enum(KANEO_PRIORIDADES, { message: "priority inválida" }),
});

export const actualizarEstadoSchema = z.object({
  status: z.enum(KANEO_ESTADOS, { message: "status inválido" }),
});

export const actualizarTituloSchema = z.object({
  title: idNoVacio,
});
