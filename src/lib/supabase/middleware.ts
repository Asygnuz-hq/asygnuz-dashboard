import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { derivarModulo, MODULO_HOME } from "@/lib/moduloDeRuta";
import { modulosDelTenant, primerModuloHabilitado } from "@/lib/modulosServidor";
import { estadoMfa } from "@/lib/api/mfa";

export async function updateSession(request: NextRequest) {
  // /agenda es la landing pública de Cal.com para pautar — no requiere
  // sesión ni pasa por ninguna lógica de auth/MFA/emergencia de abajo.
  // /r/ son los enlaces de seguimiento acortados de la bandeja de Instagram (públicos).
  if (
    request.nextUrl.pathname.startsWith("/agenda") ||
    request.nextUrl.pathname.startsWith("/lumia") ||
    request.nextUrl.pathname.startsWith("/radia") ||
    request.nextUrl.pathname.startsWith("/onestar") ||
    request.nextUrl.pathname.startsWith("/one-star") ||
    request.nextUrl.pathname.startsWith("/r/") ||
    // Páginas legales que exige Meta para la app (públicas).
    request.nextUrl.pathname === "/privacidad" ||
    request.nextUrl.pathname === "/eliminacion-datos"
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

  // Toda redirección debe llevar las cookies que getUser() pudo haber
  // renovado arriba. Un NextResponse.redirect "pelado" las descarta: el
  // navegador se queda con el refresh token viejo (ya rotado), el siguiente
  // pedido lo reusa, Supabase lo detecta como reuso y cierra la sesión
  // (el "me saca cada pocos minutos").
  const redirigir = (url: URL) => {
    const redireccion = NextResponse.redirect(url);
    response.cookies.getAll().forEach((cookie) => redireccion.cookies.set(cookie));
    return redireccion;
  };

  const isLoginPage = request.nextUrl.pathname.startsWith("/login");

  if (!user && !isLoginPage) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return redirigir(url);
  }

  if (user) {
    // 2FA (ver src/lib/api/mfa.ts):
    // - "verificar": entró con contraseña pero no completó el segundo
    //   factor (ej. cerró la pestaña a mitad del login) -> /login.
    // - "enrolar": no tiene factor y el alta es obligatoria -> /activar-2fa.
    // Ninguna ruta protegida se abre hasta que el estado sea "ok".
    const estado = await estadoMfa(supabase);
    const enActivar2fa = request.nextUrl.pathname.startsWith("/activar-2fa");
    const redirigirA = (destino: string) => {
      const url = request.nextUrl.clone();
      url.pathname = destino;
      url.search = "";
      return redirigir(url);
    };

    if (estado === "verificar" && !isLoginPage) return redirigirA("/login");
    if (estado === "enrolar" && !enActivar2fa) return redirigirA("/activar-2fa");
    if (estado === "ok" && (isLoginPage || enActivar2fa)) return redirigirA("/");

    // Usuario externo del caso del terremoto — solo puede ver /emergencia,
    // sin importar qué otra ruta pida. Aislamiento de UI; el aislamiento
    // real de datos vive en las políticas RLS (schema-emergencia-terremoto.sql).
    if (estado === "ok") {
      // RPC en vez de leer la tabla directo: es_emergencia() es
      // security definer y no queda bloqueada por su propia política RLS
      // (que le niega a este mismo usuario leer profiles).
      const { data: esEmergencia } = await supabase.rpc("es_emergencia");
      const enRutaEmergencia = request.nextUrl.pathname.startsWith("/emergencia");

      if (esEmergencia && !enRutaEmergencia) {
        const url = request.nextUrl.clone();
        url.pathname = "/emergencia";
        return redirigir(url);
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
          if (url.pathname !== pathname) return redirigir(url);
        }

        // /analitica embebe un dashboard de PostHog con el uso de TODOS los
        // tenants: es una herramienta interna de ASYGNUZ, no un módulo que se
        // le venda a un cliente. Exige un flag propio, aparte de "financiero".
        if (modulos && pathname.startsWith("/analitica") && modulos.analitica !== true) {
          const url = request.nextUrl.clone();
          url.pathname = "/";
          url.search = "";
          return redirigir(url);
        }

        // /portal-admin es la gestión de portales de clientes de Growth —
        // acotada A LA PERSONA (gestiona_portales), no a todo el tenant
        // ASYGNUZ: JM no quiere que cualquier admin del equipo la vea.
        if (pathname.startsWith("/portal-admin")) {
          const { data: puede } = await supabase.rpc("gestiona_portales");
          if (puede !== true) {
            const url = request.nextUrl.clone();
            url.pathname = "/";
            url.search = "";
            return redirigir(url);
          }
        }
      }
    }
  }

  return response;
}
