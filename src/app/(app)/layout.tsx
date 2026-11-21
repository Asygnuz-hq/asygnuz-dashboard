import { headers } from "next/headers";
import { Sidebar } from "@/components/Sidebar";
import { LogoutButton } from "@/components/LogoutButton";
import { ThemeToggle } from "@/components/ThemeToggle";
import { GlobalSearch } from "@/components/GlobalSearch";
import { IdleLogout } from "@/components/IdleLogout";
import { ModuloSwitcher } from "@/components/ModuloSwitcher";
import { PosthogProvider } from "@/components/PosthogProvider";
import { ShellPortalCliente, type DatosTenantShell } from "@/components/portal/ShellPortalCliente";
import { ModuloActivoProvider } from "@/lib/ModuloActivoContext";
import { createClient } from "@/lib/supabase/server";
import { modulosDelTenant } from "@/lib/modulosServidor";
import { extraerSubdominio } from "@/lib/portal/subdominio";
import { obtenerBrandingPorSubdominio } from "@/lib/portal/brandingServidor";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const hdrs = await headers();
  const subdominioHost = extraerSubdominio(hdrs.get("host"));

  const [{ data: { user } }, modulos, { data: tenantData }] = await Promise.all([
    supabase.auth.getUser(),
    modulosDelTenant(supabase),
    supabase.rpc("tenant_actual"),
  ]);

  const filaTenant = Array.isArray(tenantData) ? tenantData[0] : tenantData;
  const soloPortalCliente =
    Boolean(modulos) &&
    modulos?.portal_cliente === true &&
    modulos?.financiero !== true &&
    modulos?.marketing_pauta !== true &&
    modulos?.crm !== true &&
    modulos?.operacion !== true &&
    modulos?.nomina !== true;

  // Si el usuario es cliente exclusivo de portal (o entra por un subdominio
  // dedicado de cliente), renderizamos el shell boutique sin el sidebar ni
  // herramientas internas de ASYGNUZ.
  if (soloPortalCliente || subdominioHost) {
    let datosShell: DatosTenantShell | null = null;
    if (subdominioHost) {
      const brandingSub = await obtenerBrandingPorSubdominio(subdominioHost);
      if (brandingSub) {
        datosShell = {
          id: brandingSub.id,
          nombre: brandingSub.nombre,
          slug: brandingSub.slug,
          logoUrl: brandingSub.logoUrl,
          colorAcento: brandingSub.colorAcento,
          taglinePortal: brandingSub.taglinePortal,
          splashHabilitado: brandingSub.splashHabilitado,
        };
      }
    }
    if (!datosShell && filaTenant) {
      datosShell = {
        id: filaTenant.id,
        nombre: filaTenant.nombre,
        slug: filaTenant.slug ?? null,
        logoUrl: filaTenant.logo_url ?? null,
        colorAcento: filaTenant.color_acento ?? null,
        taglinePortal: filaTenant.tagline_portal ?? null,
        splashHabilitado: filaTenant.splash_habilitado ?? true,
      };
    }

    if (datosShell) {
      return (
        <PosthogProvider>
          <IdleLogout />
          <ShellPortalCliente
            tenant={datosShell}
            usuarioLabel={user?.user_metadata?.full_name ?? user?.email ?? ""}
          >
            {children}
          </ShellPortalCliente>
        </PosthogProvider>
      );
    }
  }

  return (
    <PosthogProvider>
      <ModuloActivoProvider>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&display=swap"
          rel="stylesheet"
        />
        <div className="flex flex-1 min-h-screen">
          <IdleLogout />
          <Sidebar />
          <div className="flex-1 flex flex-col min-w-0">
            <header className="print:hidden sticky top-0 z-30 flex items-center justify-between bg-background/40 backdrop-blur-md px-6 py-3 gap-4">
              <span className="text-sm text-muted shrink-0">
                {user?.user_metadata?.full_name ?? user?.email}
              </span>
              <ModuloSwitcher />
              <div className="flex-1 max-w-xl">
                <GlobalSearch />
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <ThemeToggle />
                <LogoutButton />
              </div>
            </header>
            <main className="flex-1 p-6 overflow-x-auto">{children}</main>
          </div>
        </div>
      </ModuloActivoProvider>
    </PosthogProvider>
  );
}
