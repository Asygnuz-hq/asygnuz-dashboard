// Tipos y catálogos para el módulo "Hojas de Trabajo" (tipo Excel) dentro
// del Portal de Cliente y Portal Admin.

export type TipoColumnaHoja =
  | "texto"
  | "select"
  | "check"
  | "numero"
  | "puntaje"
  | "oportunidad"
  | "link";

export type ColumnaHoja = {
  key: string;
  label: string;
  tipo: TipoColumnaHoja;
  opciones?: string[];
  ancho?: string;
};

export type ValorCelda = string | number | boolean | null | undefined;

export type FilaHoja = {
  id: string;
  [key: string]: ValorCelda;
};

export type TipoHoja = "tabla" | "ideas" | "benchmarking" | "matriz" | "tomas";

export type HojaTrabajo = {
  id: string;
  tenant_id?: string;
  titulo: string;
  tipo: TipoHoja;
  descripcion: string | null;
  visible_cliente: boolean;
  columnas: ColumnaHoja[];
  filas: FilaHoja[];
  orden: number;
  actualizado_en?: string;
};

export const ETIQUETA_TIPO_HOJA: Record<TipoHoja, string> = {
  tabla: "Hoja de cálculo",
  ideas: "Banco de ideas",
  benchmarking: "Benchmarking",
  matriz: "Matriz de ángulos",
  tomas: "Lista de tomas",
};

// Plantillas rápidas para crear nuevas hojas desde /portal-admin/[tenantId]/hojas
export const PLANTILLAS_HOJA: Record<
  TipoHoja,
  { titulo: string; descripcion: string; columnas: ColumnaHoja[] }
> = {
  tabla: {
    titulo: "Plan de campaña",
    descripcion: "Entregables, tiempos y fechas de salida.",
    columnas: [
      { key: "num", label: "#", tipo: "texto", ancho: "56px" },
      { key: "tipo", label: "Tipo", tipo: "select", opciones: ["Anuncios", "Redes", "Historias", "En vivo"] },
      { key: "tema", label: "Tema", tipo: "texto" },
      { key: "procedimiento", label: "Procedimiento", tipo: "texto" },
      { key: "que_hacemos", label: "Qué hacemos", tipo: "texto" },
      { key: "sale", label: "Sale", tipo: "texto" },
      { key: "estado", label: "Estado", tipo: "select", opciones: ["Pendiente", "En curso", "Listo", "Publicado"] },
    ],
  },
  ideas: {
    titulo: "Banco de ideas",
    descripcion: "Ideas priorizadas del benchmarking listas para pasar a parrilla.",
    columnas: [
      { key: "num", label: "#", tipo: "texto", ancho: "48px" },
      { key: "idea", label: "Idea", tipo: "texto" },
      { key: "referente", label: "Referente", tipo: "texto" },
      { key: "formato", label: "Formato", tipo: "texto" },
      { key: "pilar", label: "Pilar", tipo: "texto" },
      { key: "angulo", label: "Ángulo", tipo: "texto" },
      { key: "uso", label: "Uso", tipo: "select", opciones: ["Orgánico", "Pauta", "Orgánico + pauta"] },
      { key: "prioridad", label: "Prioridad", tipo: "select", opciones: ["Alta", "Media", "Baja"] },
      { key: "estado", label: "Estado", tipo: "select", opciones: ["Idea", "En parrilla", "Grabada", "Publicada"] },
    ],
  },
  benchmarking: {
    titulo: "Benchmarking competitivo",
    descripcion: "Referentes aspiracionales y competencia local con aprendizajes accionables.",
    columnas: [
      { key: "cuenta", label: "Cuenta", tipo: "texto" },
      { key: "nombre", label: "Nombre", tipo: "texto" },
      {
        key: "nivel",
        label: "Nivel",
        tipo: "select",
        opciones: ["Aspiracional internacional", "Referente de formato", "Competencia local", "Línea base (nuestro cliente)"],
      },
      { key: "seguidores", label: "Seguidores", tipo: "numero" },
      { key: "formato", label: "Formato principal", tipo: "texto" },
      { key: "puntaje", label: "Puntaje", tipo: "puntaje" },
      { key: "leccion", label: "Lección clave", tipo: "texto" },
    ],
  },
  matriz: {
    titulo: "Matriz de ángulos",
    descripcion: "Cruce de ángulos de comunicación frente a referentes y competencia.",
    columnas: [
      { key: "angulo", label: "Ángulo", tipo: "texto" },
      { key: "cuentas", label: "Cuentas que lo usan", tipo: "numero" },
      { key: "cliente_hoy", label: "Marca hoy", tipo: "select", opciones: ["Sí", "No"] },
      { key: "oportunidad", label: "Para la marca", tipo: "oportunidad" },
    ],
  },
  tomas: {
    titulo: "Lista de tomas · Rodaje",
    descripcion: "Checklist en set por bloque de grabación con prioridad Esencial / Opcional.",
    columnas: [
      { key: "codigo", label: "#", tipo: "texto", ancho: "64px" },
      { key: "bloque", label: "Bloque", tipo: "texto" },
      { key: "toma", label: "Toma", tipo: "texto" },
      { key: "pieza", label: "Pieza", tipo: "texto", ancho: "90px" },
      { key: "prioridad", label: "Prio.", tipo: "select", opciones: ["E", "O"], ancho: "72px" },
      { key: "hecho", label: "Hecho", tipo: "check", ancho: "76px" },
      { key: "notas", label: "Notas en el set", tipo: "texto" },
    ],
  },
};

export const COLOR_OPCION_HOJA: Record<string, string> = {
  Alta: "#ef6b5b",
  Media: "#e8b23a",
  Baja: "#8b93a6",
  E: "#C9A45C",
  O: "#8b93a6",
  Anuncios: "#ef6b5b",
  Pauta: "#ef6b5b",
  Redes: "#C9A45C",
  "Orgánico": "#22b3a3",
  "Orgánico + pauta": "#a78bfa",
  Historias: "#b07ef0",
  "En vivo": "#ec6aa8",
  Pendiente: "#8b93a6",
  "En curso": "#4f8ef7",
  "En parrilla": "#4f8ef7",
  Listo: "#34c27a",
  Publicado: "#1d9e75",
  Publicada: "#1d9e75",
  Idea: "#8b93a6",
  Grabada: "#e8b23a",
  "Sí": "#1d9e75",
  "Aspiracional internacional": "#C9A45C",
  "Referente de formato": "#a78bfa",
  "Competencia local": "#4f8ef7",
  "Línea base (nuestro cliente)": "#1d9e75",
};
