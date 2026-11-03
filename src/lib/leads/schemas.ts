import { z } from "zod";

export const ESTADOS_LEAD = ["nuevo", "contactado", "calificado", "descartado"] as const;

export const leadWebSchema = z.object({
  nombre: z.string().trim().min(2).max(120),
  email: z.string().trim().toLowerCase().email().max(254),
  asunto: z.string().trim().min(1).max(200),
  mensaje: z.string().trim().min(1).max(5000),
  oferta: z.string().trim().max(60).optional(),
  origen: z.string().trim().max(300).optional(),
  utm: z.record(z.string().max(40), z.string().max(200)).optional(),
  autorizacion: z.literal(true),
});

export const actualizarLeadSchema = z.object({ estado: z.enum(ESTADOS_LEAD) });
