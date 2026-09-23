import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { derivarModulo, MODULO_HOME } from "@/lib/moduloDeRuta";
import { modulosDelTenant, primerModuloHabilitado } from "@/lib/modulosServidor";

export async function updateSession(request: NextRequest) {
  // /agenda es la landing pública de Cal.com para pautar — no requiere
  // sesión ni pasa por ninguna lógica de auth/MFA/emergencia de abajo.
  if (request.nextUrl.pathname.startsWith("/agenda")) {
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

  const isLoginPage = request.nextUrl.pathname.startsWith("/login");

  if (!user && !isLoginPage) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (user) {
    // Sesión creada con contraseña pero sin completar el segundo factor
    // todavía (ej. cerró la pestaña a mitad del login) — no dejar pasar
    // a rutas protegidas hasta que termine la verificación en /login.
    const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    const requiereSegundoFactor = aal?.nextLevel === "aal2" && aal.currentLevel !== "aal2";

    if (requiereSegundoFactor && !isLoginPage) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      return NextResponse.redirect(url);
    }

    if (isLoginPage && !requiereSegundoFactor) {
      const url = request.nextUrl.clone();
      url.pathname = "/";
      return NextResponse.redirect(url);
    }

    // Usuario externo del caso del terremoto — solo puede ver /emergencia,
    // sin importar qué otra ruta pida. Aislamiento de UI; el aislamiento
    // real de datos vive en las políticas RLS (schema-emergencia-terremoto.sql).
    if (!requiereSegundoFactor && !isLoginPage) {
      // RPC en vez de leer la tabla directo: es_emergencia() es
      // security definer y no queda bloqueada por su propia política RLS
      // (que le niega a este mismo usuario leer profiles).
      const { data: esEmergencia } = await supabase.rpc("es_emergencia");
      const enRutaEmergencia = request.nextUrl.pathname.startsWith("/emergencia");

      if (esEmergencia && !enRutaEmergencia) {
        const url = request.nextUrl.clone();
        url.pathname = "/emergencia";
        return NextResponse.redirect(url);
      }

      // Módulos contratados: se exigen aquí, en el servidor. Antes solo el
      // switcher escondía los botones y cualquier URL directa abría el
      // módulo. Si no se pueden resolver los módulos, se trata como sin
      // acceso (nunca como "todo permitido").
      const pathname = request.nextUrl.pathname;
      if (!esEmergencia && !pathname.startsWith("/sin-acceso")) {
        const modulos = await modulosDelTenant(supabase);
        if (!modulos || modulos[derivarModulo(pathname)] !== true) {
          const destino = modulos ? primerModuloHabilitado(modulos) : null;
          const url = request.nextUrl.clone();
          url.pathname = destino ? MODULO_HOME[destino] : "/sin-acceso";
          url.search = "";
          if (url.pathname !== pathname) return NextResponse.redirect(url);
        }
      }
    }
  }

  return response;
}
