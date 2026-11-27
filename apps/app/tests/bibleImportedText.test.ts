import { describe, expect, it } from 'vitest';

import { bibleLocalTables } from '../src/features/bible/data/schema';
import { createImportedText } from '../src/features/bible/data/importedText';
import { createSqliteLocalDb } from './support/sqliteLocalDb';

const data = (abbr: string) => ({ abbr, name: `Tradução ${abbr}`, books: [{ book: 'JHN', chapters: [['v1'], [], ['a', 'b']] }] });

describe('traduções importadas (só no aparelho)', () => {
  it('importa, lista e lê o capítulo', async () => {
    const src = createImportedText(await createSqliteLocalDb(bibleLocalTables));
    const t = await src.importTranslation(data('NVI'), []);
    expect(await src.translations()).toEqual([{ id: t.id, abbr: 'NVI', name: 'Tradução NVI', credit: null, source: 'imported' }]);
    expect(await src.chapter(t.id, 'JHN', 3)).toEqual(['a', 'b']);
    expect(await src.chapter(t.id, 'JHN', 2)).toEqual([]);
    expect(await src.chapter(t.id, 'ROM', 1)).toBeNull();
  });

  it('sigla repetida (inclusive de uma tradução que vem no app) é recusada com o motivo', async () => {
    const src = createImportedText(await createSqliteLocalDb(bibleLocalTables));
    await src.importTranslation(data('NVI'), []);
    await expect(src.importTranslation(data('nvi'), [])).rejects.toMatchObject({ code: 'validation' });
    await expect(src.importTranslation(data('BLIVRE'), ['BLIVRE'])).rejects.toMatchObject({ code: 'validation' });
    expect(await src.translations()).toHaveLength(1);
  });

  it('remover apaga a tradução e o texto dela', async () => {
    const db = await createSqliteLocalDb(bibleLocalTables);
    const src = createImportedText(db);
    const t = await src.importTranslation(data('ARA'), []);
    await src.removeTranslation(t.id);
    expect(await src.translations()).toEqual([]);
    expect(await db.getAll('SELECT id FROM bible_local_chapters')).toEqual([]);
  });
});
