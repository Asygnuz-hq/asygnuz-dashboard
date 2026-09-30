// Íconos de línea para las secciones del menú — antes eran emoji; JM pidió
// quitarlos ("no me gustan los emojis"). Mismo trazo simple en todos
// (stroke=currentColor, así heredan el color del texto/hover del link).
function Base({ children }: { children: React.ReactNode }) {
  return (
    <svg width="15" height="15" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
      {children}
    </svg>
  );
}

export const IconoClientes = () => (
  <Base>
    <circle cx="10" cy="6.5" r="3.2" />
    <path d="M3.5 17c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6" />
  </Base>
);

export const IconoFinanzas = () => (
  <Base>
    <rect x="2.5" y="5" width="15" height="10" rx="2" />
    <path d="M2.5 8.5h15" />
  </Base>
);

export const IconoCobros = () => (
  <Base>
    <path d="M5 3h10v14l-2.5-1.6L10 17l-2.5-1.6L5 17V3Z" />
    <path d="M7.5 7.5h5M7.5 10.5h5" />
  </Base>
);

export const IconoMarketing = () => (
  <Base>
    <path d="M3 12l4-5 4 3 5-6" />
    <path d="M13 4h3v3" />
  </Base>
);

export const IconoCrm = () => (
  <Base>
    <circle cx="5" cy="5" r="2" />
    <circle cx="15" cy="5" r="2" />
    <circle cx="10" cy="15" r="2" />
    <path d="M6.6 6.2L9 13.5M13.4 6.2L11 13.5" />
  </Base>
);

export const IconoOperacion = () => (
  <Base>
    <rect x="3" y="3" width="14" height="14" rx="3" />
    <path d="M6.5 10.3l2.2 2.3 4.8-5.2" />
  </Base>
);

export const IconoEquipo = () => (
  <Base>
    <circle cx="7" cy="6.5" r="2.4" />
    <circle cx="14" cy="7.5" r="2" />
    <path d="M2.6 16c0-2.8 2-4.6 4.9-4.6M11 16c0-2.4 1.6-4 4-4s4 1.6 4 4" />
  </Base>
);

export const IconoEmergencia = () => (
  <Base>
    <path d="M10 3l8 14H2L10 3Z" />
    <path d="M10 8.5v3.2M10 14.3h.01" />
  </Base>
);
