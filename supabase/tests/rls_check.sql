-- Rode com: npx supabase db query --file supabase/tests/rls_check.sql (ou no SQL editor)
-- Deve retornar ZERO linhas: tabelas públicas sem RLS, sem política ou sem deleted_at.
select c.relname as tabela,
       c.relrowsecurity as rls_ligado,
       (select count(*) from pg_policies p where p.schemaname = 'public' and p.tablename = c.relname) as politicas,
       exists (select 1 from information_schema.columns col
               where col.table_schema = 'public' and col.table_name = c.relname and col.column_name = 'deleted_at') as tem_deleted_at
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relkind = 'r'
  and (not c.relrowsecurity
       or (select count(*) from pg_policies p where p.schemaname = 'public' and p.tablename = c.relname) = 0
       or not exists (select 1 from information_schema.columns col
                      where col.table_schema = 'public' and col.table_name = c.relname and col.column_name = 'deleted_at'));
