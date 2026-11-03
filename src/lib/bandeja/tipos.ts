export type EstadoConversacion = "pendiente" | "respondida" | "archivada";
export type TipoEvento = "comment" | "message" | "postback";
export type RemitenteMensaje = "usuario" | "cuenta";
export type EnviadoPor = "n8n" | "dashboard" | "claude";

export interface BotonFlujo {
  titulo: string;
  url: string;
}

export interface IgFlujo {
  id: string;
  tenant_id: string | null;
  conexion_id: string;
  nombre: string;
  palabras_clave: string[];
  aplica_a: string;
  respuesta_privada: string;
  respuesta_publica: string[];
  botones: BotonFlujo[];
  activo: boolean;
  creado_en: string;
  actualizado_en: string;
  // Conteo agregado para vista rápida
  total_disparado?: number;
  total_respuestas?: number;
  total_errores?: number;
  links_tracking?: IgLinkTracking[];
}

export interface IgBienvenida {
  id: string;
  conexion_id: string;
  tenant_id: string | null;
  mensaje: string;
  activo: boolean;
  actualizado_en: string;
}

export type CanalRespuesta = "dm" | "respuesta_privada" | "solo_publica";

export interface IgConversacion {
  id: string;
  conexion_id: string;
  tenant_id: string | null;
  ig_usuario_id: string;
  ig_usuario_nombre: string | null;
  ultimo_mensaje_usuario_en: string;
  ultimo_dm_usuario_en?: string | null;
  ha_enviado_dm?: boolean;
  comment_id_origen?: string | null;
  respuesta_privada_enviada?: boolean;
  ultimo_mensaje_texto: string | null;
  tipo_ultimo_evento: "message" | "comment";
  estado: EstadoConversacion;
  flujo_origen: string | null;
  creado_en: string;
  actualizado_en: string;
  // Propiedades calculadas en servidor
  horas_restantes: number;
  minutos_restantes: number;
  vencida: boolean;
  canal_respuesta?: CanalRespuesta;
  cliente_nombre?: string;
  instagram_username?: string;
  guia_marca?: string | null;
}

export interface IgMensaje {
  id: string;
  conversacion_id: string;
  remitente: RemitenteMensaje;
  texto: string;
  enviado_por?: EnviadoPor | null;
  estado_envio: "enviado" | "fallido" | "pendiente";
  meta_mensaje_id?: string | null;
  creado_en: string;
}

export interface IgAccion {
  id: string;
  conexion_id: string;
  tenant_id: string | null;
  flujo_id: string | null;
  evento_id: string | null;
  conversacion_id: string | null;
  tipo_accion: string;
  resultado: "exito" | "error" | "limite_alcanzado";
  error_detalle: string | null;
  ejecutado_en: string;
}

export interface IgLinkTracking {
  id: string;
  flujo_id: string | null;
  conexion_id: string;
  tenant_id: string | null;
  url_destino: string;
  titulo: string | null;
  clics_count: number;
  creado_en: string;
}

export interface TokenAgente {
  id: string;
  user_id: string;
  nombre: string;
  token_prefix: string;
  revocado: boolean;
  creado_en: string;
  ultimo_uso_en: string | null;
  tenant_id: string | null;
  puede_escribir: boolean;
}

export interface MetricasBandeja {
  periodo: "7d" | "30d" | "90d";
  resumenHumano: string;
  embudo: {
    comentariosPalabraClave: number;
    dmsEnviados: number;
    respuestasUsuario: number;
    clicsLink: number;
    tasaComentarioAdmAbierta: number;
    tasaDmARespuesta: number;
    tasaRespuestaAClic: number;
  };
  leadsPorPalabraClave: { palabra: string; leads: number }[];
  leadsPorPublicacion: {
    mediaId: string;
    caption: string;
    imagenUrl?: string | null;
    permalink?: string | null;
    leads: number;
  }[];
  conversacionesPorDia: {
    fecha: string;
    automaticas: number;
    dashboard: number;
    claude: number;
  }[];
  tiempoPromedioRespuestaMinutos: number;
  porcentajeVentanaCumplida: number;
  mapaCalor: { dia: string; franja: string; intensidad: number }[];
  totalErrores: number;
  limitesAlcanzados: number;
}
