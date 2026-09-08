"use client";

import { useEffect } from "react";
import Script from "next/script";

// Landing pública para pautar — agenda una llamada de ventas vía Cal.com
// (plan free, cloud, sin login). Fuera del grupo (app): no lleva
// Sidebar/header ni pasa por el chequeo de sesión del middleware.
const CALCOM_LINK = process.env.NEXT_PUBLIC_CALCOM_LINK;

export default function AgendaPage() {
  useEffect(() => {
    if (!CALCOM_LINK) return;
    // @ts-expect-error -- Cal.com inyecta esto globalmente vía su embed.js
    window.Cal =
      // @ts-expect-error -- ídem
      window.Cal ||
      function (...args: unknown[]) {
        // @ts-expect-error -- cola de comandos hasta que cargue embed.js
        (window.Cal.q = window.Cal.q || []).push(args);
      };
    // @ts-expect-error -- API pública de Cal.com
    window.Cal("init", { origin: "https://cal.com" });
    // @ts-expect-error -- ídem
    window.Cal("inline", {
      elementOrSelector: "#cal-embed",
      calLink: CALCOM_LINK,
      layout: "month_view",
    });
  }, []);

  return (
    <div className="min-h-screen flex flex-col items-center px-4 py-10 gap-6">
      <Script src="https://app.cal.com/embed/embed.js" strategy="afterInteractive" />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/logo.png" alt="Asygnuz" className="h-9 w-auto" style={{ filter: "var(--logo-filter)" }} />
      <div className="text-center max-w-lg">
        <h1 className="text-2xl font-semibold">Agenda una llamada con ASYGNUZ</h1>
        <p className="text-sm text-muted mt-2">
          Cuéntanos qué necesitas y te mostramos cómo ASYGNUZ Growth o Software puede ayudarte.
        </p>
      </div>
      {CALCOM_LINK ? (
        <div id="cal-embed" className="w-full max-w-3xl min-h-[600px] rounded-lg border border-border bg-surface" />
      ) : (
        <p className="text-sm text-muted">
          Falta configurar NEXT_PUBLIC_CALCOM_LINK (el slug del tipo de evento en Cal.com).
        </p>
      )}
    </div>
  );
}
