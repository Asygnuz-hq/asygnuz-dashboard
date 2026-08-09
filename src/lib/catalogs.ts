export const CATEGORIAS_GASTO = [
  "Infraestructura",
  "Nomina",
  "Suscripciones",
  "Marketing",
  "Servicios profesionales",
  "Impuestos",
  "Comisiones",
  "Herramientas",
  "Viajes",
  "Otro",
];

export const TIPOS_PIEZA = [
  "Estática",
  "Carrusel",
  "Reel",
  "Story",
  "Diseño web",
  "Identidad",
  "Presentación",
  "Otro",
];

export const ESTADOS_TAREA = [
  "Pendiente",
  "En proceso",
  "Revisión",
  "Entregado",
  "Aprobado",
  "Cancelado",
];

export const ESTADOS_COBRO = ["Pendiente", "En disputa", "Pagado"];

export const MONEDAS = ["COP", "USD"];

// Ingresos sí admite EUR (clientes que pagan en euros); Gastos Fijos/Variables
// se quedan en COP/USD porque su tabla no tiene esa columna todavía.
export const MONEDAS_INGRESO = ["COP", "USD", "EUR"];

export const TIPOS_INGRESO = ["Retainer", "Piezas adicionales", "Proyecto único", "Otro"];

export const ESTADOS_CLIENTE = ["Activo", "En riesgo", "Pausado", "Terminado"];

export const TIPOS_ACTIVIDAD = ["Reunión", "Entrega", "Llamada", "Tarea", "Nota"];

export const TIPOS_CUENTA = ["Banco", "Efectivo", "Billetera digital", "Otro"];

export const MONEDAS_CUENTA = ["COP", "USD", "EUR"];

export const TIPOS_MOVIMIENTO = [
  "Ingreso",
  "Gasto",
  "Compra USD",
  "Venta USD",
  "Compra EUR",
  "Venta EUR",
  "Rendimiento",
  "Transferencia Entrada",
  "Transferencia Salida",
];

// Compra/Venta USD/EUR quedan fuera: esos tipos afectan DOS cuentas a la vez
// y solo deben crearse desde el botón "Cambio de Divisa", nunca como una fila
// manual dentro de una sola cuenta (eso deja el otro lado sin registrar).
export const TIPOS_MOVIMIENTO_MANUAL = [
  "Ingreso",
  "Gasto",
  "Rendimiento",
  "Transferencia Entrada",
  "Transferencia Salida",
];

export const PLATAFORMAS_MARKETING = ["Meta Ads", "Google Ads", "TikTok Ads", "LinkedIn Ads", "Otro"];

export const TIPOS_RESULTADO_MARKETING = ["Leads", "Ventas", "Ingresos", "Otro"];

export const ESTADOS_CAMPANA = ["Activa", "Pausada", "Finalizada"];
