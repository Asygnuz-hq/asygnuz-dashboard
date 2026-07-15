import { Sidebar } from "@/components/Sidebar";
import { LogoutButton } from "@/components/LogoutButton";
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
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <header className="flex items-center justify-between border-b border-border bg-surface px-6 py-3">
          <span className="text-sm text-muted">
            {user?.user_metadata?.full_name ?? user?.email}
          </span>
          <LogoutButton />
        </header>
        <main className="flex-1 p-6 overflow-x-auto">{children}</main>
      </div>
    </div>
  );
}
