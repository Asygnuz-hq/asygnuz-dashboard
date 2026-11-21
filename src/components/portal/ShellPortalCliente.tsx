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

  async function salir() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <div
      className="min-h-[100dvh] flex flex-col"
      style={
        {
          "--portal-accent": acento,
          backgroundColor: "#07080B",
          backgroundImage: `radial-gradient(880px circle at 12% -8%, color-mix(in srgb, ${acento} 14%, transparent), transparent 62%), radial-gradient(620px circle at 92% 6%, color-mix(in srgb, ${acento} 8%, transparent), transparent 60%)`,
          backgroundAttachment: "fixed",
          color: "#F3F2EE",
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

      {/* Barra superior minimalista boutique */}
      <header className="print:hidden sticky top-0 z-40 border-b border-white/[0.07] bg-[#07080B]/75 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-5 sm:px-8">
          <Link href="/portal" className="flex items-center gap-3 shrink-0">
            {tenant.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={tenant.logoUrl}
                alt={tenant.nombre}
                className="h-8 w-auto max-w-[150px] object-contain"
              />
            ) : (
              <span
                className="text-base font-semibold tracking-tight text-white"
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
                  className="flex items-center gap-2 whitespace-nowrap rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors"
                  style={
                    activo
                      ? {
                          backgroundColor: `color-mix(in srgb, ${acento} 18%, transparent)`,
                          color: "#FFFFFF",
                          border: `1px solid color-mix(in srgb, ${acento} 42%, transparent)`,
                        }
                      : {
                          color: "rgba(243, 242, 238, 0.62)",
                          border: "1px solid transparent",
                        }
                  }
                >
                  <Icon size={15} weight={activo ? "regular" : "light"} style={activo ? { color: acento } : undefined} />
                  <span>{label}</span>
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-3 shrink-0">
            <span className="hidden md:inline text-xs text-white/45 truncate max-w-[180px]">
              {usuarioLabel}
            </span>
            <button
              type="button"
              onClick={salir}
              className="flex items-center gap-1.5 rounded-full border border-white/10 px-3 py-1.5 text-xs text-white/70 hover:border-white/25 hover:text-white transition-colors cursor-pointer"
              title="Cerrar sesión"
            >
              <SignOut size={14} weight="light" />
              <span className="hidden sm:inline">Salir</span>
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl flex-1 px-5 sm:px-8 py-8">
        {children}
      </main>

      <footer className="print:hidden border-t border-white/[0.05] py-5 text-center">
        <p className="text-[11px] uppercase tracking-[0.22em] text-white/25">
          {tenant.nombre} · Portal privado · ASYGNUZ
        </p>
      </footer>
    </div>
  );
}
