"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  CalendarDots,
  HouseSimple,
  SignOut,
  Table,
} from "@phosphor-icons/react";
import { createClient } from "@/lib/supabase/client";
import { AperturaLogo } from "@/components/portal/AperturaLogo";
import { FUENTE_DISPLAY } from "@/lib/portal/fuente";

export type DatosTenantShell = {
  id: string;
  nombre: string;
  slug: string | null;
  logoUrl: string | null;
  colorAcento: string | null;
  taglinePortal: string | null;
  splashHabilitado: boolean;
};

const NAV = [
  { href: "/portal", label: "Resumen", Icon: HouseSimple },
  { href: "/portal/parrilla", label: "Parrilla", Icon: CalendarDots },
  { href: "/portal/hojas", label: "Hojas de trabajo", Icon: Table },
];

export function ShellPortalCliente({
  tenant,
  usuarioLabel,
  children,
}: {
  tenant: DatosTenantShell;
  usuarioLabel: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const acento = tenant.colorAcento || "#C9A45C";
  const acentoInk = `color-mix(in srgb, ${acento} 72%, #1e293b)`;

  async function salir() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <div
      className="portal-light min-h-[100dvh] flex flex-col"
      style={
        {
          "--portal-accent": acento,
          backgroundColor: "#F6F7F9",
          backgroundImage: `radial-gradient(960px circle at 10% -8%, color-mix(in srgb, ${acento} 10%, transparent), transparent 58%), radial-gradient(680px circle at 92% 0%, color-mix(in srgb, ${acento} 7%, transparent), transparent 55%)`,
          backgroundAttachment: "fixed",
        } as React.CSSProperties
      }
    >
      {tenant.splashHabilitado && (
        <AperturaLogo
          nombre={tenant.nombre}
          logoUrl={tenant.logoUrl}
          colorAcento={acento}
          tagline={tenant.taglinePortal}
          claveSesion={`portal-splash-${tenant.slug || tenant.id}`}
        />
      )}

      {/* Topbar luminosa estilo estudio editorial */}
      <header className="print:hidden sticky top-0 z-40 border-b border-slate-200/80 bg-white/85 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-5 sm:px-8">
          <Link href="/portal" className="flex items-center gap-3 shrink-0">
            {tenant.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={tenant.logoUrl}
                alt={tenant.nombre}
                className="h-9 w-auto max-w-[160px] object-contain"
              />
            ) : (
              <span
                className="text-base font-semibold tracking-tight text-slate-900"
                style={{ fontFamily: FUENTE_DISPLAY }}
              >
                {tenant.nombre}
              </span>
            )}
          </Link>

          <nav className="flex items-center gap-1 overflow-x-auto" aria-label="Navegación del portal">
            {NAV.map(({ href, label, Icon }) => {
              const activo = href === "/portal" ? pathname === "/portal" : pathname.startsWith(href);
              return (
                <Link
                  key={href}
                  href={href}
                  className="flex items-center gap-2 whitespace-nowrap rounded-full px-4 py-1.5 text-xs font-semibold transition-colors"
                  style={
                    activo
                      ? {
                          backgroundColor: `color-mix(in srgb, ${acento} 14%, #ffffff)`,
                          color: "#0F172A",
                          border: `1px solid color-mix(in srgb, ${acento} 42%, #e2e8f0)`,
                        }
                      : {
                          color: "#64748B",
                          border: "1px solid transparent",
                        }
                  }
                >
                  <Icon
                    size={15}
                    weight={activo ? "regular" : "light"}
                    style={activo ? { color: acentoInk } : undefined}
                  />
                  <span>{label}</span>
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-3 shrink-0">
            <span className="hidden md:inline text-xs text-slate-500 truncate max-w-[180px]">
              {usuarioLabel}
            </span>
            <button
              type="button"
              onClick={salir}
              className="flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-medium text-slate-600 hover:border-slate-300 hover:text-slate-900 transition-colors cursor-pointer"
              title="Cerrar sesión"
            >
              <SignOut size={14} weight="regular" />
              <span className="hidden sm:inline">Salir</span>
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl flex-1 px-5 sm:px-8 py-8">
        {children}
      </main>

      <footer className="print:hidden border-t border-slate-200/70 bg-white/60 py-5 text-center">
        <p className="text-[11px] uppercase tracking-[0.22em] text-slate-400">
          {tenant.nombre} · Portal privado · ASYGNUZ
        </p>
      </footer>
    </div>
  );
}
