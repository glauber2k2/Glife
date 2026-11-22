import { describe, expect, it } from 'vitest';

import { findBook, parseBibleRef } from '../../bible/index.ts';
import { diffMarkdownLinks, parseWikilinks, type LinkRow } from '../index.ts';

const NOTE = '9f2c0000-0000-4000-8000-000000000003';
const TX = '41aa0000-0000-4000-8000-000000000001';

describe('prefixo de tipo com referência inválida', () => {
  it('[[note: reunião]] vira link para nota pelo título, não some', () => {
    expect(parseWikilinks('[[note: reunião]]').map((l) => l.target)).toEqual([
      { type: 'note_title', title: 'note: reunião' },
    ]);
  });

  it('[[tx: ideias]] também cai para título', () => {
    expect(parseWikilinks('[[tx: ideias]]').map((l) => l.target)).toEqual([{ type: 'note_title', title: 'tx: ideias' }]);
  });
});

describe('título de nota que parece referência bíblica', () => {
  it('[[Ap 12]] aponta para a nota "Ap 12" quando ela existe', () => {
    const wl = parseWikilinks('[[Ap 12]]');
    const diff = diffMarkdownLinks([], wl, (t) => (t === 'Ap 12' ? NOTE : undefined));
    expect(diff.add).toEqual([{ target_type: 'note', target_ref: NOTE, relation: 'ref' }]);
  });

  it('[[Ap 12]] continua sendo Apocalipse 12 quando não existe nota com esse título', () => {
    const wl = parseWikilinks('[[Ap 12]]');
    const diff = diffMarkdownLinks([], wl, () => undefined);
    expect(diff.add).toEqual([{ target_type: 'bible', target_ref: 'REV.12', relation: 'ref' }]);
    expect(diff.unresolved).toEqual([]);
  });

  it('[[bible:Ap 12]] é sempre Bíblia, mesmo com nota de mesmo título', () => {
    const wl = parseWikilinks('[[bible:Ap 12]]');
    const diff = diffMarkdownLinks([], wl, () => NOTE);
    expect(diff.add).toEqual([{ target_type: 'bible', target_ref: 'REV.12', relation: 'ref' }]);
  });
});

describe('Unicode decomposto (NFD)', () => {
  const joNfd = 'J' + 'ó'; // "Jó" com acento combinante, comum em texto colado do macOS

  it('findBook reconhece "Jó" em NFD', () => {
    expect(findBook(joNfd)?.code).toBe('JOB');
  });

  it('parseBibleRef lê "Jó 1:1" em NFD', () => {
    expect(parseBibleRef(`${joNfd} 1:1`)).toEqual({ book: 'JOB', chapter: 1, verse: 1 });
  });
});

describe('código inline com crase dupla', () => {
  it('ignora links dentro de ``...``', () => {
    expect(parseWikilinks('texto ``[[ignorado]]`` e [[vale]]').map((l) => l.target)).toEqual([
      { type: 'note_title', title: 'vale' },
    ]);
  });

  it('ignora crase dupla contendo crase simples', () => {
    expect(parseWikilinks('`` a ` [[ignorado]] `` [[vale]]').map((l) => l.target)).toEqual([
      { type: 'note_title', title: 'vale' },
    ]);
  });
});

describe('linhas duplicadas vindas do sync', () => {
  const row = (id: string): LinkRow => ({
    id,
    source_type: 'note',
    source_id: NOTE,
    target_type: 'tx',
    target_ref: TX,
    relation: 'ref',
    origin: 'markdown',
    deleted_at: null,
  });

  it('mantém uma e remove as cópias', () => {
    const diff = diffMarkdownLinks([row('a'), row('b'), row('c')], parseWikilinks(`[[tx:${TX}]]`), () => undefined);
    expect(diff.add).toEqual([]);
    expect(diff.remove).toEqual(['b', 'c']);
  });
});
