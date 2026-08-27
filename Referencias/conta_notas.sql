-- Tab Notas en Contabilidad Completa (2026-08-26)
-- Anotaciones libres por empresa, opcionalmente etiquetadas con el estado/tab al que se refieren.

create table conta_notas (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null,
  user_id uuid not null,
  texto text not null,
  relacionado text default '',
  fijada boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table conta_notas enable row level security;

create policy "notas_self" on conta_notas for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index on conta_notas (empresa_id, created_at desc);
