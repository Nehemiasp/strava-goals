-- Strava Goals · Caminar como tercer deporte
-- Ejecutar en el SQL editor de Supabase ANTES de desplegar la versión con Caminar. Es idempotente.

-- 1) Goals: de un deporte único (`sport`) a un conjunto de deportes (`sports`).
alter table public.goals add column if not exists sports text[];

update public.goals
   set sports = case sport
                  when 'run'  then array['run']
                  when 'ride' then array['ride']
                  else             array['run','ride']   -- 'both' conserva su significado: correr + bici
                end
 where sports is null;

alter table public.goals alter column sports set not null;

alter table public.goals drop constraint if exists goals_sports_valid;
alter table public.goals add constraint goals_sports_valid
  check (cardinality(sports) between 1 and 3 and sports <@ array['run','ride','walk']);

-- La columna antigua deja de usarse; se conserva (nullable) por si hay que revertir.
alter table public.goals alter column sport drop not null;
alter table public.goals drop constraint if exists goals_sport_check;

-- 2) Caché de actividades: admitir 'walk'.
alter table public.activity_cache drop constraint if exists activity_cache_sport_check;
alter table public.activity_cache add constraint activity_cache_sport_check
  check (sport in ('run','ride','walk'));

-- 3) Forzar una resincronización completa (400 días) para traer las caminatas ya existentes.
--    Hasta hoy se descartaban al sincronizar y la resincronización normal solo mira 35 días.
update public.athletes set synced_at = null;
