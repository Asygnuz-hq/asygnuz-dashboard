-- ==============================================================================
-- Tokens de agente por portal (MCP) y registro de sus cambios.
-- Correr ANTES de desplegar: validarTokenAgente ya lee tenant_id.
-- tenant_id null = token de bandeja (como los de hoy). Con tenant_id = token MCP,
-- limitado a ese portal y rechazado por /api/bandeja/agente/*, que ve todas las cuentas.
-- ==============================================================================

alter table public.tokens_agente
  add column if not exists tenant_id uuid references public.tenants(id) on delete cascade,
  add column if not exists puede_escribir boolean not null default false;

create table if not exists public.agente_auditoria (
  id uuid primary key default gen_random_uuid(),
  token_id uuid not null references public.tokens_agente(id) on delete cascade,
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  accion text not null,
  recurso_id uuid,
  cambios jsonb not null default '{}'::jsonb,
  creado_en timestamptz not null default now()
);

create index if not exists idx_agente_auditoria_tenant on public.agente_auditoria (tenant_id, creado_en desc);

alter table public.agente_auditoria enable row level security;
revoke all on public.agente_auditoria from anon, authenticated;
grant all on public.agente_auditoria to service_role;
