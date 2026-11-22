-- core: funções compartilhadas por todas as features.
-- Convenção: toda tabela tem id uuid, user_id, created_at, updated_at, deleted_at e RLS.

-- Funções usam search_path vazio e nomes qualificados (evita sequestro de search_path).
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = pg_catalog.now();
  return new;
end;
$$;

-- Aplica o padrão do Vida a uma tabela:
--   * trigger de updated_at;
--   * RLS forçado + 4 políticas por dono (o UPDATE checa antes e depois: ninguém troca o user_id);
--   * política RESTRITIVA exigindo MFA (aal2): sessão só com senha não lê nem grava nada;
--   * unique (id, user_id): alvo das FKs compostas, que impedem apontar para linha de outro usuário.
create or replace function public.vida_apply_standard(tbl regclass)
returns void
language plpgsql
set search_path = ''
as $$
declare
  t text := tbl::text;
  rel text := (select c.relname from pg_catalog.pg_class c where c.oid = tbl);
begin
  execute format('create trigger set_updated_at before update on %s for each row execute function public.set_updated_at()', t);
  execute format('alter table %s enable row level security', t);
  execute format('alter table %s force row level security', t);
  execute format('create policy "dono le" on %s for select to authenticated using (user_id = (select auth.uid()))', t);
  execute format('create policy "dono cria" on %s for insert to authenticated with check (user_id = (select auth.uid()))', t);
  execute format('create policy "dono altera" on %s for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()))', t);
  execute format('create policy "dono apaga" on %s for delete to authenticated using (user_id = (select auth.uid()))', t);
  execute format('create policy "exige mfa" on %s as restrictive for all to authenticated using ((select auth.jwt() ->> %L) = %L) with check ((select auth.jwt() ->> %L) = %L)', t, 'aal', 'aal2', 'aal', 'aal2');
  execute format('alter table %s add constraint %I unique (id, user_id)', t, rel || '_id_user_key');
  execute format('create index on %s (user_id, updated_at)', t);
end;
$$;

-- Função de migração, não de API: o PostgREST não pode expô-la.
revoke execute on function public.vida_apply_standard(regclass) from public, anon, authenticated;

-- Publicação lida pelo PowerSync (replicação lógica). Cada migração adiciona suas tabelas.
do $$
begin
  if not exists (select 1 from pg_publication where pubname = 'powersync') then
    create publication powersync;
  end if;
end;
$$;
