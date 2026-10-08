-- Strava Goals · actividades agregadas a mano
-- Ejecutar en el SQL editor de Supabase. Es idempotente. La app funciona sin esto; solo el botón "+" lo necesita.

create table if not exists public.manual_activities (
  id           bigint generated always as identity primary key,
  athlete_id   bigint not null references public.athletes(id) on delete cascade,
  sport        text   not null check (sport in ('run','ride','walk')),
  date         date   not null,                                         -- fecha local de la actividad
  distance     double precision not null check (distance > 0 and distance <= 1000000),   -- metros
  moving_time  integer not null default 0 check (moving_time between 0 and 172800),     -- segundos (0 = no se sabe)
  elevation    double precision not null default 0 check (elevation between 0 and 20000), -- metros
  name         text   not null check (char_length(name) between 1 and 80),
  created_at   timestamptz not null default now()
);
create index if not exists manual_activities_athlete_date_idx on public.manual_activities (athlete_id, date desc);

-- Igual que el resto: solo el servidor (service role) accede.
alter table public.manual_activities enable row level security;
