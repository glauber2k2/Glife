---
name: migracao-supabase
description: Qualquer mudança no banco do Vida (tabela, coluna, índice). Gera migração versionada com RLS e deleted_at e atualiza o PowerSync.
---

# Migração Supabase

1. Crie `supabase/migrations/<AAAAMMDDHHMMSS>_<feature>_<descricao>.sql` (nunca edite migração já aplicada).
2. Toda tabela nova:
   ```sql
   create table public.<t> (
     id uuid primary key default gen_random_uuid(),
     user_id uuid not null default auth.uid() references auth.users on delete cascade,
     ...,
     created_at timestamptz not null default now(),
     updated_at timestamptz not null default now(),
     deleted_at timestamptz
   );
   select public.vida_apply_standard('public.<t>');   -- trigger, RLS, 4 políticas, MFA (aal2), unique (id, user_id), índice
   alter publication powersync add table public.<t>;
   ```
   Dinheiro: `bigint` em centavos (`amount_cents`). Datas de calendário: `date`; instantes: `timestamptz`.
   **Referência a outra tabela do usuário = FK composta** (nunca `references public.x` simples):
   ```sql
   x_id uuid,
   foreign key (x_id, user_id) references public.x (id, user_id) on delete set null (x_id)  -- ou cascade
   ```
   Função nova: `set search_path = ''`, nomes qualificados (`pg_catalog.now()`), e `revoke execute` se não for API.
3. Adicione `- select * from <t> where user_id = bucket.user_id` em `supabase/powersync/sync-rules.yaml`.
4. Atualize o schema local do PowerSync em `apps/app/src/shared/lib/powersync/schema.ts` (ou no `data/` da feature).
5. Valide: `pnpm test` roda `supabase/tests/rls.test.ts` (Postgres real via PGlite) — o teste genérico cobre toda tabela
   nova; adicione casos de "A não aponta para linha de B" para cada FK nova. No projeto hospedado, rode também
   `supabase/tests/rls_check.sql` (deve retornar zero linhas).
6. Antes de aplicar em produção: backup (`pg_dump`). Aplicar com `npx supabase db push`.
