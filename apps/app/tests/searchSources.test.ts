import { SNIPPET_MARK_END, SNIPPET_MARK_START } from '@glife/domain/search';
import { describe, expect, it } from 'vitest';

import { createLocalTagsRepository } from '../src/features/links/data/localTagsRepository';
import { linksTables } from '../src/features/links/data/schema';
import { createTagsSearchSource } from '../src/features/links/data/tagsSearch';
import { createLocalNoteFoldersRepository, createLocalNotesRepository } from '../src/features/notes/data/localNotesRepository';
import {
  createFoldersSearchSource,
  createNotesSearchSource,
  notesSearchIndex,
} from '../src/features/notes/data/notesSearch';
import { notesTables } from '../src/features/notes/data/schema';
import { ensureSearchIndexes } from '../src/shared/lib/powersync/searchIndex';
import { createSqliteLocalDb } from './support/sqliteLocalDb';

const USER = '11110000-0000-4000-8000-000000000001';

async function setup({ index = true } = {}) {
  const db = await createSqliteLocalDb({ ...notesTables, ...linksTables });
  const notes = createLocalNotesRepository(db, USER);
  const folders = createLocalNoteFoldersRepository(db, USER);
  if (index) await ensureSearchIndexes(db, [notesSearchIndex]);
  return { db, notes, folders, source: createNotesSearchSource(db, notes) };
}

describe('fonte de notas', () => {
  it('título pesa mais que o corpo', async () => {
    const { notes, source } = await setup();
    const inBody = await notes.create({ title: 'Mercado', body_md: 'comprar café e leite' });
    const inTitle = await notes.create({ title: 'Café especial', body_md: 'grãos' });
    expect((await source.search('cafe', 10)).map((h) => h.id)).toEqual([inTitle.id, inBody.id]);
  });

  it('não mostra notas na lixeira', async () => {
    const { notes, source } = await setup();
    const n = await notes.create({ title: 'Oração', body_md: '' });
    await notes.remove(n.id);
    expect(await source.search('oracao', 10)).toEqual([]);
  });

  it('o hit abre a nota e traz o trecho do corpo com o termo marcado', async () => {
    const { notes, source } = await setup();
    const n = await notes.create({ title: 'Diário', body_md: 'hoje li o salmo 23 de manhã' });
    const [hit] = await source.search('salmo', 10);
    expect(hit).toMatchObject({ group: 'notes', id: n.id, title: 'Diário', href: `/nota/${n.id}` });
    expect(hit!.snippet).toContain(`${SNIPPET_MARK_START}salmo${SNIPPET_MARK_END}`);
  });

  it('nota sem título aparece como "Sem título"', async () => {
    const { notes, source } = await setup();
    await notes.create({ title: '', body_md: 'ideia solta' });
    expect((await source.search('ideia', 10))[0]!.title).toBe('Sem título');
  });

  it('texto com sintaxe do FTS não quebra', async () => {
    const { notes, source } = await setup();
    // Todas as palavras precisam aparecer: "OR" é texto, não operador.
    await notes.create({ title: 'a "b" or c', body_md: '' });
    await notes.create({ title: 'só b', body_md: '' });
    await expect(source.search('"b" OR (', 10)).resolves.toHaveLength(1);
  });

  it('respeita o limite', async () => {
    const { notes, source } = await setup();
    for (let i = 0; i < 4; i++) await notes.create({ title: `Nota ${i}`, body_md: '' });
    expect(await source.search('nota', 2)).toHaveLength(2);
  });

  it('sem índice cai para a varredura do repositório', async () => {
    const { notes, source } = await setup({ index: false });
    const n = await notes.create({ title: 'Café', body_md: '' });
    expect((await source.search('Caf', 10)).map((h) => h.id)).toEqual([n.id]);
  });

  it('recentes: fixadas primeiro, depois as mais recentes', async () => {
    const { notes, source } = await setup();
    const old = await notes.create({ title: 'Antiga', body_md: '' });
    await notes.update(old.id, { pinned: true });
    const fresh = await notes.create({ title: 'Nova', body_md: '' });
    expect((await source.recent!(5)).map((h) => h.id)).toEqual([old.id, fresh.id]);
  });
});

describe('fonte de pastas', () => {
  it('casa início de palavra sem acento e abre a pasta', async () => {
    const { folders } = await setup();
    const f = await folders.create({ name: 'Estudos Bíblicos' });
    await folders.create({ name: 'Trabalho' });
    const hits = await createFoldersSearchSource(folders).search('bib', 5);
    expect(hits).toEqual([{ group: 'folders', id: f.id, title: 'Estudos Bíblicos', href: `/pasta/${f.id}` }]);
  });
});

describe('fonte de tags', () => {
  it('casa o nome e abre Notas filtrada pela tag', async () => {
    const db = await createSqliteLocalDb(linksTables);
    const tags = createLocalTagsRepository(db, USER);
    const tag = await tags.add({ type: 'note', id: '22220000-0000-4000-8000-000000000001' }, 'Romanos');
    const hits = await createTagsSearchSource(tags).search('rom', 5);
    expect(hits).toEqual([{ group: 'tags', id: tag.id, title: '#Romanos', href: `/notas?tag=${tag.id}` }]);
  });
});
