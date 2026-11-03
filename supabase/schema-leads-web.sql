-- ==============================================================================
-- Leads que llegan del formulario de una web (ej. andres-agudelo.dev).
-- Correr ANTES de desplegar. Guarda datos personales: solo service_role accede.
-- ==============================================================================

create table if not exists public.leads_web (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  nombre text not null,
  email text not null,
  asunto text not null,
  mensaje text not null,
  oferta text,
  origen text,
  utm jsonb not null default '{}'::jsonb,
  autorizado_en timestamptz not null,
  estado text not null default 'nuevo' check (estado in ('nuevo', 'contactado', 'calificado', 'descartado')),
  creado_en timestamptz not null default now()
);

create index if not exists idx_leads_web_tenant on public.leads_web (tenant_id, creado_en desc);

alter table public.leads_web enable row level security;
revoke all on public.leads_web from anon, authenticated;
grant all on public.leads_web to service_role;
