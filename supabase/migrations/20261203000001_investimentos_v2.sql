-- Investimentos v2 (autorizada pelo usuário em 27/11/2026).
-- 1) Metas de alocação por grupo: uma linha viva por usuário (mesmo padrão de diet_goals), soma = 100.
-- 2) Histórico diário de preços e listas de mercado: só no servidor (schema private), lidos e gravados pela
--    Edge Function `quotes` com service_role, por funções que usuários logados não executam.

create table public.investment_targets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  fixed_income smallint not null default 0 check (fixed_income between 0 and 100),
  stocks smallint not null default 0 check (stocks between 0 and 100),
  reits smallint not null default 0 check (reits between 0 and 100),
  funds smallint not null default 0 check (funds between 0 and 100),
  crypto smallint not null default 0 check (crypto between 0 and 100),
  other smallint not null default 0 check (other between 0 and 100),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  check (fixed_income + stocks + reits + funds + crypto + other = 100)
);
select public.vida_apply_standard('public.investment_targets');
create unique index investment_targets_user_unique on public.investment_targets (user_id) where deleted_at is null;

alter publication powersync add table public.investment_targets;

create table private.market_prices_daily (
  source text not null check (source in ('brapi', 'coingecko')),
  symbol text not null check (char_length(symbol) between 1 and 64),
  date date not null,
  close_e8 bigint not null check (close_e8 > 0),
  primary key (source, symbol, date)
);
alter table private.market_prices_daily enable row level security;
revoke all on private.market_prices_daily from public;

create table private.market_history_fetch (
  source text not null check (source in ('brapi', 'coingecko')),
  symbol text not null check (char_length(symbol) between 1 and 64),
  fetched_on date not null,
  primary key (source, symbol)
);
alter table private.market_history_fetch enable row level security;
revoke all on private.market_history_fetch from public;

create table private.market_lists (
  list text primary key check (list in ('brapi', 'coingecko')),
  payload jsonb not null,
  fetched_at timestamptz not null default now()
);
alter table private.market_lists enable row level security;
revoke all on private.market_lists from public;

-- key: { "source", "symbol" }
create function public.market_prices_get(key jsonb)
returns table (date date, close_e8 bigint)
language sql
stable
security definer
set search_path = ''
as $$
  select p.date, p.close_e8
  from private.market_prices_daily p
  where p.source = key ->> 'source' and p.symbol = key ->> 'symbol'
  order by p.date
$$;

-- points: [{ "date": "YYYY-MM-DD", "close_e8" }]; a mesma data é substituída
create function public.market_prices_put(key jsonb, points jsonb)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into private.market_prices_daily (source, symbol, date, close_e8)
  select key ->> 'source', key ->> 'symbol', k.date, k.close_e8
  from pg_catalog.jsonb_to_recordset(points) as k (date date, close_e8 bigint)
  on conflict (source, symbol, date) do update set close_e8 = excluded.close_e8
$$;

create function public.market_history_fetched(key jsonb, today date)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from private.market_history_fetch f
    where f.source = key ->> 'source' and f.symbol = key ->> 'symbol' and f.fetched_on = today
  )
$$;

create function public.market_history_mark(key jsonb, today date)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into private.market_history_fetch (source, symbol, fetched_on)
  values (key ->> 'source', key ->> 'symbol', today)
  on conflict (source, symbol) do update set fetched_on = excluded.fetched_on
$$;

create function public.market_lists_get(list text)
returns table (payload jsonb, fetched_at timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select l.payload, l.fetched_at from private.market_lists l where l.list = market_lists_get.list
$$;

create function public.market_lists_put(list text, payload jsonb)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into private.market_lists (list, payload, fetched_at)
  values (market_lists_put.list, market_lists_put.payload, pg_catalog.now())
  on conflict on constraint market_lists_pkey do update set payload = excluded.payload, fetched_at = excluded.fetched_at
$$;

revoke execute on function public.market_prices_get(jsonb) from public, anon, authenticated;
revoke execute on function public.market_prices_put(jsonb, jsonb) from public, anon, authenticated;
revoke execute on function public.market_history_fetched(jsonb, date) from public, anon, authenticated;
revoke execute on function public.market_history_mark(jsonb, date) from public, anon, authenticated;
revoke execute on function public.market_lists_get(text) from public, anon, authenticated;
revoke execute on function public.market_lists_put(text, jsonb) from public, anon, authenticated;
grant execute on function public.market_prices_get(jsonb) to service_role;
grant execute on function public.market_prices_put(jsonb, jsonb) to service_role;
grant execute on function public.market_history_fetched(jsonb, date) to service_role;
grant execute on function public.market_history_mark(jsonb, date) to service_role;
grant execute on function public.market_lists_get(text) to service_role;
grant execute on function public.market_lists_put(text, jsonb) to service_role;
