import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// Cliente con service_role: solo se usa en rutas de servidor (cron, webhooks),
// nunca se importa en código de cliente. Ignora RLS a propósito.
export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}
