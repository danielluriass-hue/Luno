-- Checklist "Pagos del mes" en Presupuesto
-- Un registro = un gasto fijo o cuota de deuda marcado como pagado en un mes.
create table if not exists budget_pagos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  mes text not null,                                   -- 'YYYY-MM'
  origen text not null check (origen in ('fijo','deuda')),
  ref_id uuid not null,                                -- id en budget_gastos_fijos o budget_prestamos
  monto numeric(14,2) not null default 0,              -- monto al momento de marcarlo
  fecha_pago date not null default current_date,
  created_at timestamptz default now(),
  unique (user_id, mes, origen, ref_id)
);

alter table budget_pagos enable row level security;

-- Cada usuario accede a sus propios pagos
drop policy if exists "budget_self_access" on budget_pagos;
create policy "budget_self_access" on budget_pagos for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Joselin accede al presupuesto compartido de Daniel (igual que las demás tablas budget_*)
drop policy if exists "budget_shared_joselin" on budget_pagos;
create policy "budget_shared_joselin" on budget_pagos for all
  using (user_id = 'ca354bf9-9e8b-43d9-b10d-d1e6b0db792b' and auth.uid() = '96ac1020-d3aa-4e0f-92f2-5b42e759f0d6')
  with check (user_id = 'ca354bf9-9e8b-43d9-b10d-d1e6b0db792b' and auth.uid() = '96ac1020-d3aa-4e0f-92f2-5b42e759f0d6');

create index if not exists budget_pagos_user_mes on budget_pagos (user_id, mes);

-- Paso 2 (2026-10-09): cuánto se restó del saldo de la deuda al registrar el pago.
-- Al desmarcar el pago se devuelve exactamente este monto al saldo.
alter table budget_pagos add column if not exists saldo_aplicado numeric(14,2) not null default 0;
