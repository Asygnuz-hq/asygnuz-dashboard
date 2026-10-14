// Íconos de línea para las secciones del menú — antes eran emoji; JM pidió
// quitarlos ("no me gustan los emojis"). Mismo trazo simple en todos
// (stroke=currentColor, así heredan el color del texto/hover del link).
// `size` permite usarlos chicos (títulos del menú abierto, 15) o grandes
// (riel colapsado, 20).
export type IconoProps = { size?: number };

function Base({ children, size = 15 }: { children: React.ReactNode; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
      {children}
    </svg>
  );
}

export const IconoDashboard = ({ size }: IconoProps) => (
  <Base size={size}>
    <path d="M3 9.5L10 3.5l7 6" />
    <path d="M4.8 8.6V16a.8.8 0 0 0 .8.8H8.5v-4.6h3v4.6h2.9a.8.8 0 0 0 .8-.8V8.6" />
  </Base>
);

export const IconoClientes = ({ size }: IconoProps) => (
  <Base size={size}>
    <circle cx="10" cy="6.5" r="3.2" />
    <path d="M3.5 17c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6" />
  </Base>
);

export const IconoFinanzas = ({ size }: IconoProps) => (
  <Base size={size}>
    <rect x="2.5" y="5" width="15" height="10" rx="2" />
    <path d="M2.5 8.5h15" />
  </Base>
);

export const IconoCobros = ({ size }: IconoProps) => (
  <Base size={size}>
    <path d="M5 3h10v14l-2.5-1.6L10 17l-2.5-1.6L5 17V3Z" />
    <path d="M7.5 7.5h5M7.5 10.5h5" />
  </Base>
);

export const IconoMarketing = ({ size }: IconoProps) => (
  <Base size={size}>
    <path d="M3 12l4-5 4 3 5-6" />
    <path d="M13 4h3v3" />
  </Base>
);

export const IconoCrm = ({ size }: IconoProps) => (
  <Base size={size}>
    <circle cx="5" cy="5" r="2" />
    <circle cx="15" cy="5" r="2" />
    <circle cx="10" cy="15" r="2" />
    <path d="M6.6 6.2L9 13.5M13.4 6.2L11 13.5" />
  </Base>
);

export const IconoOperacion = ({ size }: IconoProps) => (
  <Base size={size}>
    <rect x="3" y="3" width="14" height="14" rx="3" />
    <path d="M6.5 10.3l2.2 2.3 4.8-5.2" />
  </Base>
);

export const IconoEquipo = ({ size }: IconoProps) => (
  <Base size={size}>
    <circle cx="7" cy="6.5" r="2.4" />
    <circle cx="14" cy="7.5" r="2" />
    <path d="M2.6 16c0-2.8 2-4.6 4.9-4.6M11 16c0-2.4 1.6-4 4-4s4 1.6 4 4" />
  </Base>
);

export const IconoAjustes = ({ size }: IconoProps) => (
  <Base size={size}>
    <circle cx="10" cy="10" r="2.4" />
    <path d="M10 2.8v2M10 15.2v2M2.8 10h2M15.2 10h2M4.9 4.9l1.4 1.4M13.7 13.7l1.4 1.4M4.9 15.1l1.4-1.4M13.7 6.3l1.4-1.4" />
  </Base>
);

export const IconoPortal = ({ size }: IconoProps) => (
  <Base size={size}>
    <rect x="3" y="3.5" width="14" height="13" rx="2.5" />
    <path d="M3 8h14M7 11.5h6" />
  </Base>
);

export const IconoEmergencia = ({ size }: IconoProps) => (
  <Base size={size}>
    <path d="M10 3l8 14H2L10 3Z" />
    <path d="M10 8.5v3.2M10 14.3h.01" />
  </Base>
);
