import { PageHeader } from "@/components/PageHeader";

// Panel de registros de recursos gratuitos (plantillas, skills, guías).
// Vive en el proyecto `skill-pauta-web` (pauta-skill.vercel.app) y lee la tabla `leads`
// con fuente = "Recurso gratuito". Se embebe aquí; el panel pide su propia clave.
const PANEL_URL = "https://pauta-skill.vercel.app/panel";

export default function RecursosGratuitosPage() {
  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Recursos gratuitos"
        subtitle="Registros de plantillas y recursos regalados: totales, UTMs, inversión en pauta y contactos."
      />
      <div className="overflow-hidden rounded-2xl border border-border bg-black">
        <iframe
          src={PANEL_URL}
          title="Panel de registros de recursos gratuitos"
          className="block h-[calc(100vh-180px)] min-h-[640px] w-full"
          referrerPolicy="strict-origin-when-cross-origin"
        />
      </div>
      <a href={PANEL_URL} target="_blank" rel="noopener noreferrer" className="text-sm text-muted hover:text-foreground">
        Abrir el panel en otra pestaña →
      </a>
    </div>
  );
}
