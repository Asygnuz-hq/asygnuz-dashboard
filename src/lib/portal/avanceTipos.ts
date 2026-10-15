// Tipos del Panel de Avance y Métricas Glass del Portal de Cliente (Growth).
// Compartidos entre servidor (src/lib/portal/avance.ts) y cliente (src/components/metricas/).

export type PeriodoMetricas = "7d" | "30d" | "90d" | "mes";

export type DeltaComparativo = {
  actual: number;
  anterior: number;
  delta: number;
  deltaPct: number;
  esPositivo: boolean;
};

export type TareaAvance = {
  id?: string;
  titulo: string;
  estado: "hecha" | "en-curso" | "en-revision" | "por-hacer";
  fechaLimite: string | null;
  proyecto: string;
  isMilestone?: boolean;
};

export type BloqueTrabajo = {
  conectado: boolean;
  totalTareas: number;
  hechas: number;
  enCurso: number;
  enRevision: number;
  porHacer: number;
  porcentajeAvance: number;
  atrasadas: number;
  tareasAtrasadas: TareaAvance[];
  ultimasHechas: TareaAvance[];
  enMarcha: TareaAvance[];
  proximas: TareaAvance[];
  entregasPorSemana: { semana: string; completadas: number }[];
  hitos: TareaAvance[];
  porcentajeATiempo: number | null;
  diasPromedioEntrega: number | null;
  error: string | null;
};

export type PiezaContenido = {
  id: string;
  titulo: string;
  formato: string;
  estado: "idea" | "grabacion" | "edicion" | "revision" | "programado" | "publicado";
  fechaPublicacion: string | null;
  copy?: string | null;
};

export type BloqueContenido = {
  planeadas: number;
  enProduccion: number;
  publicadasParrilla: number;
  publicadasInstagramMes: number | null;
  calendarioMes: { dia: number; piezas: PiezaContenido[] }[];
};

export type CampanaAvance = {
  id?: string;
  nombre: string;
  gasto: number;
  alcance: number;
  impresiones?: number;
  clics: number;
  ctr: number;
  resultados: number;
  cpr: number;
};

export type AnuncioGanador = {
  id: string;
  nombre: string;
  campana: string;
  imagenUrl: string | null;
  estado: "WINNER" | "TESTING" | "FATIGUE";
  estadoTexto: string;
  inversion: number;
  impresiones: number;
  clics: number;
  ctr: number;
  resultados: number;
  cpr: number;
  hookRate: number; // % visualización >3s
  holdRate: number; // % retención continua
  frecuencia: number;
  fatigaDiagnostico: string;
  audiencia?: string;
};

export type DiagnosticoGrowth = {
  tipo: "winner" | "scale" | "warning";
  titulo: string;
  descripcion: string;
  accion: string;
};

export type BloquePauta = {
  conectado: boolean;
  moneda: string | null;
  gasto: number;
  gastoDelta: DeltaComparativo | null;
  impresiones: number;
  alcance: number;
  clics: number;
  ctrPromedio: number;
  resultados: number;
  resultadosDelta: DeltaComparativo | null;
  cprPromedio: number;
  cprDelta: DeltaComparativo | null;
  presupuestoPlaneado: number | null;
  porcentajePresupuesto: number | null;
  frecuenciaPromedio: number;
  semaforoFrecuencia: "verde" | "ambar" | "rojo";
  serieDiaria: { fecha: string; gasto: number; resultados: number }[];
  embudo: {
    etapa: string;
    valor: number;
    porcentajePaso: number;
    tasaConversion: number;
  }[];
  ubicaciones: { nombre: string; porcentaje: number }[];
  campanas: CampanaAvance[];
  anunciosGanadores: AnuncioGanador[];
  diagnosticos: DiagnosticoGrowth[];
  errores: string[];
};

export type PuntoSerie = { fecha: string; valor: number };

export type PublicacionInstagram = {
  id: string;
  caption: string | null;
  media_type: "IMAGE" | "VIDEO" | "CAROUSEL_ALBUM";
  media_product_type: string;
  timestamp: string;
  permalink: string;
  imagenUrl: string | null;
  alcance: number;
  impresiones: number;
  likes: number;
  comments: number;
  shares: number;
  saved: number;
  views: number;
  tasaInteraccion: number;
  pilar?: string;
  avgWatchTime?: number | null;
  skipRate?: number | null;
};

export type BloqueCuenta = {
  conectado: boolean;
  usuario: string | null;
  seguidoresTotales: number | null;
  seguidoresGanados: number | null;
  seguidoresDelta: DeltaComparativo | null;
  alcancePeriodo: number | null;
  alcanceDelta: DeltaComparativo | null;
  visitasPerfilPeriodo: number | null;
  clicsEnlacePeriodo: number | null;
  tasaInteraccionPromedio: number | null;
  serieSeguidores: PuntoSerie[];
  serieNuevos: PuntoSerie[];
  serieAlcance: PuntoSerie[];
  serieVistas: PuntoSerie[];
  seriePerfil: PuntoSerie[];
  serieClics: PuntoSerie[];
  interaccionesSemanales: {
    semana: string;
    likes: number;
    comentarios: number;
    guardados: number;
    compartidos: number;
  }[];
  demografia: {
    genero: { nombre: string; valor: number }[];
    edad: { rango: string; porcentaje: number }[];
    ciudades: { ciudad: string; porcentaje: number }[];
  } | null;
  formatos: {
    distribucion: { formato: string; porcentaje: number }[];
    rendimiento: { formato: string; alcancePromedio: number; guardadosPromedio: number }[];
  };
  mapaCalor: { dia: string; franja: string; intensidad: number }[];
  topPublicaciones: PublicacionInstagram[];
  retencionReels: { reelTitulo: string; avgWatchTime: number; skipRate: number }[];
  errores: string[];
};

export type MetasPeriodo = {
  metaCitas: { objetivo: number; actual: number; porcentaje: number };
  metaAlcance: { objetivo: number; actual: number; porcentaje: number };
  retencionObjetivo: { objetivo: number; actual: number; estado: string };
};

export type AvanceCliente = {
  generadoEn: string;
  periodo: PeriodoMetricas;
  resumenHumano: string;
  metas: MetasPeriodo;
  trabajo: BloqueTrabajo;
  contenido: BloqueContenido;
  pauta: BloquePauta;
  cuenta: BloqueCuenta;
};
