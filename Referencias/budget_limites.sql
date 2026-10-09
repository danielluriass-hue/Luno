-- Límite mensual por categoría de gasto variable (se repite cada mes)
create table if not exists budget_limites (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  categoria text not null,
  limite numeric(14,2) not null,
  created_at timestamptz default now(),
  unique (user_id, categoria)
);

alter table budget_limites enable row level security;

drop policy if exists "budget_self_access" on budget_limites;
create policy "budget_self_access" on budget_limites for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "budget_shared_joselin" on budget_limites;
create policy "budget_shared_joselin" on budget_limites for all
  using (user_id = 'ca354bf9-9e8b-43d9-b10d-d1e6b0db792b' and auth.uid() = '96ac1020-d3aa-4e0f-92f2-5b42e759f0d6')
  with check (user_id = 'ca354bf9-9e8b-43d9-b10d-d1e6b0db792b' and auth.uid() = '96ac1020-d3aa-4e0f-92f2-5b42e759f0d6');
