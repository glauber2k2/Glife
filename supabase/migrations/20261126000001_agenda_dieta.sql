-- Agenda (eventos e lembretes avulsos) e dieta (plano alimentar e registro das refeições).
-- Datas de calendário em `date`; horas de parede em texto 'HH:MM' (o tipo `time` voltaria como 'HH:MM:SS' no sync).
-- Datas puladas de uma série: texto com uma lista JSON de datas (o app lê e valida).
-- O agendamento das notificações é do aparelho (nunca sincroniza: cada aparelho agenda os seus avisos).

create table public.events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  title text not null check (char_length(title) between 1 and 200),
  location text check (char_length(location) <= 200),
  notes text not null default '' check (char_length(notes) <= 2000),
  start_date date not null,
  start_time text check (start_time ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'),
  end_date date not null,
  end_time text check (end_time ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'),
  frequency text not null default 'none' check (frequency in ('none', 'daily', 'weekly', 'monthly', 'yearly')),
  interval_count integer not null default 1 check (interval_count between 1 and 99),
  weekdays integer not null default 0 check (weekdays between 0 and 127),
  until date,
  skipped_dates text not null default '[]' check (char_length(skipped_dates) <= 8000),
  remind_before integer check (remind_before between 0 and 10080),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  check (start_time is not null or end_time is null),
  check (end_date > start_date or (end_date = start_date and coalesce(end_time, start_time, '') >= coalesce(start_time, ''))),
  check (until is null or until >= start_date)
);
select public.vida_apply_standard('public.events');
create index on public.events (user_id, start_date);

create table public.reminders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  title text not null check (char_length(title) between 1 and 200),
  notes text not null default '' check (char_length(notes) <= 1000),
  start_date date not null,
  time text not null check (time ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'),
  frequency text not null default 'none' check (frequency in ('none', 'daily', 'weekly', 'monthly', 'yearly')),
  interval_count integer not null default 1 check (interval_count between 1 and 99),
  weekdays integer not null default 0 check (weekdays between 0 and 127),
  until date,
  skipped_dates text not null default '[]' check (char_length(skipped_dates) <= 8000),
  done_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  check (until is null or until >= start_date),
  check (frequency = 'none' or done_at is null)
);
select public.vida_apply_standard('public.reminders');

create table public.meal_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  name text not null check (char_length(name) between 1 and 80),
  time text not null check (time ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'),
  description text not null default '' check (char_length(description) <= 500),
  weekdays integer not null default 127 check (weekdays between 1 and 127),
  remind boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
select public.vida_apply_standard('public.meal_plans');

create table public.meals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  date date not null,
  time text not null check (time ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'),
  description text not null default '' check (char_length(description) <= 500),
  plan_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  foreign key (plan_id, user_id) references public.meal_plans (id, user_id) on delete set null (plan_id)
);
select public.vida_apply_standard('public.meals');
create index on public.meals (user_id, date);

alter publication powersync add table public.events, public.reminders, public.meal_plans, public.meals;
