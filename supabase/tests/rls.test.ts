import type { PGlite } from '@electric-sql/pglite';
import { beforeAll, describe, expect, it } from 'vitest';

import { USER_A, USER_B, asUser, createDatabase } from './harness';

const FOLDER_A = '10000000-0000-4000-8000-00000000000a';
const FOLDER_B = '10000000-0000-4000-8000-00000000000b';
const TAG_B = '20000000-0000-4000-8000-00000000000b';
const NOTE_A = '30000000-0000-4000-8000-00000000000a';

let db: PGlite;

beforeAll(async () => {
  db = await createDatabase();
  // Dados semeados como superusuário (ignora RLS), cada linha com seu dono.
  await db.query(
    `insert into public.note_folders (id, user_id, name) values ($1, $2, 'Pasta A'), ($3, $4, 'Pasta B')`,
    [FOLDER_A, USER_A, FOLDER_B, USER_B],
  );
  await db.query(`insert into public.tags (id, user_id, name) values ($1, $2, 'tag de B')`, [TAG_B, USER_B]);
  await db.query(`insert into public.notes (id, user_id, title) values ($1, $2, 'Nota de A')`, [NOTE_A, USER_A]);
}, 60_000);

const count = async (tx: { query: PGlite['query'] }, sql: string) =>
  Number(((await tx.query<{ n: number }>(sql)).rows[0] as { n: number }).n);

describe('isolamento entre usuários', () => {
  it('B não enxerga as notas de A', async () => {
    const n = await asUser(db, USER_B, (tx) => count(tx, 'select count(*)::int as n from public.notes'));
    expect(n).toBe(0);
  });

  it('A enxerga as próprias notas', async () => {
    const n = await asUser(db, USER_A, (tx) => count(tx, 'select count(*)::int as n from public.notes'));
    expect(n).toBe(1);
  });

  it('A não consegue transferir uma nota para B trocando user_id', async () => {
    await expect(
      asUser(db, USER_A, (tx) => tx.query('update public.notes set user_id = $1 where id = $2', [USER_B, NOTE_A])),
    ).rejects.toThrow(/row-level security/);
  });

  it('A não consegue guardar nota na pasta de B', async () => {
    await expect(
      asUser(db, USER_A, (tx) =>
        tx.query(`insert into public.notes (user_id, title, folder_id) values ($1, 'x', $2)`, [USER_A, FOLDER_B]),
      ),
    ).rejects.toThrow(/foreign key/);
  });

  it('A não consegue criar subpasta dentro da pasta de B', async () => {
    await expect(
      asUser(db, USER_A, (tx) =>
        tx.query(`insert into public.note_folders (user_id, name, parent_id) values ($1, 'x', $2)`, [USER_A, FOLDER_B]),
      ),
    ).rejects.toThrow(/foreign key/);
  });

  it('A não consegue usar a tag de B', async () => {
    await expect(
      asUser(db, USER_A, (tx) =>
        tx.query(
          `insert into public.entity_tags (user_id, tag_id, entity_type, entity_id) values ($1, $2, 'note', $3)`,
          [USER_A, TAG_B, NOTE_A],
        ),
      ),
    ).rejects.toThrow(/foreign key/);
  });

  it('A consegue guardar nota na própria pasta', async () => {
    const n = await asUser(db, USER_A, async (tx) => {
      await tx.query(`insert into public.notes (user_id, title, folder_id) values ($1, 'ok', $2)`, [USER_A, FOLDER_A]);
      return count(tx, 'select count(*)::int as n from public.notes');
    });
    expect(n).toBe(2);
  });
});

describe('MFA obrigatório (aal2)', () => {
  it('sessão só com senha (aal1) não lê nada', async () => {
    const n = await asUser(db, USER_A, (tx) => count(tx, 'select count(*)::int as n from public.notes'), 'aal1');
    expect(n).toBe(0);
  });

  it('sessão só com senha (aal1) não grava nada', async () => {
    await expect(
      asUser(db, USER_A, (tx) => tx.query(`insert into public.notes (user_id, title) values ($1, 'x')`, [USER_A]), 'aal1'),
    ).rejects.toThrow(/row-level security/);
  });
});

describe('padrão aplicado a toda tabela pública', () => {
  it('toda tabela tem RLS forçado, as 4 políticas de dono e a política restritiva de MFA', async () => {
    const { rows } = await db.query<{ tabela: string; problema: string }>(`
      select c.relname as tabela,
             case
               when not c.relrowsecurity or not c.relforcerowsecurity then 'sem RLS forçado'
               when (select count(*) from pg_policies p where p.schemaname = 'public' and p.tablename = c.relname
                       and p.permissive = 'PERMISSIVE') <> 4 then 'políticas de dono incompletas'
               when not exists (select 1 from pg_policies p where p.schemaname = 'public' and p.tablename = c.relname
                       and p.permissive = 'RESTRICTIVE' and p.cmd = 'ALL') then 'sem política restritiva de MFA'
             end as problema
      from pg_class c join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public' and c.relkind = 'r'`);
    expect(rows.filter((r) => r.problema !== null)).toEqual([]);
  });
});

describe('funções', () => {
  it('toda função do schema public tem search_path fixo', async () => {
    const { rows } = await db.query<{ proname: string }>(`
      select p.proname from pg_proc p join pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'public'
        and not exists (select 1 from unnest(coalesce(p.proconfig, '{}')) c where c like 'search_path=%')`);
    expect(rows.map((r) => r.proname)).toEqual([]);
  });

  it('vida_apply_standard não pode ser chamada pela API (anon/authenticated)', async () => {
    const { rows } = await db.query<{ papel: string; pode: boolean }>(`
      select papel, has_function_privilege(papel, 'public.vida_apply_standard(regclass)', 'execute') as pode
      from unnest(array['anon', 'authenticated']) papel`);
    expect(rows.filter((r) => r.pode)).toEqual([]);
  });
});
