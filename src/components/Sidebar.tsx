"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type NavItem = { href: string; label: string };
type NavSection = { title: string; items: NavItem[] };

const sections: NavSection[] = [
  { title: "", items: [{ href: "/", label: "Dashboard" }] },
  {
    title: "Clientes",
    items: [
      { href: "/clientes", label: "Clientes" },
      { href: "/clientes/rentabilidad", label: "Rentabilidad por Cliente" },
    ],
  },
  {
    title: "Finanzas",
    items: [
      { href: "/finanzas/ingresos", label: "Ingresos" },
      { href: "/finanzas/gastos-fijos", label: "Gastos Fijos" },
      { href: "/finanzas/gastos-variables", label: "Gastos Variables" },
      { href: "/finanzas/historico", label: "Histórico" },
      { href: "/finanzas/inversiones", label: "Inversiones" },
      { href: "/finanzas/fundacion", label: "Fundación" },
    ],
  },
  {
    title: "Diseñadores",
    items: [
      { href: "/disenadores/control-mensual", label: "Control Mensual" },
      { href: "/disenadores/resumen", label: "Resumen por Diseñador" },
      { href: "/disenadores/cobros-clientes", label: "Cobros a Clientes" },
      { href: "/disenadores/resumen-cobros", label: "Resumen de Cobros" },
    ],
  },
  {
    title: "",
    items: [
      { href: "/deudas-personales", label: "Deudas Personales" },
      { href: "/configuracion", label: "Configuración" },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <nav className="w-64 shrink-0 border-r border-border bg-surface p-4 flex flex-col gap-6 overflow-y-auto">
      <div className="px-2 py-1">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.png" alt="Asygnuz" className="h-7 w-auto brightness-0 invert" />
        <p className="text-xs text-muted mt-1">Dashboard</p>
      </div>

      {sections.map((section, i) => (
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
