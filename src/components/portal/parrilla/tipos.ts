// Tipos y catálogos de la parrilla tipo tabla (portal de cliente).
// Los catálogos son sugerencias: la base guarda texto libre, así que un
// canal/pilar/formato que no esté aquí se sigue mostrando (en gris).

import type { ESTADOS_CONTENIDO } from "@/lib/portal/schemas";

export type Contenido = {
  id: string;
  titulo: string;
  tipo: string | null; // formato: Carrusel, Reels, Foto...
  plataforma: string | null; // canal
  fecha_publicacion: string | null;
  hora: string | null;
  estado: (typeof ESTADOS_CONTENIDO)[number];
  pilar: string | null;
  copy: string | null;
  notas: string | null;
  link_referencia: string | null;
  link_drive: string | null;
  link: string | null;
  orden: number;
};

// Campos editables → nombre que espera la API (camelCase del schema zod).
export const CAMPO_API: Record<string, string> = {
  titulo: "titulo",
  tipo: "tipo",
  plataforma: "plataforma",
  fecha_publicacion: "fechaPublicacion",
  hora: "hora",
  estado: "estado",
  pilar: "pilar",
  copy: "copy",
  notas: "notas",
  link_referencia: "linkReferencia",
  link_drive: "linkDrive",
  link: "link",
};

export const CANALES: Record<string, string> = {
  Instagram: "#e1306c",
  TikTok: "#25c2d6",
  Facebook: "#4f7bd9",
  LinkedIn: "#2f86d6",
  YouTube: "#ef4444",
  WhatsApp: "#22b765",
  X: "#9aa3b2",
};

export const PILARES: Record<string, string> = {
  Educativo: "#4f8ef7",
  Lifestyle: "#f2a33a",
  Tendencia: "#e85d9e",
  "Filosofía": "#a78bfa",
  "Detrás de cámaras": "#22b3a3",
  Testimonio: "#34c27a",
  "Promoción": "#ef6b5b",
};

export const FORMATOS: Record<string, string> = {
  Carrusel: "#5b9cf2",
  Reels: "#ec6aa8",
  Foto: "#3fbf8f",
  Post: "#e8b23a",
  Historia: "#b07ef0",
  Video: "#ef6b6b",
};

export const GRIS = "#8b93a6";

export function colorDe(catalogo: Record<string, string>, valor: string | null) {
  return (valor && catalogo[valor]) || GRIS;
}

export function fechaLocal(f: string) {
  return new Date(`${f}T00:00:00`);
}

export function diaCorto(f: string | null) {
  if (!f) return "";
  const d = fechaLocal(f).toLocaleDateString("es-CO", { weekday: "short" }).replace(".", "");
  return d.charAt(0).toUpperCase() + d.slice(1);
}

export function fechaCorta(f: string | null) {
  if (!f) return "";
  return fechaLocal(f).toLocaleDateString("es-CO", { day: "numeric", month: "short" }).replace(".", "");
}

export function horaCorta(h: string | null) {
  if (!h) return "";
  const [hh, mm] = h.split(":").map(Number);
  const sufijo = hh >= 12 ? "p. m." : "a. m.";
  return `${((hh + 11) % 12) + 1}:${String(mm).padStart(2, "0")} ${sufijo}`;
}

/** Lunes de la semana de una fecha AAAA-MM-DD, como AAAA-MM-DD. */
export function lunesDe(f: string) {
  const d = fechaLocal(f);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return iso(d);
}

export function iso(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function ordenar(a: Contenido, b: Contenido) {
  const fa = a.fecha_publicacion ?? "9999-12-31";
  const fb = b.fecha_publicacion ?? "9999-12-31";
  if (fa !== fb) return fa < fb ? -1 : 1;
  const ha = a.hora ?? "99:99";
  const hb = b.hora ?? "99:99";
  if (ha !== hb) return ha < hb ? -1 : 1;
  return a.orden - b.orden;
}
