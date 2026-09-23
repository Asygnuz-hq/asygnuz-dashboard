import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import type { CuentaDisponible, MetaConexion } from "@/lib/meta/client";

// Los tokens de Meta (access_token, instagram_access_token) YA NO son
// legibles con la sesión del usuario: el rol `authenticated` no tiene SELECT
// sobre esas columnas (schema-seguridad-sprint1b.sql). Antes cualquier
// usuario del tenant podía hacer `select=access_token` directo contra
// PostgREST y llevarse el token de cada cliente conectado.
//
// Patrón de lectura: 1) con la sesión del usuario (RLS por tenant) se
// comprueba que la conexión ES de su tenant; 2) solo entonces se leen los
// tokens de ESA fila con el cliente de servidor.

export async function leerConexionConTokens(
  supabase: SupabaseClient,
  id: string
): Promise<MetaConexion | null> {
  const { data: visible } = await supabase.from("meta_conexiones").select("id").eq("id", id).maybeSingle();
  if (!visible) return null;

  const { data } = await createAdminClient()
    .from("meta_conexiones")
    .select("*")
    .eq("id", visible.id)
    .single<MetaConexion>();
  return data ?? null;
}

export async function listarConexionesConTokens(supabase: SupabaseClient): Promise<MetaConexion[]> {
  const { data: visibles } = await supabase.from("meta_conexiones").select("id");
  const ids = (visibles ?? []).map((v) => v.id as string);
  if (ids.length === 0) return [];

  const { data } = await createAdminClient()
    .from("meta_conexiones")
    .select("*")
    .in("id", ids)
    .order("cliente_nombre");
  return (data as MetaConexion[]) ?? [];
}

export type PendienteConToken = {
  cliente_nombre: string;
  access_token: string;
  token_expira_en: string | null;
  cuentas: CuentaDisponible[];
};

export async function leerPendienteConToken(
  supabase: SupabaseClient,
  id: string
): Promise<PendienteConToken | null> {
  const { data: visible } = await supabase.from("meta_conexiones_pendientes").select("id").eq("id", id).maybeSingle();
  if (!visible) return null;

  const { data } = await createAdminClient()
    .from("meta_conexiones_pendientes")
    .select("cliente_nombre, access_token, token_expira_en, cuentas")
    .eq("id", visible.id)
    .single();
  return (data as PendienteConToken) ?? null;
}
