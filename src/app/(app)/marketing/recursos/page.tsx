import { PageHeader } from "@/components/PageHeader";

// Panel de registros de recursos gratuitos (plantillas, skills, guías regaladas).
// Es una herramienta interna de ASYGNUZ: la ruta exige el flag "analitica" del
// tenant (middleware + Sidebar), igual que /analitica, aunque cuelgue de Marketing.
// El panel vive aparte (proyecto skill-pauta-web), lee la tabla `leads` con
// fuente = 'Recurso gratuito' y pide su propia clave.
const PANEL_URL = process.env.NEXT_PUBLIC_PANEL_RECURSOS_URL || "https://pauta-skill.vercel.app/panel";

export default function RecursosGratuitosPage() {
  return (
    <div className="flex flex-col gap-6 h-full">
      <PageHeader
        title="Recursos gratuitos"
        subtitle="Registros de plantillas y recursos regalados: totales, UTMs, inversión en pauta y contactos."
      />
      <iframe
        src={PANEL_URL}
        className="w-full flex-1 min-h-[70vh] glass rounded-2xl"
        title="Panel de registros de recursos gratuitos"
        sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox allow-downloads"
      />
    </div>
  );
}
