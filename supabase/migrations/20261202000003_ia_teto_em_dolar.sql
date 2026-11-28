-- Glife IA: teto e uso em dólar (micro-dólares, US$ 1 = 1.000.000), a mesma moeda da recarga na DeepSeek — sem
-- cotação. Teto padrão US$ 2,00 por mês. Substitui as colunas em centavos e as funções das migrações anteriores
-- (que nunca foram aplicadas fora do desenvolvimento).

drop function public.ai_reserve_budget(uuid, integer);
drop function public.ai_settle_usage(uuid, uuid, bigint, integer, integer, integer, integer);
drop function public.ai_record_usage(uuid, bigint, integer, integer, integer, integer);
drop function public.ai_budget_status(uuid);

alter table public.ai_settings drop column cap_cents;
alter table public.ai_settings add column cap_micro_usd bigint not null default 2000000 check (cap_micro_usd between 0 and 100000000);
alter table public.ai_usage drop column cost_cents;

-- Teto e gasto do mês corrente (fuso de São Paulo). Sem configuração: US$ 2,00.
create or replace function public.ai_budget_status(p_user uuid)
returns table (cap_micro_usd bigint, spent_micro_usd bigint)
language sql
stable
security definer
set search_path = ''
as $$
  select
    coalesce((select s.cap_micro_usd from public.ai_settings s where s.user_id = p_user and s.deleted_at is null), 2000000)::bigint,
    coalesce((
      select sum(u.cost_micro_usd) from public.ai_usage u
      where u.user_id = p_user
        and u.deleted_at is null
        and (u.created_at at time zone 'America/Sao_Paulo') >= date_trunc('month', now() at time zone 'America/Sao_Paulo')
    ), 0)::bigint;
$$;

-- Reserva atômica (trava por usuário): pedidos em paralelo não furam o teto.
create or replace function public.ai_reserve_budget(p_user uuid, p_micro_usd bigint)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_cap bigint;
  v_spent bigint;
  v_id uuid;
begin
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext('ai_budget:' || p_user::text));
  select s.cap_micro_usd, s.spent_micro_usd into v_cap, v_spent from public.ai_budget_status(p_user) s;
  if v_spent >= v_cap then
    return null;
  end if;
  insert into public.ai_usage (user_id, cost_micro_usd, cache_hit_tokens, cache_miss_tokens, output_tokens)
  values (p_user, greatest(p_micro_usd, 0), 0, 0, 0)
  returning id into v_id;
  return v_id;
end;
$$;

create or replace function public.ai_settle_usage(p_id uuid, p_user uuid, p_micro_usd bigint, p_hit integer, p_miss integer, p_out integer)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.ai_usage
  set cost_micro_usd = p_micro_usd, cache_hit_tokens = p_hit, cache_miss_tokens = p_miss, output_tokens = p_out
  where id = p_id and user_id = p_user;
$$;

revoke execute on function public.ai_budget_status(uuid) from public, anon, authenticated;
revoke execute on function public.ai_reserve_budget(uuid, bigint) from public, anon, authenticated;
revoke execute on function public.ai_settle_usage(uuid, uuid, bigint, integer, integer, integer) from public, anon, authenticated;
grant execute on function public.ai_budget_status(uuid) to service_role;
grant execute on function public.ai_reserve_budget(uuid, bigint) to service_role;
grant execute on function public.ai_settle_usage(uuid, uuid, bigint, integer, integer, integer) to service_role;
