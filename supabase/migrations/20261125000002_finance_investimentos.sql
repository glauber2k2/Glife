-- finance: investimentos (ativos e movimentos) + cache de cotações do servidor.
-- Dinheiro em centavos; quantidade em unidades × 10^8; preço em R$ × 10^8 (cripto barata vale frações de centavo).
-- Regras que cruzam tabelas (quantidade obrigatória em ativo automático, conta que não é cartão, cotas não negativas)
-- ficam no domain: um trigger recusaria uploads feitos offline pelo PowerSync.

create table public.investment_assets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  name text not null check (char_length(name) between 1 and 120),
  kind text not null check (kind in ('fixed_income', 'treasury', 'stocks', 'reits', 'funds', 'savings', 'crypto', 'other')),
  institution text not null default '' check (char_length(institution) <= 80),
  notes text not null default '' check (char_length(notes) <= 500),
  quote_symbol text check (char_length(quote_symbol) between 1 and 64),
  last_price_e8 bigint check (last_price_e8 >= 0),
  last_price_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  check ((kind in ('stocks', 'reits', 'crypto')) = (quote_symbol is not null)),
  check ((last_price_e8 is null) = (last_price_at is null)),
  check (kind in ('stocks', 'reits', 'crypto') or last_price_e8 is null)
);
select public.vida_apply_standard('public.investment_assets');

create table public.investment_movements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  asset_id uuid not null,
  kind text not null check (kind in ('contribution', 'withdrawal', 'income', 'quote')),
  amount_cents bigint not null,
  quantity bigint check (quantity > 0),
  date date not null,
  account_id uuid,
  notes text not null default '' check (char_length(notes) <= 200),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  check (case when kind = 'income' then amount_cents <> 0 else amount_cents > 0 end),
  check (kind in ('contribution', 'withdrawal') or (account_id is null and quantity is null)),
  foreign key (asset_id, user_id) references public.investment_assets (id, user_id) on delete cascade,
  foreign key (account_id, user_id) references public.accounts (id, user_id) on delete set null (account_id)
);
select public.vida_apply_standard('public.investment_movements');
create index on public.investment_movements (user_id, asset_id);

alter publication powersync add table public.investment_assets, public.investment_movements;

-- ---------- Cache de cotações (só o servidor) ----------
-- Fora do schema public: não aparece na API nem no sync. A Edge Function `quotes` (service_role) lê e grava pelas
-- duas funções abaixo; uma futura rotina de alerta de preço reaproveita a mesma tabela.

create schema if not exists private;
revoke all on schema private from public;

create table private.market_quotes (
  source text not null check (source in ('brapi', 'coingecko')),
  symbol text not null check (char_length(symbol) between 1 and 64),
  price_e8 bigint not null check (price_e8 >= 0),
  name text not null default '' check (char_length(name) <= 200),
  quoted_at timestamptz not null,
  fetched_at timestamptz not null default now(),
  primary key (source, symbol)
);
alter table private.market_quotes enable row level security;
revoke all on private.market_quotes from public;

-- keys: [{ "source": "...", "symbol": "..." }]
create function public.market_quotes_get(keys jsonb)
returns table (source text, symbol text, price_e8 bigint, name text, quoted_at timestamptz, fetched_at timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select q.source, q.symbol, q.price_e8, q.name, q.quoted_at, q.fetched_at
  from private.market_quotes q
  join pg_catalog.jsonb_to_recordset(keys) as k (source text, symbol text)
    on k.source = q.source and k.symbol = q.symbol
$$;

-- quotes: [{ "source", "symbol", "price_e8", "name", "quoted_at" }]
create function public.market_quotes_put(quotes jsonb)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into private.market_quotes (source, symbol, price_e8, name, quoted_at, fetched_at)
  select k.source, k.symbol, k.price_e8, pg_catalog.left(coalesce(k.name, ''), 200), k.quoted_at, pg_catalog.now()
  from pg_catalog.jsonb_to_recordset(quotes) as k (source text, symbol text, price_e8 bigint, name text, quoted_at timestamptz)
  on conflict (source, symbol) do update
    set price_e8 = excluded.price_e8, name = excluded.name, quoted_at = excluded.quoted_at, fetched_at = excluded.fetched_at
$$;

revoke execute on function public.market_quotes_get(jsonb) from public, anon, authenticated;
revoke execute on function public.market_quotes_put(jsonb) from public, anon, authenticated;
grant execute on function public.market_quotes_get(jsonb) to service_role;
grant execute on function public.market_quotes_put(jsonb) to service_role;
