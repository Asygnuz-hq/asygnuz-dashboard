import { PageHeader } from "@/components/PageHeader";

// v1: se embebe el dashboard compartido de PostHog (Share → Public link)
// en vez de reconstruir funnels/retención con la Query API — mucho más
// rápido de entregar y es la UI ya pulida de PostHog.
const DASHBOARD_URL = process.env.NEXT_PUBLIC_POSTHOG_SHARED_DASHBOARD_URL;

export default function AnaliticaPage() {
  return (
    <div className="flex flex-col gap-6 h-full">
      <PageHeader
        title="Analítica de uso"
        subtitle="Funnels de activación, retención por cohorte y qué módulo usa más cada cliente — vía PostHog."
      />
      {DASHBOARD_URL ? (
        <iframe
          src={DASHBOARD_URL}
          className="w-full flex-1 min-h-[70vh] glass rounded-2xl"
          title="Dashboard de PostHog"
        />
      ) : (
        <p className="text-sm text-muted">
          Falta configurar NEXT_PUBLIC_POSTHOG_SHARED_DASHBOARD_URL — crea un dashboard en PostHog Cloud,
          usa &quot;Share&quot; → &quot;Public link&quot; y pega esa URL en las variables de entorno.
        </p>
      )}
    </div>
  );
}
