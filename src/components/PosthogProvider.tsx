"use client";

import { useEffect } from "react";
import posthog from "posthog-js";
import { PostHogProvider as PHProvider } from "posthog-js/react";
import { useTenantActual } from "@/lib/useTenantActual";

const KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY;
const HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://us.i.posthog.com";

if (KEY && typeof window !== "undefined" && !posthog.__loaded) {
  posthog.init(KEY, {
    api_host: HOST,
    capture_pageview: true,
    person_profiles: "identified_only",
  });
}

export function PosthogProvider({ children }: { children: React.ReactNode }) {
  const tenant = useTenantActual();

  useEffect(() => {
    // Asociar al grupo "tenant" desde el día 1 — sin esto, "qué módulo usa
    // más cada cliente" no se puede reconstruir después con los eventos ya
    // capturados sin ese dato.
    if (KEY && tenant) {
      posthog.group("tenant", tenant.id, { name: tenant.nombre });
    }
  }, [tenant]);

  if (!KEY) return <>{children}</>;
  return <PHProvider client={posthog}>{children}</PHProvider>;
}
