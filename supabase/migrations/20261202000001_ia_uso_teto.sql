-- Glife IA: teto mensal de gasto e uso medido por chamada. O app nunca grava uso: só a Edge Function `ai-agent`
-- (service_role) chama as funções abaixo, então apagar linhas não "devolve" teto. Fora do sync nesta etapa.

create table public.ai_settings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  cap_cents integer not null default 2000 check (cap_cents between 0 and 100000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (user_id)
);
select public.vida_apply_standard('public.ai_settings');

create table public.ai_usage (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  cost_micro_usd bigint not null check (cost_micro_usd >= 0),
  cost_cents integer not null check (cost_cents >= 0),
  cache_hit_tokens integer not null check (cache_hit_tokens >= 0),
  cache_miss_tokens integer not null check (cache_miss_tokens >= 0),
  output_tokens integer not null check (output_tokens >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
select public.vida_apply_standard('public.ai_usage');
create index on public.ai_usage (user_id, created_at);

-- O dono só lê o próprio uso.
revoke insert, update, delete on public.ai_usage from anon, authenticated;
grant all on public.ai_settings, public.ai_usage to service_role;

-- Teto e gasto do mês corrente (fuso de São Paulo). Sem configuração: R$ 20,00.
create or replace function public.ai_budget_status(p_user uuid)
returns table (cap_cents integer, spent_cents integer)
language sql
stable
security definer
set search_path = ''
as $$
  select
    coalesce((select s.cap_cents from public.ai_settings s where s.user_id = p_user and s.deleted_at is null), 2000),
    coalesce((
      select sum(u.cost_cents)::integer from public.ai_usage u
      where u.user_id = p_user
        and u.deleted_at is null
        and (u.created_at at time zone 'America/Sao_Paulo') >= date_trunc('month', now() at time zone 'America/Sao_Paulo')
    ), 0);
$$;

create or replace function public.ai_record_usage(p_user uuid, p_micro_usd bigint, p_cents integer, p_hit integer, p_miss integer, p_out integer)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.ai_usage (user_id, cost_micro_usd, cost_cents, cache_hit_tokens, cache_miss_tokens, output_tokens)
  values (p_user, p_micro_usd, p_cents, p_hit, p_miss, p_out);
$$;

revoke execute on function public.ai_budget_status(uuid) from public, anon, authenticated;
revoke execute on function public.ai_record_usage(uuid, bigint, integer, integer, integer, integer) from public, anon, authenticated;
grant execute on function public.ai_budget_status(uuid) to service_role;
grant execute on function public.ai_record_usage(uuid, bigint, integer, integer, integer, integer) to service_role;
