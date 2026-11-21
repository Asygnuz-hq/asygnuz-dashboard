// Utilidades de subdominio y branding para portales exclusivos de clientes.
// Ej.: lumia.asygnuz.com → subdominio "lumia" (y en local: lumia.localhost:3000).

export type BrandingPortal = {
  id: string;
  nombre: string;
  slug: string;
  subdominio: string | null;
  logoUrl: string | null;
  colorAcento: string | null;
  taglinePortal: string | null;
  splashHabilitado: boolean;
};

// Subdominios reservados para el holding o apps internas — nunca se
// resuelven como portal de cliente.
const RESERVADOS = new Set([
  "app",
  "www",
  "kaneo",
  "crm",
  "api",
  "admin",
  "asygnuz",
  "asygnuz-dashboard",
  "mail",
  "staging",
  "dev",
]);

const DOMINIOS_BASE = ["asygnuz.com", "localhost"];

export function extraerSubdominio(hostHeader: string | null | undefined): string | null {
  if (!hostHeader) return null;
  const host = hostHeader.split(":")[0].trim().toLowerCase();
  if (!host) return null;

  for (const base of DOMINIOS_BASE) {
    if (host === base) return null;
    const sufijo = `.${base}`;
    if (host.endsWith(sufijo)) {
      const candidato = host.slice(0, -sufijo.length);
      // Solo un nivel (lumia.asygnuz.com). Si tiene puntos o es reservado, ignorar.
      if (!candidato || candidato.includes(".") || RESERVADOS.has(candidato)) return null;
      if (!/^[a-z0-9-]+$/.test(candidato)) return null;
      return candidato;
    }
  }
  return null;
}

/**
 * Calcula si el texto sobre un color hex debe ser oscuro o claro para cumplir
 * contraste WCAG AA (ej. dorado #C9A45C → texto oscuro #09090B; navy #16233D → blanco).
 */
export function colorTextoSobreAcento(hex: string | null | undefined): string {
  if (!hex || !/^#[0-9a-fA-F]{6}$/.test(hex)) return "#09090B";
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return lum > 0.52 ? "#09090B" : "#FAF9F5";
}

export function urlSubdominio(subdominio: string | null | undefined): string | null {
  if (!subdominio) return null;
  return `https://${subdominio}.asygnuz.com`;
}
