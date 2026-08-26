-- ASYGNUZ Dashboard — Leads (alimentado por n8n)
-- Corre esto en Supabase → SQL Editor → New query → Run.

create table if not exists leads (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  empresa text,
  frente text not null default 'Growth' check (frente in ('Growth', 'Software')),
  fuente text not null default 'Google Places',
  telefono text,
  correo text,
  direccion text,
  sitio_web text,
  google_place_id text unique,
  estado text not null default 'Nuevo' check (estado in ('Nuevo', 'Contactado', 'Reunión agendada', 'Propuesta enviada', 'Cliente', 'Perdido')),
  notas text,
  created_at timestamptz not null default now()
);

create index if not exists idx_leads_estado on leads (estado);
create index if not exists idx_leads_frente on leads (frente);

alter table leads enable row level security;
drop policy if exists "team_full_access" on leads;
create policy "team_full_access" on leads for all to authenticated using (true) with check (true);

-- n8n escribe con la service role key (bypassa RLS), no necesita política aparte.
