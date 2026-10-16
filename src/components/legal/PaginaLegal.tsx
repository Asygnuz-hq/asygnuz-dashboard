// Contenedor de las páginas legales públicas (/privacidad, /eliminacion-datos),
// que Meta exige para la app "ASYGNUZ Métricas". Sin sesión ni menú lateral.
export function PaginaLegal({ titulo, actualizado, children }: { titulo: string; actualizado: string; children: React.ReactNode }) {
  return (
    <main className="min-h-screen px-4 py-12 sm:py-16">
      <article className="mx-auto max-w-2xl glass rounded-2xl p-6 sm:p-10 flex flex-col gap-5 text-sm leading-relaxed">
        <header className="flex flex-col gap-1">
          <p className="text-xs uppercase tracking-[0.18em] text-muted">ASYGNUZ</p>
          <h1 className="text-2xl font-semibold">{titulo}</h1>
          <p className="text-xs text-muted">Última actualización: {actualizado}</p>
        </header>
        {children}
      </article>
    </main>
  );
}
