-- Glife IA: teto atômico. Antes de chamar o modelo, a Edge Function reserva uma estimativa do custo numa transação
-- com trava por usuário (pedidos em paralelo não furam o teto); no fim, acerta a reserva com o custo real. Se o
-- pedido cair antes de saber o custo, a estimativa fica (lado seguro). Só service_role chama.

create or replace function public.ai_reserve_budget(p_user uuid, p_cents integer)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_cap integer;
  v_spent integer;
  v_id uuid;
begin
  -- Trava por usuário até o fim da transação: duas reservas do mesmo usuário nunca leem o gasto ao mesmo tempo.
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext('ai_budget:' || p_user::text));
  select s.cap_cents, s.spent_cents into v_cap, v_spent from public.ai_budget_status(p_user) s;
  if v_spent >= v_cap then
    return null;
  end if;
  insert into public.ai_usage (user_id, cost_micro_usd, cost_cents, cache_hit_tokens, cache_miss_tokens, output_tokens)
  values (p_user, 0, greatest(p_cents, 0), 0, 0, 0)
  returning id into v_id;
  return v_id;
end;
$$;

create or replace function public.ai_settle_usage(p_id uuid, p_user uuid, p_micro_usd bigint, p_cents integer, p_hit integer, p_miss integer, p_out integer)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.ai_usage
  set cost_micro_usd = p_micro_usd, cost_cents = p_cents, cache_hit_tokens = p_hit, cache_miss_tokens = p_miss, output_tokens = p_out
  where id = p_id and user_id = p_user;
$$;

revoke execute on function public.ai_reserve_budget(uuid, integer) from public, anon, authenticated;
revoke execute on function public.ai_settle_usage(uuid, uuid, bigint, integer, integer, integer, integer) from public, anon, authenticated;
grant execute on function public.ai_reserve_budget(uuid, integer) to service_role;
grant execute on function public.ai_settle_usage(uuid, uuid, bigint, integer, integer, integer, integer) to service_role;
