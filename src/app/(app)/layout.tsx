import { Sidebar } from "@/components/Sidebar";
import { LogoutButton } from "@/components/LogoutButton";
import { ThemeToggle } from "@/components/ThemeToggle";
import { GlobalSearch } from "@/components/GlobalSearch";
import { IdleLogout } from "@/components/IdleLogout";
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
    <div className="flex flex-1 min-h-screen">
      <IdleLogout />
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <header className="print:hidden flex items-center justify-between border-b border-border bg-surface px-6 py-3 gap-4">
          <span className="text-sm text-muted shrink-0">
            {user?.user_metadata?.full_name ?? user?.email}
          </span>
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
  );
}
