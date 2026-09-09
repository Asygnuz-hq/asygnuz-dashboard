"use client";

import { PageHeader } from "@/components/PageHeader";

// El Kaneo real, embebido -- no una reconstrucción. Misma instancia para
// todos los tenants (aislamiento por workspace de Kaneo, no por URL), así
// que no hace falta resolver nada por tenant acá: cada quien inicia sesión
// en Kaneo y solo ve los workspaces a los que pertenece.
//
// Requiere que kaneo.asygnuz.com y app.asygnuz.com sean subdominios del
// mismo dominio (same-site) -- si no, Safari/Chrome bloquean la cookie de
// sesión de Kaneo dentro del iframe. Ver PR Asygnuz-hq/kaneo#40 para el
// lado de Kaneo (CSP frame-ancestors).
const KANEO_URL = process.env.NEXT_PUBLIC_KANEO_EMBED_URL || "https://kaneo.asygnuz.com";

export default function KaneoPage() {
  return (
    <div className="flex flex-col gap-4 h-full">
      <PageHeader title="Gestor de Proyectos" subtitle="Kaneo, el mismo de siempre, ahora dentro del dashboard." />
      <iframe
        src={KANEO_URL}
        className="w-full flex-1 min-h-[80vh] rounded-lg border border-border"
        title="Kaneo"
      />
    </div>
  );
}
