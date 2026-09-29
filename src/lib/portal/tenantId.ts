const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// El tenantId de la URL viene del navegador — se valida el formato antes de
// usarlo en cualquier query (no por SQL injection, el cliente de Supabase ya
// parametriza, sino para devolver un 400 claro en vez de un 500/lista vacía
// rara si alguien pega cualquier cosa en la URL).
export function tenantIdValido(id: string): id is string {
  return UUID_RE.test(id);
}
