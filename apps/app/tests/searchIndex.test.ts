import type { LocalDb } from '@glife/domain/core';
import { describe, expect, it } from 'vitest';

import { notesTables } from '../src/features/notes/data/schema';
import {
  dropSearchIndexes,
  ensureSearchIndexes,
  ftsTableName,
  type FtsIndexSpec,
} from '../src/shared/lib/powersync/searchIndex';
import { createSqliteLocalDb } from './support/sqliteLocalDb';

const spec: FtsIndexSpec = { name: 'search_notes', version: 1, table: 'notes', columns: { title: 'title', body: 'body_md' } };
const FTS = ftsTableName(spec);

/** ids das notas que casam, juntando pelo rowid como as fontes de busca fazem. */
const match = async (db: LocalDb, q: string) =>
  (
    await db.getAll<{ id: string }>(
      `SELECT p.id FROM ${FTS} f JOIN ps_data__notes p ON p.rowid = f.rowid WHERE ${FTS} MATCH ? ORDER BY p.id`,
      [q],
    )
  ).map((r) => r.id);

const count = async (db: LocalDb, sql: string) => (await db.getOptional<{ n: number }>(sql))!.n;

const setup = async () => {
  const db = await createSqliteLocalDb(notesTables);
  await db.execute('INSERT INTO notes (id, title, body_md) VALUES (?, ?, ?)', ['n1', 'Café da manhã', 'pão e ovos']);
  return db;
};

describe('ensureSearchIndexes', () => {
  it('cria o índice preenchido com as notas que já existem', async () => {
    const db = await setup();
    expect(await ensureSearchIndexes(db, [spec])).toEqual({ available: true });
    expect(await match(db, '"cafe"*')).toEqual(['n1']);
    expect(await match(db, '"ovos"*')).toEqual(['n1']);
  });

  it('acompanha inclusão, edição e exclusão', async () => {
    const db = await setup();
    await ensureSearchIndexes(db, [spec]);
    await db.execute('INSERT INTO notes (id, title, body_md) VALUES (?, ?, ?)', ['n2', 'Oração', 'salmo']);
    expect(await match(db, '"oracao"*')).toEqual(['n2']);
    await db.execute('UPDATE notes SET title = ? WHERE id = ?', ['Jejum', 'n2']);
    expect(await match(db, '"oracao"*')).toEqual([]);
    expect(await match(db, '"jejum"*')).toEqual(['n2']);
    await db.execute('DELETE FROM notes WHERE id = ?', ['n2']);
    expect(await match(db, '"jejum"*')).toEqual([]);
  });

  it('REPLACE vindo da sincronização não gera resultado repetido nem velho', async () => {
    const db = await setup();
    await ensureSearchIndexes(db, [spec]);
    await db.execute('INSERT OR REPLACE INTO ps_data__notes (id, data) VALUES (?, ?)', [
      'n1',
      JSON.stringify({ title: 'Café forte', body_md: 'sem pão' }),
    ]);
    expect(await match(db, '"cafe"*')).toEqual(['n1']);
    expect(await match(db, '"ovos"*')).toEqual([]);
  });

  it('rodar de novo não duplica', async () => {
    const db = await setup();
    await ensureSearchIndexes(db, [spec]);
    await ensureSearchIndexes(db, [spec]);
    expect(await count(db, `SELECT count(*) AS n FROM ${FTS}`)).toBe(1);
  });

  it('gatilho faltando: recria tudo e repreenche', async () => {
    const db = await setup();
    await ensureSearchIndexes(db, [spec]);
    await db.execute(`DROP TRIGGER ${FTS}_ai`);
    await db.execute('INSERT INTO notes (id, title, body_md) VALUES (?, ?, ?)', ['n2', 'Perdida', '']);
    await ensureSearchIndexes(db, [spec]);
    expect(await match(db, '"perdida"*')).toEqual(['n2']);
    expect(await count(db, `SELECT count(*) AS n FROM ${FTS}`)).toBe(2);
  });

  it('versão nova apaga a antiga', async () => {
    const db = await setup();
    await ensureSearchIndexes(db, [spec]);
    await ensureSearchIndexes(db, [{ ...spec, version: 2 }]);
    const names = (await db.getAll<{ name: string }>("SELECT name FROM sqlite_master WHERE name LIKE 'search_notes_v1%'"));
    expect(names).toEqual([]);
  });

  it('sem FTS5 devolve available:false sem lançar', async () => {
    const db = await setup();
    const noFts: LocalDb = {
      ...db,
      writeTransaction: () => Promise.reject(new Error('no such module: fts5')),
    };
    await expect(ensureSearchIndexes(noFts, [spec])).resolves.toEqual({ available: false });
  });
});

describe('dropSearchIndexes', () => {
  it('ao sair não sobra índice nem gatilho', async () => {
    const db = await setup();
    await ensureSearchIndexes(db, [spec]);
    await dropSearchIndexes(db, [spec]);
    expect(await count(db, "SELECT count(*) AS n FROM sqlite_master WHERE name LIKE 'search_notes%'")).toBe(0);
  });
});
