"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useIsEmergencia } from "@/lib/useIsEmergencia";
import { useModuloActivo, type Modulo } from "@/lib/ModuloActivoContext";

type NavItem = { href: string; label: string };
// modulo: undefined = "Común", siempre visible sin importar el módulo activo.
type NavSection = { title: string; modulo?: Modulo; items: NavItem[] };

const sections: NavSection[] = [
  { title: "", items: [{ href: "/", label: "Dashboard" }] },
  {
    title: "Clientes",
    modulo: "financiero",
    items: [
      { href: "/clientes", label: "Clientes" },
      { href: "/clientes/rentabilidad", label: "Rentabilidad por Cliente" },
    ],
  },
  {
    title: "Finanzas",
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
    title: "Diseñadores",
    modulo: "marketing_pauta",
    items: [
      { href: "/disenadores/control-mensual", label: "Control Mensual" },
      { href: "/disenadores/resumen", label: "Resumen por Diseñador" },
      { href: "/disenadores/cobros-clientes", label: "Cobros a Clientes" },
      { href: "/disenadores/resumen-cobros", label: "Resumen de Cobros" },
    ],
  },
  {
    title: "Marketing",
    modulo: "marketing_pauta",
    items: [
      { href: "/marketing", label: "Marketing" },
      { href: "/metricas/clientes", label: "Meta Ads por Cliente" },
      { href: "/metricas/clientes/ranking", label: "Ranking entre Clientes" },
    ],
  },
  {
    title: "CRM",
    modulo: "crm",
    items: [{ href: "/crm", label: "Leads y Pipeline" }],
  },
  {
    title: "Operación",
    modulo: "operacion",
    items: [
      { href: "/metricas", label: "Vista Ejecutiva" },
      { href: "/metricas/carga", label: "Carga por Persona" },
      { href: "/metricas/reporte", label: "Reporte para Junta" },
      { href: "/metricas/permisos", label: "Permisos" },
    ],
  },
  {
    // Nómina/RRHH real vive aparte (otra sesión la está construyendo) —
    // por ahora este link se queda en Común para no perder acceso.
    title: "Equipo",
    items: [{ href: "/equipo", label: "Equipo / RRHH" }],
  },
  {
    title: "",
    items: [
      { href: "/analitica", label: "Analítica de Uso" },
      { href: "/deudas-personales", label: "Deudas Personales" },
      { href: "/configuracion", label: "Configuración" },
    ],
  },
];

const seccionEmergencia: NavSection = {
  title: "Emergencia",
  items: [{ href: "/emergencia", label: "Casos del Terremoto" }],
};

export function Sidebar() {
  const pathname = usePathname();
  const isEmergencia = useIsEmergencia();
  const { moduloActivo } = useModuloActivo();

  // El usuario externo del caso del terremoto solo ve su propia sección —
  // el resto del negocio de ASYGNUZ no le pertenece ni le interesa.
  const sectionsFiltradas = sections.filter((s) => !s.modulo || s.modulo === moduloActivo);
  const visibleSections = isEmergencia ? [seccionEmergencia] : [...sectionsFiltradas, seccionEmergencia];

  return (
    <nav className="print:hidden w-64 shrink-0 border-r border-border bg-surface p-4 flex flex-col gap-6 overflow-y-auto">
      <div className="px-2 py-1">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/logo.png"
          alt="Asygnuz"
          className="h-7 w-auto"
          style={{ filter: "var(--logo-filter)" }}
        />
        <p className="text-xs text-muted mt-1">Dashboard</p>
      </div>

      {visibleSections.map((section, i) => (
        <div key={i} className="flex flex-col gap-1">
          {section.title && (
            <p className="px-2 text-xs uppercase tracking-wide text-muted mb-1">
              {section.title}
            </p>
          )}
          {section.items.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`rounded-md px-2 py-1.5 text-sm transition-colors ${
                  active
                    ? "bg-accent text-accent-foreground font-medium"
                    : "text-foreground/80 hover:bg-surface-alt"
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
