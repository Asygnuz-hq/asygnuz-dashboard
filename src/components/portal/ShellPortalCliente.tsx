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
import {
  BotonTemaPortal,
  PortalThemeProvider,
  usePortalTheme,
} from "@/components/portal/PortalThemeContext";
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
  { href: "/portal/hojas", label: "Hojas", Icon: Table },
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
  return (
    <PortalThemeProvider inicial="light">
      <ShellPortalInterior tenant={tenant} usuarioLabel={usuarioLabel}>
        {children}
      </ShellPortalInterior>
    </PortalThemeProvider>
  );
}

function ShellPortalInterior({
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
  const { modo } = usePortalTheme();
  const acento = tenant.colorAcento || "#C9A45C";

  async function salir() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <div
      className="portal-shell min-h-[100dvh] flex flex-col"
      data-portal-mode={modo}
      style={{ "--portal-accent": acento } as React.CSSProperties}
    >
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link
        href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap"
        rel="stylesheet"
      />

      {tenant.splashHabilitado && (
        <AperturaLogo
          nombre={tenant.nombre}
          logoUrl={tenant.logoUrl}
          colorAcento={acento}
          tagline={tenant.taglinePortal}
          modo={modo}
          claveSesion={`portal-splash-${tenant.slug || tenant.id}`}
        />
      )}

      {/* Navbar Fluid Island flotante en cristal esmerilado */}
      <div className="print:hidden sticky top-0 z-40 px-3 pt-3 sm:px-8 sm:pt-4">
        <header className="portal-island mx-auto flex max-w-6xl flex-wrap sm:flex-nowrap items-center justify-between gap-x-3 gap-y-2.5 rounded-3xl sm:rounded-full px-4 py-2.5 sm:h-16 sm:py-0 sm:px-6">
          <Link href="/portal" className="flex items-center gap-3 shrink-0 pl-0.5 sm:pl-1">
            {tenant.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={tenant.logoUrl}
                alt={tenant.nombre}
                className="h-7 sm:h-9 w-auto max-w-[130px] sm:max-w-[140px] object-contain"
              />
            ) : (
              <span
                className="text-sm sm:text-base font-semibold tracking-tight"
                style={{ fontFamily: FUENTE_DISPLAY, color: "var(--p-ink)" }}
              >
                {tenant.nombre}
              </span>
            )}
          </Link>

          <nav
            className="order-3 sm:order-none w-full sm:w-auto flex items-center justify-between sm:justify-center gap-1 border-t sm:border-t-0 pt-2 sm:pt-0 overflow-x-auto"
            style={{ borderColor: "var(--p-border)" }}
            aria-label="Navegación del portal"
          >
            {NAV.map(({ href, label, Icon }) => {
              const activo = href === "/portal" ? pathname === "/portal" : pathname.startsWith(href);
              return (
                <Link
                  key={href}
                  href={href}
                  className="flex flex-1 sm:flex-initial items-center justify-center gap-1.5 whitespace-nowrap rounded-full px-3 sm:px-3.5 py-1.5 text-xs font-semibold transition-colors"
                  style={
                    activo
                      ? {
                          backgroundColor: "var(--p-accent-bg)",
                          color: "var(--p-ink)",
                          border: "1px solid var(--p-accent-border)",
                        }
                      : {
                          color: "var(--p-muted)",
                          border: "1px solid transparent",
                        }
                  }
                >
                  <Icon
                    size={15}
                    weight={activo ? "regular" : "light"}
                    style={activo ? { color: "var(--p-accent-ink)" } : undefined}
                  />
                  <span>{label}</span>
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <span
              className="hidden lg:inline text-xs truncate max-w-[150px] mr-1"
              style={{ color: "var(--p-muted)" }}
            >
              {usuarioLabel}
            </span>
            <BotonTemaPortal />
            <button
              type="button"
              onClick={salir}
              className="inline-flex h-9 items-center gap-1.5 rounded-full border px-3 text-xs font-medium transition-colors cursor-pointer active:scale-[0.97]"
              style={{
                borderColor: "var(--p-border-strong)",
                backgroundColor: "var(--p-surface-subtle)",
                color: "var(--p-ink)",
              }}
              title="Cerrar sesión"
            >
              <SignOut size={14} weight="light" />
              <span className="hidden sm:inline">Salir</span>
            </button>
          </div>
        </header>
      </div>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 sm:px-8 py-8 sm:py-10">
        {children}
      </main>

      <footer
        className="print:hidden border-t py-6 text-center"
        style={{ borderColor: "var(--p-border)" }}
      >
        <p
          className="text-[11px] uppercase tracking-[0.24em]"
          style={{ color: "var(--p-muted)" }}
        >
          {tenant.nombre} · Portal privado · ASYGNUZ
        </p>
      </footer>
    </div>
  );
}
