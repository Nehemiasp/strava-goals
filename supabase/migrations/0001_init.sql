-- Strava Goals · esquema inicial
-- El acceso es SOLO desde el servidor con la service role key. RLS activado sin políticas:
-- la anon key no puede leer ni escribir nada.

create table if not exists public.athletes (
  id                 bigint primary key,            -- id de atleta en Strava
  name               text   not null,
  avatar             text,
  access_token_enc   text   not null,               -- AES-256-GCM, ver lib/server/crypto.ts
  refresh_token_enc  text   not null,
  expires_at         bigint not null,               -- epoch (s)
  synced_at          timestamptz,
  created_at         timestamptz not null default now()
);

create table if not exists public.goals (
  id          uuid primary key default gen_random_uuid(),
  athlete_id  bigint not null references public.athletes(id) on delete cascade,
  title       text   not null check (char_length(title) between 1 and 80),
  metric      text   not null check (metric in ('distance','time','elevation','count','streak')),
  sport       text   not null check (sport in ('run','ride','both')),
  target      double precision not null check (target > 0),
  period      text   not null check (period in ('week','month','year','custom')),
  start_date  date   not null,
  end_date    date   not null,
  status      text   not null default 'active' check (status in ('active','archived')),
  created_at  timestamptz not null default now(),
  check (end_date >= start_date)
);
create index if not exists goals_athlete_idx on public.goals (athlete_id, status);

create table if not exists public.activity_cache (
  athlete_id  bigint not null references public.athletes(id) on delete cascade,
  id          bigint not null,                      -- id de actividad en Strava
  name        text   not null,
  sport       text   not null check (sport in ('run','ride')),
  sport_type  text   not null,
  date        date   not null,                      -- fecha local del atleta
  started_at  timestamptz not null,
  distance    double precision not null,
  moving_time integer not null,
  elevation   double precision not null,
  avg_speed   double precision not null,
  avg_hr      double precision,
  polyline    text,
  primary key (athlete_id, id)
);
create index if not exists activity_cache_date_idx on public.activity_cache (athlete_id, date desc);

alter table public.athletes       enable row level security;
alter table public.goals          enable row level security;
alter table public.activity_cache enable row level security;
