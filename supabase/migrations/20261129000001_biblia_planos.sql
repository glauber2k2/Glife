-- Bíblia: planos de leitura. O plano guarda só a regra (grupos de livros, duração em dias de leitura, dias da semana,
-- início, lembrete, pausas); o cronograma de cada dia é calculado no app (packages/domain/src/bible/plans.ts).
-- Cada capítulo lido vira uma linha em bible_plan_reads. Sem unique: dois aparelhos offline podem marcar o mesmo
-- capítulo; o app conta uma vez e, ao desmarcar, apaga todas as cópias.

create table public.bible_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  name text not null check (char_length(name) between 1 and 60),
  groups text[] not null check (
    cardinality(groups) between 1 and 9
    and groups <@ array['pent', 'hist', 'poet', 'prof', 'evan', 'atos', 'paulo', 'gerais', 'apoc']::text[]
  ),
  days integer not null check (days between 1 and 730),
  weekdays integer[] not null check (cardinality(weekdays) between 1 and 7 and weekdays <@ array[0, 1, 2, 3, 4, 5, 6]),
  start_date date not null,
  reminder_time text check (reminder_time ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'),
  color_hue integer not null default 350 check (color_hue between 0 and 359),
  -- períodos de pausa: [{"from":"2026-11-29","to":"2026-12-01"}]; "to" nulo = pausado agora
  pauses jsonb not null default '[]'::jsonb check (jsonb_typeof(pauses) = 'array'),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
select public.vida_apply_standard('public.bible_plans');

-- dias da semana sem repetição (check não aceita subconsulta; função imutável resolve)
create function public.bible_weekdays_distinct(d integer[]) returns boolean
  language sql immutable set search_path = ''
  as $$ select cardinality(d) = (select count(distinct x) from unnest(d) as x) $$;
revoke execute on function public.bible_weekdays_distinct(integer[]) from public, anon;
alter table public.bible_plans add constraint bible_plans_weekdays_distinct check (public.bible_weekdays_distinct(weekdays));

create table public.bible_plan_reads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  plan_id uuid not null,
  ref text not null check (ref ~ '^[1-3]?[A-Z]{2,3}\.[0-9]{1,3}$'),
  read_on date not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  foreign key (plan_id, user_id) references public.bible_plans (id, user_id) on delete cascade
);
select public.vida_apply_standard('public.bible_plan_reads');
create index on public.bible_plan_reads (user_id, plan_id);

alter publication powersync add table public.bible_plans, public.bible_plan_reads;
