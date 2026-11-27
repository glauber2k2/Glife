import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import type { PGlite } from '@electric-sql/pglite';
import { beforeAll, describe, expect, it } from 'vitest';

import { MIGRATIONS_DIR, USER_A, USER_B, createDatabase } from './harness';

const MIGRATION = '20261130000001_notas_sem_tipo.sql';
const N = (i: number) => `00000000-0000-4000-8000-0000000001${String(i).padStart(2, '0')}`;

let db: PGlite;

beforeAll(async () => {
  db = await createDatabase({ before: MIGRATION });
  // A já tem a tag "Devocional" (outra grafia) e uma nota de cada tipo; B tem um diário na lixeira.
  await db.query(`insert into public.tags (user_id, name) values ($1, 'Devocional')`, [USER_A]);
  await db.query(
    `insert into public.notes (id, user_id, title, kind, deleted_at) values
      ($1, $4, 'Culto', 'devotional', null), ($2, $4, 'Hoje', 'journal', null), ($3, $4, 'Mercado', 'note', null),
      ($5, $6, 'Ontem', 'journal', now())`,
    [N(1), N(2), N(3), USER_A, N(4), USER_B],
  );
  await db.exec(readFileSync(join(MIGRATIONS_DIR, MIGRATION), 'utf8'));
}, 60_000);

const tagsOf = async (id: string) =>
  (
    await db.query<{ name: string }>(
      `select t.name from public.entity_tags e join public.tags t on t.id = e.tag_id
       where e.entity_type = 'note' and e.entity_id = $1 and e.deleted_at is null order by t.name`,
      [id],
    )
  ).rows.map((r) => r.name);

describe('notas sem tipo', () => {
  it('a coluna kind sai da tabela', async () => {
    const r = await db.query(`select 1 from information_schema.columns where table_name = 'notes' and column_name = 'kind'`);
    expect(r.rows).toHaveLength(0);
  });

  it('devocional e diário viram tags, reaproveitando a tag existente', async () => {
    expect(await tagsOf(N(1))).toEqual(['Devocional']);
    expect(await tagsOf(N(2))).toEqual(['diário']);
    expect(await tagsOf(N(3))).toEqual([]);
    const a = await db.query(`select 1 from public.tags where user_id = $1 and lower(name) = 'devocional'`, [USER_A]);
    expect(a.rows).toHaveLength(1);
  });

  it('cada dono recebe a própria tag, inclusive para nota na lixeira', async () => {
    expect(await tagsOf(N(4))).toEqual(['diário']);
    const b = await db.query<{ user_id: string }>(`select t.user_id from public.tags t where lower(t.name) = 'diário' order by t.user_id`);
    expect(b.rows.map((r) => r.user_id)).toEqual([USER_A, USER_B]);
  });
});
