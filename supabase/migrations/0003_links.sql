-- Strava Goals · vínculo entre dos atletas (reto entre hermanos)
-- Ejecutar en el SQL editor de Supabase. Es idempotente. La app funciona sin esto; solo el reto lo necesita.

-- Invitaciones: un código de un solo uso que caduca. Una vigente por atleta (el código nuevo reemplaza al anterior).
create table if not exists public.link_invites (
  code          text primary key,
  from_athlete  bigint not null references public.athletes(id) on delete cascade,
  expires_at    timestamptz not null,
  created_at    timestamptz not null default now()
);
create unique index if not exists link_invites_from_idx on public.link_invites (from_athlete);

-- Vínculo aceptado por ambos. Se guarda el par ordenado (a < b) para que no existan duplicados invertidos.
-- Al borrar a cualquiera de los dos ("borrar mis datos") el vínculo desaparece.
create table if not exists public.athlete_links (
  a           bigint not null references public.athletes(id) on delete cascade,
  b           bigint not null references public.athletes(id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (a, b),
  check (a < b)
);
create index if not exists athlete_links_b_idx on public.athlete_links (b);

-- Igual que el resto: solo el servidor (service role) accede.
alter table public.link_invites  enable row level security;
alter table public.athlete_links enable row level security;
