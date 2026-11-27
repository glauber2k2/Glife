-- Planos de leitura: o app guarda listas como texto JSON (como skipped_dates da agenda) e as envia assim pelo
-- PostgREST; colunas text[]/integer[]/jsonb recusariam o envio (22P02/23514) e o plano sumiria do aparelho.
-- Grupos, dias da semana e pausas passam a ser text com JSON validado. Migração nova: a anterior não é editada.

alter table public.bible_plans drop constraint bible_plans_weekdays_distinct;
alter table public.bible_plans drop constraint bible_plans_groups_check;
alter table public.bible_plans drop constraint bible_plans_weekdays_check;
alter table public.bible_plans drop constraint bible_plans_pauses_check;
drop function public.bible_weekdays_distinct(integer[]);

alter table public.bible_plans
  alter column groups type text using to_jsonb(groups)::text,
  alter column weekdays type text using to_jsonb(weekdays)::text,
  alter column pauses drop default,
  alter column pauses type text using pauses::text,
  alter column pauses set default '[]';

-- Lista JSON sem repetição, com tamanho entre min e max e só com valores de `allowed`. Texto que não é JSON falha
-- no cast (22P02), o que também recusa a linha.
create function public.bible_json_set_ok(v text, allowed jsonb, min_len integer, max_len integer) returns boolean
  language sql immutable set search_path = ''
  as $$
    select jsonb_typeof(j) = 'array'
      and jsonb_array_length(j) between min_len and max_len
      and j operator(pg_catalog.<@) allowed
      and jsonb_array_length(j) = (select count(distinct e) from pg_catalog.jsonb_array_elements(j) as e)
    from (select v::jsonb as j) as s
  $$;
-- o check roda com os privilégios de quem grava: authenticated precisa executar
revoke execute on function public.bible_json_set_ok(text, jsonb, integer, integer) from public, anon;

alter table public.bible_plans
  add constraint bible_plans_groups_check check (
    char_length(groups) <= 200
    and public.bible_json_set_ok(groups, '["pent","hist","poet","prof","evan","atos","paulo","gerais","apoc"]'::jsonb, 1, 9)
  ),
  add constraint bible_plans_weekdays_check check (char_length(weekdays) <= 40 and public.bible_json_set_ok(weekdays, '[0,1,2,3,4,5,6]'::jsonb, 1, 7)),
  add constraint bible_plans_pauses_check check (char_length(pauses) <= 8000 and jsonb_typeof(pauses::jsonb) = 'array');
