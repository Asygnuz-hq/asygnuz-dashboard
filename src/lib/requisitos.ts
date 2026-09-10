import { createClient } from "@/lib/supabase/client";

// ── Vocabulario ────────────────────────────────────────────────────────

export const ESTADOS_TRAZABILIDAD = [
  { value: "inicio", label: "Inicio" },
  { value: "cotizacion", label: "Cotización" },
  { value: "desarrollo", label: "Desarrollo" },
  { value: "pruebas", label: "Pruebas" },
  { value: "finalizado", label: "Finalizado" },
  { value: "bloqueado", label: "Bloqueado" },
] as const;

export const ESTADO_TRAZABILIDAD_COLOR: Record<string, string> = {
  inicio: "#8b93a6",
  cotizacion: "#c9a227",
  desarrollo: "#3c5e99",
  pruebas: "#7c5cbf",
  finalizado: "#1d9e75",
  bloqueado: "#d9534f",
};

export const ESTADOS_HISTORIA = [
  "Borrador",
  "En Revisión",
  "Aprobada",
  "En Desarrollo",
  "Lista",
] as const;

export const FASES_IMPLEMENTACION = ["Fase 1", "Fase 2", "Fase 3", "Fase 4", "Backlog"];

export const TIPOS_CAMBIO = [
  "Nueva funcionalidad",
  "Mejora",
  "Corrección",
  "Automatización",
  "Integración",
  "Refactor",
  "Investigación",
];

// ── Tipos ──────────────────────────────────────────────────────────────

export type Requisito = {
  id: string;
  cliente_id: string | null;
  numero: number;
  descripcion: string;
  estado_trazabilidad: string;
  pct_planificado: number;
  pct_ejecutado: number;
  fecha_inicio: string | null;
  fecha_fin: string | null;
  fase_implementacion: string | null;
  plataforma_software: string | null;
  responsable_id: string | null;
  tipo_cambio: string | null;
  prioridad: number;
  kaneo_task_id: string | null;
  created_at: string;
  updated_at: string;
};

export type Historia = {
  id: string;
  requisito_id: string;
  codigo: string;
  estado: string;
  como: string;
  quiero: string;
  para: string;
  comportamiento_actual: string;
  comportamiento_esperado: string;
  criterios_aceptacion: string;
  reglas_negocio: string;
  requisitos_funcionales: string;
  definicion_terminado: string;
  kaneo_task_id: string | null;
  created_at: string;
  updated_at: string;
};

export type OpcionSimple = { id: string; nombre: string };

// ── Lecturas ───────────────────────────────────────────────────────────

export async function cargarCatalogos(): Promise<{
  clientes: OpcionSimple[];
  equipo: OpcionSimple[];
}> {
  const supabase = createClient();
  const [{ data: clientes }, { data: equipo }] = await Promise.all([
    supabase.from("clientes").select("id, nombre").is("eliminado_en", null).order("nombre"),
    supabase
      .from("equipo")
      .select("id, nombre")
      .eq("activo", true)
      .is("eliminado_en", null)
      .order("nombre"),
  ]);
  return {
    clientes: (clientes as OpcionSimple[]) ?? [],
    equipo: (equipo as OpcionSimple[]) ?? [],
  };
}

export async function cargarRequisitos(clienteId: string | null): Promise<Requisito[]> {
  const supabase = createClient();
  let q = supabase.from("requisitos_negocio").select("*").order("numero", { ascending: true });
  if (clienteId) q = q.eq("cliente_id", clienteId);
  const { data } = await q;
  return (data as Requisito[]) ?? [];
}

export async function cargarHistorias(requisitoId: string): Promise<Historia[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("historias_usuario")
    .select("*")
    .eq("requisito_id", requisitoId)
    .order("codigo", { ascending: true });
  return (data as Historia[]) ?? [];
}

// ── Escrituras ─────────────────────────────────────────────────────────

export type RequisitoInput = Omit<
  Requisito,
  "id" | "numero" | "kaneo_task_id" | "created_at" | "updated_at"
>;

export async function crearRequisito(input: RequisitoInput): Promise<Requisito> {
  const supabase = createClient();
  // numero = consecutivo por cliente
  const existentes = await cargarRequisitos(input.cliente_id);
  const numero = existentes.reduce((max, r) => Math.max(max, r.numero), 0) + 1;
  const { data, error } = await supabase
    .from("requisitos_negocio")
    .insert({ ...input, numero })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as Requisito;
}

export async function actualizarRequisito(
  id: string,
  input: Partial<RequisitoInput>
): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from("requisitos_negocio")
    .update({ ...input, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw new Error(error.message);
}

export async function borrarRequisito(id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("requisitos_negocio").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export type HistoriaInput = Omit<
  Historia,
  "id" | "kaneo_task_id" | "created_at" | "updated_at"
>;

export async function crearHistoria(input: HistoriaInput): Promise<Historia> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("historias_usuario")
    .insert(input)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as Historia;
}

export async function actualizarHistoria(
  id: string,
  input: Partial<HistoriaInput>
): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from("historias_usuario")
    .update({ ...input, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw new Error(error.message);
}

export async function borrarHistoria(id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("historias_usuario").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

// Siguiente código HU-NN para un requisito, mirando los que ya tiene.
export function siguienteCodigoHistoria(historias: Historia[]): string {
  const nums = historias
    .map((h) => Number.parseInt(h.codigo.replace(/^HU-?/i, ""), 10))
    .filter((n) => !Number.isNaN(n));
  const siguiente = (nums.length ? Math.max(...nums) : 0) + 1;
  return `HU-${String(siguiente).padStart(2, "0")}`;
}
