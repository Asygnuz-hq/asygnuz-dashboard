import { Sidebar } from "@/components/Sidebar";
import { LogoutButton } from "@/components/LogoutButton";
import { ThemeToggle } from "@/components/ThemeToggle";
import { GlobalSearch } from "@/components/GlobalSearch";
import { IdleLogout } from "@/components/IdleLogout";
import { ModuloSwitcher } from "@/components/ModuloSwitcher";
import { PosthogProvider } from "@/components/PosthogProvider";
import { ModuloActivoProvider } from "@/lib/ModuloActivoContext";
import { createClient } from "@/lib/supabase/server";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <PosthogProvider>
      <ModuloActivoProvider>
        {/* Fuente de títulos/números (.font-display en globals.css) —
            rediseño 2026-09-30, la misma que ya usa /portal (Space
            Grotesk). Un solo <link>, no next/font: en esta versión de
            Next/Turbopack falla al compartirlo entre varios client
            components (ver src/lib/portal/fuente.ts). Bodoni Moda (el
            primer intento) se sentía "rara" para JM — se cambió a esto. */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&display=swap"
          rel="stylesheet"
        />
        <div className="flex flex-1 min-h-screen">
          <IdleLogout />
          <Sidebar />
          <div className="flex-1 flex flex-col min-w-0">
            <header className="print:hidden flex items-center justify-between border-b border-border bg-surface px-6 py-3 gap-4">
              <span className="text-sm text-muted shrink-0">
                {user?.user_metadata?.full_name ?? user?.email}
              </span>
              <ModuloSwitcher />
              <div className="flex-1 max-w-xl">
                <GlobalSearch />
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <ThemeToggle />
                <LogoutButton />
              </div>
            </header>
            <main className="flex-1 p-6 overflow-x-auto">{children}</main>
          </div>
        </div>
      </ModuloActivoProvider>
    </PosthogProvider>
  );
}
