// Carga el Google Font que usan los encabezados del Portal de Cliente (ver
// src/lib/portal/fuente.ts) — mismo font que /portal, para que lo que JM
// arma se vea igual a lo que ve el cliente.
export default function PortalAdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link
        href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&display=swap"
        rel="stylesheet"
      />
      {children}
    </>
  );
}
