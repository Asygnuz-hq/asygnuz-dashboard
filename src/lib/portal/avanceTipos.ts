// Tipos del Panel de Avance compartidos entre servidor (src/lib/portal/avance.ts)
// y la vista (VistaAvance). Sin dependencias de servidor a propósito.

export type TareaAvance = {
  titulo: string;
  estado: "hecha" | "en-curso" | "en-revision" | "por-hacer";
  fechaLimite: string | null;
  proyecto: string;
};

export type BloqueTrabajo = {
  conectado: boolean;
  hechas: number;
  enCurso: number;
  enRevision: number;
  porHacer: number;
  atrasadas: number;
  // Hechas recientes (por número de tarea, la más nueva primero).
  ultimasHechas: TareaAvance[];
  // En curso + en revisión.
  enMarcha: TareaAvance[];
  // No hechas con fecha límite en los próximos 14 días.
  proximas: TareaAvance[];
  error: string | null;
};

export type BloqueContenido = {
  planeadas: number;
  enProduccion: number;
  publicadasParrilla: number;
  // Publicaciones reales en Instagram este mes (de la API), si hay
  // Instagram conectado; null si no.
  publicadasInstagramMes: number | null;
};

export type CampanaAvance = {
  nombre: string;
  gasto: number;
  alcance: number;
  clics: number;
  ctr: number;
  resultados: number;
};

export type BloquePauta = {
  conectado: boolean;
  moneda: string | null;
  gasto: number;
  impresiones: number;
  alcance: number;
  clics: number;
  resultados: number;
  campanas: CampanaAvance[];
  errores: string[];
};

export type PuntoSerie = { fecha: string; valor: number };

export type BloqueCuenta = {
  conectado: boolean;
  usuario: string | null;
  seguidoresGanados: number | null;
  alcance30d: number | null;
  visitasPerfil30d: number | null;
  serieAlcance: PuntoSerie[];
  errores: string[];
};

export type AvanceCliente = {
  generadoEn: string;
  trabajo: BloqueTrabajo;
  contenido: BloqueContenido;
  pauta: BloquePauta;
  cuenta: BloqueCuenta;
};
