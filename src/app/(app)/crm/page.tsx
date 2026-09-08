"use client";

import { PageHeader } from "@/components/PageHeader";
import { useTheme, CHART_COLORS } from "@/lib/useTheme";
import { useMetricasCrecimiento } from "@/lib/espocrm/useMetricasCrecimiento";
import { SeccionCrecimiento } from "../metricas/SeccionCrecimiento";

export default function CrmPage() {
  const theme = useTheme();
  const chartColors = CHART_COLORS[theme];
  const crecimiento = useMetricasCrecimiento();

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="CRM — Leads y Pipeline"
        subtitle="Leído directo de EspoCRM (bot de leads de Google Places + trabajo manual del equipo)."
      />
      <SeccionCrecimiento {...crecimiento} chartColors={chartColors} />
    </div>
  );
}
