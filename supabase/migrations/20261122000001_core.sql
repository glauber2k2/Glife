-- core: funções compartilhadas por todas as features.
-- Convenção: toda tabela tem id uuid, user_id, created_at, updated_at, deleted_at e RLS.

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Aplica o padrão do Vida a uma tabela: trigger de updated_at, RLS e políticas por dono.
create or replace function public.vida_apply_standard(tbl regclass)
returns void
language plpgsql
as $$
declare
  t text := tbl::text;
begin
  execute format('create trigger set_updated_at before update on %s for each row execute function public.set_updated_at()', t);
  execute format('alter table %s enable row level security', t);
  execute format('alter table %s force row level security', t);
  execute format('create policy "dono le" on %s for select to authenticated using (user_id = (select auth.uid()))', t);
  execute format('create policy "dono cria" on %s for insert to authenticated with check (user_id = (select auth.uid()))', t);
  execute format('create policy "dono altera" on %s for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()))', t);
  execute format('create policy "dono apaga" on %s for delete to authenticated using (user_id = (select auth.uid()))', t);
  execute format('create index on %s (user_id, updated_at)', t);
end;
$$;

-- Publicação lida pelo PowerSync (replicação lógica). Cada migração adiciona suas tabelas.
do $$
begin
  if not exists (select 1 from pg_publication where pubname = 'powersync') then
    create publication powersync;
  end if;
end;
$$;
