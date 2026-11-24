import { describe, expect, it } from 'vitest';

import { notesTables } from '../src/features/notes/data/schema';
import { createSqliteLocalDb } from './support/sqliteLocalDb';

// O banco dos testes imita o formato do PowerSync: cada tabela é uma view sobre ps_data__<tabela>(id, data JSON).
describe('SQLite dos testes no formato do PowerSync', () => {
  it('grava pela view e guarda a linha como JSON em ps_data__notes', async () => {
    const db = await createSqliteLocalDb(notesTables);
    await db.execute('INSERT INTO notes (id, title, body_md, pinned) VALUES (?, ?, ?, ?)', ['n1', 'Café', 'corpo', 1]);
    const raw = await db.getOptional<{ title: string; pinned: number }>(
      "SELECT json_extract(data, '$.title') AS title, json_extract(data, '$.pinned') AS pinned FROM ps_data__notes WHERE id = ?",
      ['n1'],
    );
    expect(raw).toEqual({ title: 'Café', pinned: 1 });
  });

  it('a view lê, atualiza e apaga como uma tabela comum', async () => {
    const db = await createSqliteLocalDb(notesTables);
    await db.execute('INSERT INTO notes (id, title, pinned) VALUES (?, ?, ?)', ['n1', 'A', 0]);
    await db.execute('UPDATE notes SET title = ? WHERE id = ?', ['B', 'n1']);
    expect(await db.getAll('SELECT id, title, pinned, body_md FROM notes')).toEqual([
      { id: 'n1', title: 'B', pinned: 0, body_md: null },
    ]);
    await db.execute('DELETE FROM notes WHERE id = ?', ['n1']);
    expect(await db.getAll('SELECT id FROM ps_data__notes')).toEqual([]);
  });

  it('tem FTS5', async () => {
    const db = await createSqliteLocalDb({});
    await expect(db.execute('CREATE VIRTUAL TABLE t USING fts5(x)')).resolves.toBeUndefined();
  });
});
