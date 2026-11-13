"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useLayoutEffect, useRef, useState, type ComponentType } from "react";
import { useIsEmergencia } from "@/lib/useIsEmergencia";
import { useModuloActivo, type Modulo } from "@/lib/ModuloActivoContext";
import { useTenantActual } from "@/lib/useTenantActual";
import { useTenantModulos } from "@/lib/useTenantModulos";
import { useGestionaPortales } from "@/lib/useGestionaPortales";
import {
  IconoAjustes,
  IconoClientes,
  IconoCobros,
  IconoCrm,
  IconoDashboard,
  IconoEmergencia,
  IconoEquipo,
  IconoFinanzas,
  IconoMarketing,
  IconoOperacion,
  IconoPortal,
  type IconoProps,
} from "@/components/IconosSidebar";

type NavItem = { href: string; label: string };
type NavSection = {
  title: string;
  // Nombre corto para el tooltip y el panel flotante del riel colapsado —
  // algunas secciones no llevan título en el menú abierto (Dashboard, etc.).
  etiqueta: string;
  Icono: ComponentType<IconoProps>;
  modulo: Modulo;
  items: NavItem[];
};

// Cada sección pertenece a un solo módulo — nada queda "para todos". Deudas
// Personales y Casos del Terremoto salieron de aquí a propósito (pedido de
// JM, 2026-09-08): son casos puntuales que no necesitan ocupar espacio
// permanente en el menú de todo el equipo; siguen funcionando si alguien
// entra directo a /deudas-personales o /emergencia.
const sections: NavSection[] = [
  {
    title: "",
    etiqueta: "Dashboard",
    Icono: IconoDashboard,
    modulo: "financiero",
    items: [{ href: "/", label: "Dashboard" }],
  },
  {
    title: "Clientes",
    etiqueta: "Clientes",
    Icono: IconoClientes,
    modulo: "financiero",
    items: [
      { href: "/clientes", label: "Clientes" },
      { href: "/clientes/rentabilidad", label: "Rentabilidad por Cliente" },
    ],
  },
  {
    title: "Finanzas",
    etiqueta: "Finanzas",
    Icono: IconoFinanzas,
    modulo: "financiero",
    items: [
      { href: "/cuentas", label: "Cuentas / Caja" },
      { href: "/finanzas/ingresos", label: "Ingresos" },
      { href: "/finanzas/gastos-fijos", label: "Gastos Fijos" },
      { href: "/finanzas/gastos-variables", label: "Gastos Variables" },
      { href: "/finanzas/historico", label: "Histórico" },
      { href: "/finanzas/inversiones", label: "Inversiones" },
      { href: "/finanzas/mercado", label: "Watchlist de Mercado" },
      { href: "/finanzas/fundacion", label: "Fundación" },
    ],
  },
  {
    // Antes vivía dentro de "Diseñadores" en Marketing — es plata que deben
    // los clientes, no contenido de pauta, así que es Financiero.
    title: "Cobros",
    etiqueta: "Cobros",
    Icono: IconoCobros,
    modulo: "financiero",
    items: [
      { href: "/disenadores/cobros-clientes", label: "Cobros a Clientes" },
      { href: "/disenadores/resumen-cobros", label: "Resumen de Cobros" },
    ],
  },
  {
    title: "Marketing",
    etiqueta: "Marketing",
    Icono: IconoMarketing,
    modulo: "marketing_pauta",
    items: [
      { href: "/marketing", label: "Marketing" },
      { href: "/marketing/recursos", label: "Recursos gratuitos" },
      { href: "/bandeja", label: "Bandeja Instagram" },
      { href: "/bandeja/flujos", label: "Flujos Automáticos" },
      { href: "/metricas/clientes", label: "Meta Ads por Cliente" },
      { href: "/metricas/clientes/ranking", label: "Ranking entre Clientes" },
    ],
  },
  {
    title: "CRM",
    etiqueta: "CRM",
    Icono: IconoCrm,
    modulo: "crm",
    items: [
      { href: "/crm/prospeccion", label: "Prospección" },
      { href: "/crm/casos-negocio", label: "Negocios" },
      { href: "/crm", label: "Leads y Pipeline" },
    ],
  },
  {
    title: "Operación",
    etiqueta: "Operación",
    Icono: IconoOperacion,
    modulo: "operacion",
    items: [
      { href: "/requisitos", label: "Requisitos de Negocio" },
      { href: "/metricas", label: "Vista Ejecutiva" },
      { href: "/metricas/carga", label: "Carga por Persona" },
      { href: "/metricas/reporte", label: "Reporte para Junta" },
      { href: "/metricas/permisos", label: "Permisos" },
      { href: "/kaneo", label: "Gestor de Proyectos (Kaneo)" },
      { href: "/portal-admin", label: "Portales de Clientes (Growth)" },
    ],
  },
  {
    // Control Mensual y Resumen por Diseñador son la base para pagarle a
    // cada diseñador — van con Nómina, no con Marketing.
    title: "Equipo",
    etiqueta: "Equipo",
    Icono: IconoEquipo,
    modulo: "nomina",
    items: [
      { href: "/equipo", label: "Equipo / RRHH" },
      { href: "/hr", label: "Nómina (PILA)" },
      { href: "/disenadores/control-mensual", label: "Control Mensual" },
      { href: "/disenadores/resumen", label: "Resumen por Diseñador" },
    ],
  },
  {
    title: "",
    etiqueta: "Ajustes",
    Icono: IconoAjustes,
    modulo: "financiero",
    items: [
      { href: "/analitica", label: "Analítica de Uso" },
      { href: "/configuracion", label: "Configuración" },
    ],
  },
  {
    // Módulo de un solo link: clientes de Growth (Mayra, Santi, Claudia...)
    // no tienen ningún otro módulo prendido en su tenant.
    title: "",
    etiqueta: "Mi Portal",
    Icono: IconoPortal,
    modulo: "portal_cliente",
    items: [{ href: "/portal", label: "Mi Portal" }],
  },
];

const seccionEmergencia: NavSection = {
  title: "Emergencia",
  etiqueta: "Emergencia",
  Icono: IconoEmergencia,
  modulo: "financiero",
  items: [{ href: "/emergencia", label: "Casos del Terremoto" }],
};

// Si el menú abre expandido o como riel de íconos la primera vez que alguien
// entra (después se acuerda de lo último que eligió). Cambiar a `false` para
// que arranque colapsado.
const EXPANDIDO_POR_DEFECTO = true;
const CLAVE_EXPANDIDO = "asygnuz-sidebar-expandido";

// La sección "donde estás": la que contiene el link que mejor coincide con
// la ruta (exacta gana; si no, el prefijo más largo — así /clientes/123
// sigue marcando Clientes).
function indiceActivo(secciones: { visibles: NavItem[] }[], pathname: string): number {
  let mejor = -1;
  let mejorPuntaje = -1;
  secciones.forEach((s, i) => {
    s.visibles.forEach((it) => {
      let puntaje = -1;
      if (pathname === it.href) puntaje = 10000 + it.href.length;
      else if (it.href !== "/" && pathname.startsWith(it.href + "/")) puntaje = it.href.length;
      if (puntaje > mejorPuntaje) {
        mejorPuntaje = puntaje;
        mejor = i;
      }
    });
  });
  return mejor;
}

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const isEmergencia = useIsEmergencia();
  const { moduloActivo } = useModuloActivo();
  const tenant = useTenantActual();
  const modulos = useTenantModulos();
  const gestionaPortales = useGestionaPortales();

  const [expandido, setExpandido] = useState(EXPANDIDO_POR_DEFECTO);
  const [popover, setPopover] = useState<number | null>(null);
  const [popoverTop, setPopoverTop] = useState(0);
  const [notchY, setNotchY] = useState(0);
  const asideRef = useRef<HTMLElement>(null);
  const botonesRef = useRef<(HTMLElement | null)[]>([]);

  // El usuario externo del caso del terremoto solo ve su propia sección —
  // el resto del negocio de ASYGNUZ no le pertenece ni le interesa. Para
  // el equipo normal, esa sección ya no aparece en el menú (ver comentario
  // arriba de `sections`).
  const base = isEmergencia ? [seccionEmergencia] : sections.filter((s) => s.modulo === moduloActivo);
  const secciones = base
    .map((s) => ({
      ...s,
      // /analitica exige el flag del tenant; /portal-admin exige un permiso
      // de la PERSONA (gestiona_portales), no del tenant entero.
      visibles: s.items
        // /marketing/recursos es interna (leads de ASYGNUZ): mismo flag que /analitica.
        .filter((item) => (item.href !== "/analitica" && item.href !== "/marketing/recursos") || modulos?.analitica === true)
        .filter((item) => item.href !== "/crm/prospeccion" || modulos?.prospeccion === true)
        .filter((item) => item.href !== "/crm/casos-negocio" || modulos?.casos_negocio === true)
        .filter((item) => item.href !== "/portal-admin" || gestionaPortales),
    }))
    .filter((s) => s.visibles.length > 0);

  const activa = indiceActivo(secciones, pathname);

  useEffect(() => {
    try {
      const guardado = localStorage.getItem(CLAVE_EXPANDIDO);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (guardado === "0") setExpandido(false);
      else if (guardado === "1") setExpandido(true);
    } catch {
      // Sin localStorage (navegación privada): queda el valor por defecto.
    }
  }, []);

  // Posición del hueco = centro del ícono activo (el hueco mide 88px).
  useLayoutEffect(() => {
    if (expandido || activa < 0) return;
    const el = botonesRef.current[activa];
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (el) setNotchY(Math.max(0, el.offsetTop + el.offsetHeight / 2 - 44));
  }, [expandido, activa, secciones.length]);

  useEffect(() => {
    if (popover === null) return;
    const alHacerClic = (e: MouseEvent) => {
      if (!asideRef.current?.contains(e.target as Node)) setPopover(null);
    };
    const alTeclear = (e: KeyboardEvent) => {
      if (e.key === "Escape") setPopover(null);
    };
    document.addEventListener("mousedown", alHacerClic);
    document.addEventListener("keydown", alTeclear);
    return () => {
      document.removeEventListener("mousedown", alHacerClic);
      document.removeEventListener("keydown", alTeclear);
    };
  }, [popover]);

  function alternar() {
    const siguiente = !expandido;
    setExpandido(siguiente);
    setPopover(null);
    try {
      localStorage.setItem(CLAVE_EXPANDIDO, siguiente ? "1" : "0");
    } catch {
      // Sin localStorage: el cambio vale solo para esta visita.
    }
  }

  // Clic en un ícono con varias páginas: te lleva YA a la primera y deja
  // abierto el panel con las demás, marcando dónde estás. Un segundo clic
  // en el mismo ícono lo cierra.
  function clicSeccion(i: number) {
    const s = secciones[i];
    if (popover === i) {
      setPopover(null);
      return;
    }
    const el = botonesRef.current[i];
    if (el) setPopoverTop(Math.max(0, el.offsetTop - 8));
    // Si ya estás dentro de esa sección, no te saca de la página donde estás.
    if (i !== activa) router.push(s.visibles[0].href);
    setPopover(i);
  }

  const logoBlock = (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={tenant?.logoUrl || "/logo.png"}
        alt={tenant?.nombre ?? "Asygnuz"}
        className="h-7 w-auto"
        style={tenant?.logoUrl ? undefined : { filter: "var(--logo-filter)" }}
      />
      <p className="text-xs text-muted mt-1">{tenant?.nombre ?? "Dashboard"}</p>
    </>
  );

  if (expandido) {
    return (
      <nav className="print:hidden glass w-64 shrink-0 m-4 rounded-2xl p-4 flex flex-col gap-6 overflow-y-auto">
        <div className="px-2 py-1 flex items-start justify-between gap-2">
          <div>{logoBlock}</div>
          <button
            type="button"
            onClick={alternar}
            aria-label="Contraer el menú"
            title="Contraer el menú"
            className="nav-item shrink-0 rounded-lg border border-transparent p-1.5 text-muted hover:text-foreground"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="m15 6-6 6 6 6" />
            </svg>
          </button>
        </div>

        {secciones.map((section, i) => (
          <div key={i} className="flex flex-col gap-1 rise-in" style={{ "--i": i } as React.CSSProperties}>
            {section.title && (
              <p className="px-2 text-xs uppercase tracking-wide text-muted mb-1 flex items-center gap-1.5">
                <section.Icono />
                {section.title}
              </p>
            )}
            {section.visibles.map((item) => {
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`nav-item rounded-lg border border-transparent px-2.5 py-1.5 text-sm ${
                    active ? "nav-item-active text-foreground font-medium" : "text-foreground/80"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>
    );
  }

  return (
    <aside
      ref={asideRef}
      className={`print:hidden riel m-4 ${activa < 0 ? "riel-sin-ola" : ""}`}
      style={{ "--notch-y": `${notchY}px` } as React.CSSProperties}
    >
      <div className="riel-fondo glass" aria-hidden />
      {activa >= 0 && (
        <>
          <div className="riel-luz" aria-hidden />
          <svg className="riel-trazo" viewBox="0 0 76 88" fill="none" strokeWidth="1.2" strokeLinecap="round" aria-hidden>
            <path d="M76 8A14 14 0 0 1 62 22L30 22A22 22 0 0 0 30 66L62 66A14 14 0 0 1 76 80" />
          </svg>
        </>
      )}

      <nav className="riel-iconos" aria-label="Menú principal">
        <div
          className="mb-1 flex h-[34px] w-[34px] items-center justify-center rounded-[10px] text-[13px] font-bold text-white"
          style={{ background: "linear-gradient(135deg, var(--accent-bright), var(--accent))" }}
          title={tenant?.nombre ?? "Asygnuz"}
        >
          {(tenant?.nombre ?? "A").charAt(0).toUpperCase()}
        </div>

        {secciones.map((s, i) => {
          const esActiva = i === activa;
          const clase = `riel-ico ${esActiva ? "riel-ico-activo" : ""}`;
          const tip = popover === i ? null : <span className="riel-tip">{s.etiqueta}</span>;
          const icono = <s.Icono size={20} />;
          if (s.visibles.length === 1) {
            return (
              <Link
                key={s.etiqueta}
                href={s.visibles[0].href}
                ref={(el) => {
                  botonesRef.current[i] = el;
                }}
                onClick={() => setPopover(null)}
                aria-label={s.etiqueta}
                aria-current={esActiva ? "page" : undefined}
                className={clase}
              >
                {tip}
                {icono}
              </Link>
            );
          }
          return (
            <button
              key={s.etiqueta}
              type="button"
              ref={(el) => {
                botonesRef.current[i] = el;
              }}
              onClick={() => clicSeccion(i)}
              aria-label={s.etiqueta}
              aria-expanded={popover === i}
              aria-haspopup="menu"
              className={clase}
            >
              {tip}
              {icono}
            </button>
          );
        })}

        <button
          type="button"
          onClick={alternar}
          aria-label="Expandir el menú"
          title="Expandir el menú"
          className="riel-ico mt-2 !h-8 !w-8 !rounded-full border border-border"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="m9 6 6 6-6 6" />
          </svg>
        </button>
      </nav>

      {popover !== null && secciones[popover] && (
        <div
          role="menu"
          className="riel-popover glass absolute z-50 min-w-56 rounded-2xl p-2"
          style={{ left: "calc(100% + 14px)", top: popoverTop }}
        >
          <p className="px-2.5 pb-1.5 pt-1 text-[11px] uppercase tracking-wide text-muted">
            {secciones[popover].etiqueta}
          </p>
          {secciones[popover].visibles.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                role="menuitem"
                className={`nav-item block rounded-lg border border-transparent px-2.5 py-1.5 text-sm ${
                  active ? "nav-item-active text-foreground font-medium" : "text-foreground/80"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </div>
      )}
    </aside>
  );
}
