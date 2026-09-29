// Tipografía de títulos SOLO para las pantallas del Portal de Cliente — no
// se toca el font-family global del dashboard (Arial en globals.css), es un
// acento puntual en encabezados, elegido con JM entre las 2 propuestas
// visuales (la "oscura").
//
// No usa next/font/google: en esta versión de Next (16.3.6, Turbopack) falla
// al compartir la misma llamada de next/font entre varios client components
// ("next/font/google queries have exactly one entry"). En su lugar, el
// <link> de Google Fonts se carga una vez desde los layout.tsx de /portal y
// /portal-admin, y esto solo exporta el font-family a usar inline.
export const FUENTE_DISPLAY = "'Space Grotesk', sans-serif";
