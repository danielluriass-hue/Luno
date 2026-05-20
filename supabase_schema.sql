-- ─── EVENTOS / AGENDA ───────────────────────────────────────────────
create table events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  title text not null,
  description text,
  date date not null,
  start_time time,
  end_time time,
  color text default '#10b981',
  reminder_email boolean default false,
  created_at timestamptz default now()
);
alter table events enable row level security;
create policy "users own events" on events for all using (auth.uid() = user_id);

-- ─── TAREAS ─────────────────────────────────────────────────────────
create table tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  title text not null,
  description text,
  priority text default 'media' check (priority in ('alta','media','baja')),
  category text,
  due_date date,
  completed boolean default false,
  completed_at timestamptz,
  created_at timestamptz default now()
);
alter table tasks enable row level security;
create policy "users own tasks" on tasks for all using (auth.uid() = user_id);

-- ─── HÁBITOS ────────────────────────────────────────────────────────
create table habits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  icon text default '⭐',
  color text default '#10b981',
  frequency text default 'diario' check (frequency in ('diario','semanal')),
  created_at timestamptz default now()
);
alter table habits enable row level security;
create policy "users own habits" on habits for all using (auth.uid() = user_id);

create table habit_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  habit_id uuid references habits(id) on delete cascade not null,
  date date not null,
  done boolean default true,
  created_at timestamptz default now(),
  unique(habit_id, date)
);
alter table habit_logs enable row level security;
create policy "users own habit_logs" on habit_logs for all using (auth.uid() = user_id);

-- ─── NOTAS ──────────────────────────────────────────────────────────
create table notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  title text,
  content text not null,
  pinned boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
alter table notes enable row level security;
create policy "users own notes" on notes for all using (auth.uid() = user_id);

-- ─── METAS ──────────────────────────────────────────────────────────
create table goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  title text not null,
  description text,
  period text default 'mensual' check (period in ('semanal','mensual','anual')),
  progress int default 0 check (progress >= 0 and progress <= 100),
  due_date date,
  completed boolean default false,
  created_at timestamptz default now()
);
alter table goals enable row level security;
create policy "users own goals" on goals for all using (auth.uid() = user_id);

-- ─── RUTINAS ────────────────────────────────────────────────────────
create table routines (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  type text default 'manana' check (type in ('manana','noche','personalizada')),
  items jsonb default '[]',
  created_at timestamptz default now()
);
alter table routines enable row level security;
create policy "users own routines" on routines for all using (auth.uid() = user_id);

create table routine_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  routine_id uuid references routines(id) on delete cascade not null,
  date date not null,
  completed_items jsonb default '[]',
  created_at timestamptz default now(),
  unique(routine_id, date)
);
alter table routine_logs enable row level security;
create policy "users own routine_logs" on routine_logs for all using (auth.uid() = user_id);
