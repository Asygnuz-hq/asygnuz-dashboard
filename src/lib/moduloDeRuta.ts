export type Modulo = "financiero" | "marketing_pauta" | "crm" | "operacion" | "nomina" | "portal_cliente";

// Página a la que te lleva cada botón del switcher — "home" de ese módulo.
export const MODULO_HOME: Record<Modulo, string> = {
  financiero: "/",
  marketing_pauta: "/marketing",
  crm: "/crm",
  operacion: "/metricas",
  nomina: "/equipo",
  portal_cliente: "/portal",
};

// Del más específico al más general — gana el primer prefijo que matchee.
// Necesario porque varias rutas viven bajo el mismo padre pero pertenecen a
// módulos distintos (ej. /metricas es Operación pero /metricas/clientes es
// Marketing; /disenadores/cobros-clientes es Financiero pero
// /disenadores/control-mensual es Nómina).
const RUTA_A_MODULO: { prefix: string; modulo: Modulo }[] = [
  { prefix: "/bandeja", modulo: "marketing_pauta" },
  { prefix: "/metricas/clientes", modulo: "marketing_pauta" },
  { prefix: "/metricas", modulo: "operacion" },
  { prefix: "/requisitos", modulo: "operacion" },
  { prefix: "/tablero", modulo: "operacion" },
  { prefix: "/kaneo", modulo: "operacion" },
  // /portal-admin es interna de ASYGNUZ (gestión de portales de clientes de
  // Growth) — mapea a Operación para pasar el filtro base; el flag propio
  // "portal_admin" (como analitica) se exige aparte en el middleware.
  { prefix: "/portal-admin", modulo: "operacion" },
  { prefix: "/portal", modulo: "portal_cliente" },
  { prefix: "/disenadores/cobros-clientes", modulo: "financiero" },
  { prefix: "/disenadores/resumen-cobros", modulo: "financiero" },
  { prefix: "/disenadores/control-mensual", modulo: "nomina" },
  { prefix: "/disenadores/resumen", modulo: "nomina" },
  { prefix: "/marketing", modulo: "marketing_pauta" },
  { prefix: "/crm", modulo: "crm" },
  { prefix: "/equipo", modulo: "nomina" },
  { prefix: "/hr", modulo: "nomina" },
  { prefix: "/clientes", modulo: "financiero" },
  { prefix: "/cuentas", modulo: "financiero" },
  { prefix: "/finanzas", modulo: "financiero" },
  { prefix: "/analitica", modulo: "financiero" },
  { prefix: "/configuracion", modulo: "financiero" },
  { prefix: "/deudas-personales", modulo: "financiero" },
];

// El módulo activo se calcula SIEMPRE a partir de la URL — nunca se guarda
// aparte (ni localStorage ni estado manual). Antes el switcher y el sidebar
// podían desincronizarse (entrabas a una página de Marketing por link
// directo y el switcher seguía marcando Financiero); con esto es imposible
// que se desincronicen porque hay una sola fuente de verdad: la ruta.
export function derivarModulo(pathname: string): Modulo {
  for (const r of RUTA_A_MODULO) {
    if (pathname === r.prefix || pathname.startsWith(`${r.prefix}/`)) return r.modulo;
  }
  return "financiero";
}
