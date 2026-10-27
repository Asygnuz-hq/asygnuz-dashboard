import type { NextConfig } from "next";

// Headers de seguridad. Sin X-Frame-Options ni frame-ancestors cualquier
// sitio podía embeber el dashboard (clickjacking, sobre todo sobre /login y
// las pantallas financieras). El dashboard EMBEBE a otros (Kaneo, PostHog,
// Cal.com) pero nadie necesita embeberlo a él, así que se prohíbe del todo.
// No se define una CSP completa a propósito: el login (Turnstile), PostHog,
// Cal.com y los iframes de Kaneo cargan scripts/frames de terceros y una CSP
// estricta sin probarla los rompería. HSTS ya lo pone Vercel.
const headersDeSeguridad = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
];

const nextConfig: NextConfig = {
  async headers() {
    return [{ source: "/:path*", headers: headersDeSeguridad }];
  },
  async rewrites() {
    return [
      { source: "/lumia", destination: "/lumia/Propuesta_Lumia.html" },
      { source: "/lumia/propuesta", destination: "/lumia/Propuesta_Lumia.html" },
      { source: "/lumia/resultados", destination: "/lumia/Resultados_Lumia.html" },
      { source: "/lumia/analisis", destination: "/lumia/Analisis_Lumia.html" },
      { source: "/radia/demo", destination: "/radia/Demo_Radia.html" },
      { source: "/radia/visor", destination: "/radia/visor/index.html" },
      { source: "/radia/visor/:path*", destination: "/radia/visor/index.html" },
      { source: "/radia", destination: "/radia/Propuesta_Radia.html" },
      { source: "/radia/propuesta", destination: "/radia/Propuesta_Radia.html" },
    ];
  },
};

export default nextConfig;
