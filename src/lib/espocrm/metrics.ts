import { fetchLeads, fetchOpportunities } from "./client";

// Únicas etapas reales del pipeline hoy (ver Opportunity.stage en EspoCRM,
// reetiquetado manualmente 2026-08-17 sobre los valores internos de fábrica
// prospecting/qualification/proposal/negotiation/closedWon/closedLost).
const ETAPA_ORDEN = ["Nuevo", "Contactado", "Reunión agendada", "Propuesta enviada", "Cliente", "Perdido"];

export type PuntoOrigen = { origen: string; total: number };
export type PuntoCategoria = { categoria: string; total: number };
export type PuntoEtapa = { etapa: string; total: number; valor: number };

export type MetricasCrecimiento = {
  generadoEn: string;
  leadsTotal: number;
  leadsNuevosSemana: number;
  leadsNuevosMes: number;
  tasaContacto: number; // 0..1 — leads que ya no están en status "New"
  tiempoRespuestaPromedioHoras: number | null; // aproximado: createdAt -> modifiedAt de leads ya trabajados
  porCategoria: PuntoCategoria[];
  porOrigen: PuntoOrigen[];
  porEtapa: PuntoEtapa[];
  valorPipelineTotal: number;
  leadsRecientes: { id: string; nombre: string; estado: string; categoria: string | null; creadoHace: number }[];
};

function diasDesde(iso: string): number {
  // EspoCRM devuelve createdAt en hora del servidor sin offset explícito;
  // en los primeros minutos tras crearse puede leerse como "futuro" por
  // redondeo de zona horaria — se recorta a 0 en vez de mostrar negativos.
  return Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / (1000 * 60 * 60 * 24)));
}

function inicioDeSemana(): Date {
  const d = new Date();
  const dia = d.getDay();
  const diff = d.getDate() - dia + (dia === 0 ? -6 : 1); // lunes como inicio
  return new Date(d.getFullYear(), d.getMonth(), diff);
}

function inicioDeMes(): Date {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

// La categoría del negocio (dentista, gimnasio, etc.) viaja embebida en la
// descripción del Lead ("Categoria: dental_clinic - 4.9 estrellas...") porque
// el campo Source de EspoCRM es un enum cerrado y no había tiempo de abrir
// uno nuevo para industry. Se extrae con una expresión simple.
function extraerCategoria(descripcion: string | null): string | null {
  if (!descripcion) return null;
  const m = descripcion.match(/Categoria:\s*([a-z_]+)/i);
  return m ? m[1] : null;
}

export async function calcularMetricasCrecimiento(): Promise<MetricasCrecimiento> {
  const [leads, opportunities] = await Promise.all([fetchLeads(), fetchOpportunities()]);

  const inicioSemana = inicioDeSemana().getTime();
  const inicioMes = inicioDeMes().getTime();

  const leadsNuevosSemana = leads.filter((l) => new Date(l.createdAt).getTime() >= inicioSemana).length;
  const leadsNuevosMes = leads.filter((l) => new Date(l.createdAt).getTime() >= inicioMes).length;

  const trabajados = leads.filter((l) => l.status !== "New");
  const tasaContacto = leads.length > 0 ? trabajados.length / leads.length : 0;

  const tiemposRespuesta = trabajados
    .map((l) => new Date(l.modifiedAt).getTime() - new Date(l.createdAt).getTime())
    .filter((ms) => ms > 0);
  const tiempoRespuestaPromedioHoras =
    tiemposRespuesta.length > 0
      ? tiemposRespuesta.reduce((a, b) => a + b, 0) / tiemposRespuesta.length / (1000 * 60 * 60)
      : null;

  const categoriaMap = new Map<string, number>();
  for (const l of leads) {
    const cat = extraerCategoria(l.description) ?? "Sin categoría";
    categoriaMap.set(cat, (categoriaMap.get(cat) ?? 0) + 1);
  }
  const porCategoria = Array.from(categoriaMap.entries())
    .map(([categoria, total]) => ({ categoria, total }))
    .sort((a, b) => b.total - a.total);

  const origenMap = new Map<string, number>();
  for (const l of leads) {
    const origen = l.source ?? "Sin origen";
    origenMap.set(origen, (origenMap.get(origen) ?? 0) + 1);
  }
  const porOrigen = Array.from(origenMap.entries())
    .map(([origen, total]) => ({ origen, total }))
    .sort((a, b) => b.total - a.total);

  const etapaMap = new Map<string, { total: number; valor: number }>();
  for (const o of opportunities) {
    const acc = etapaMap.get(o.stage) ?? { total: 0, valor: 0 };
    acc.total += 1;
    acc.valor += o.amount ?? 0;
    etapaMap.set(o.stage, acc);
  }
  const porEtapa = ETAPA_ORDEN.filter((e) => etapaMap.has(e)).map((etapa) => ({
    etapa,
    ...etapaMap.get(etapa)!,
  }));
  const valorPipelineTotal = opportunities
    .filter((o) => o.stage !== "Cliente" && o.stage !== "Perdido")
    .reduce((a, o) => a + (o.amount ?? 0), 0);

  const leadsRecientes = [...leads]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 8)
    .map((l) => ({
      id: l.id,
      nombre: l.accountName ?? l.name,
      estado: l.status,
      categoria: extraerCategoria(l.description),
      creadoHace: diasDesde(l.createdAt),
    }));

  return {
    generadoEn: new Date().toISOString(),
    leadsTotal: leads.length,
    leadsNuevosSemana,
    leadsNuevosMes,
    tasaContacto,
    tiempoRespuestaPromedioHoras,
    porCategoria,
    porOrigen,
    porEtapa,
    valorPipelineTotal,
    leadsRecientes,
  };
}
