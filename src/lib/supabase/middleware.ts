import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { derivarModulo, MODULO_HOME } from "@/lib/moduloDeRuta";
import { modulosDelTenant, primerModuloHabilitado } from "@/lib/modulosServidor";
import { estadoMfa } from "@/lib/api/mfa";
import { extraerSubdominio } from "@/lib/portal/subdominio";

export async function updateSession(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const subdominioPortal = extraerSubdominio(request.headers.get("host"));

  // Rutas públicas que no requieren sesión.
  if (
    pathname.startsWith("/agenda") ||
    pathname.startsWith("/lumia") ||
    pathname.startsWith("/radia") ||
    pathname.startsWith("/onestar") ||
    pathname.startsWith("/one-star") ||
    pathname.startsWith("/r/") ||
    pathname === "/privacidad" ||
    pathname === "/eliminacion-datos"
  ) {
    return NextResponse.next({ request });
  }

  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const redirigir = (url: URL) => {
    const redireccion = NextResponse.redirect(url);
    response.cookies.getAll().forEach((cookie) => redireccion.cookies.set(cookie));
    return redireccion;
  };

  const isLoginPage = pathname.startsWith("/login");

  if (!user && !isLoginPage) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return redirigir(url);
  }

  if (user) {
    const estado = await estadoMfa(supabase);
    const enActivar2fa = pathname.startsWith("/activar-2fa");
    const redirigirA = (destino: string) => {
      const url = request.nextUrl.clone();
      url.pathname = destino;
      url.search = "";
      return redirigir(url);
    };

    if (estado === "verificar" && !isLoginPage) return redirigirA("/login");
    if (estado === "enrolar" && !enActivar2fa) return redirigirA("/activar-2fa");
    if (estado === "ok" && (isLoginPage || enActivar2fa)) {
      return redirigirA(subdominioPortal ? "/portal" : "/");
    }

    if (estado === "ok") {
      // Subdominio dedicado de cliente (ej. lumia.asygnuz.com):
      // - Solo expone rutas /portal/* (y /sin-acceso).
      // - Verifica que el usuario autenticado pertenezca al tenant de ese
      //   subdominio (o tenga permiso gestiona_portales de ASYGNUZ).
      if (subdominioPortal && !pathname.startsWith("/sin-acceso")) {
        const [{ data: tenantData }, { data: puedeGestionar }] = await Promise.all([
          supabase.rpc("tenant_actual"),
          supabase.rpc("gestiona_portales"),
        ]);
        const filaTenant = Array.isArray(tenantData) ? tenantData[0] : tenantData;
        const coincideSubdominio =
          filaTenant &&
          (String(filaTenant.subdominio ?? "").toLowerCase() === subdominioPortal ||
            String(filaTenant.slug ?? "").toLowerCase() === subdominioPortal);

        if (!coincideSubdominio && puedeGestionar !== true) {
          return redirigirA("/sin-acceso");
        }

        if (!pathname.startsWith("/portal")) {
          return redirigirA("/portal");
        }
      }

      const { data: esEmergencia } = await supabase.rpc("es_emergencia");
      const enRutaEmergencia = pathname.startsWith("/emergencia");

      if (esEmergencia && !enRutaEmergencia) {
        const url = request.nextUrl.clone();
        url.pathname = "/emergencia";
        return redirigir(url);
      }

      if (!esEmergencia && !pathname.startsWith("/sin-acceso")) {
        const modulos = await modulosDelTenant(supabase);
        if (!modulos || modulos[derivarModulo(pathname)] !== true) {
          const destino = modulos ? primerModuloHabilitado(modulos) : null;
          const url = request.nextUrl.clone();
          url.pathname = destino ? MODULO_HOME[destino] : "/sin-acceso";
          url.search = "";
          if (url.pathname !== pathname) return redirigir(url);
        }

        if (
          modulos &&
          (pathname.startsWith("/analitica") || pathname.startsWith("/marketing/recursos")) &&
          modulos.analitica !== true
        ) {
          return redirigirA("/");
        }

        if (
          modulos &&
          ((pathname.startsWith("/crm/prospeccion") && modulos.prospeccion !== true) ||
            (pathname.startsWith("/crm/casos-negocio") && modulos.casos_negocio !== true))
        ) {
          return redirigirA("/crm");
        }

        if (pathname.startsWith("/portal-admin")) {
          const { data: puede } = await supabase.rpc("gestiona_portales");
          if (puede !== true) {
            return redirigirA("/");
          }
        }
      }
    }
  }

  return response;
}
