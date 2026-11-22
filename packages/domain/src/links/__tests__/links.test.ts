import { describe, expect, it } from 'vitest';
import { diffMarkdownLinks, formatWikilink, parseUri, parseWikilinks, toUri, type LinkRow } from '../index.ts';

const TX = '41aa0000-0000-4000-8000-000000000001';
const MEDIA = 'e5f60000-0000-4000-8000-000000000002';
const NOTE = '9f2c0000-0000-4000-8000-000000000003';

describe('URIs vida://', () => {
  it('ida e volta', () => {
    expect(parseUri(toUri({ type: 'tx', ref: TX }))).toEqual({ type: 'tx', ref: TX });
    expect(parseUri('vida://bible/JHN.3.16-18')).toEqual({ type: 'bible', ref: 'JHN.3.16-18' });
  });
  it('rejeita inválidos', () => {
    expect(parseUri('vida://tx/nao-e-uuid')).toBeNull();
    expect(parseUri('vida://foo/' + TX)).toBeNull();
    expect(parseUri('http://tx/' + TX)).toBeNull();
    expect(parseUri('vida://bible/JHN.99.1')).toBeNull();
  });
});

describe('parseWikilinks', () => {
  const md = [
    'Reunião: [[Reunião com pastor]] e [[tx:' + TX + '|Mercado 22/11]].',
    'Leitura de [[Jo 3:16]] e ![[media:' + MEDIA + ']].',
    '`[[ignorado inline]]`',
    '```',
    '[[ignorado no bloco]]',
    '```',
    '[[Nota#Seção]]',
  ].join('\n');

  const links = parseWikilinks(md);

  it('encontra todos os tipos e ignora código', () => {
    expect(links.map((l) => l.target)).toEqual([
      { type: 'note_title', title: 'Reunião com pastor' },
      { type: 'tx', ref: TX },
      { type: 'bible', ref: 'JHN.3.16' },
      { type: 'media', ref: MEDIA },
      { type: 'note_title', title: 'Nota' },
    ]);
  });

  it('lê rótulo, embed e posição', () => {
    expect(links[1]!.label).toBe('Mercado 22/11');
    expect(links[3]!.relation).toBe('embed');
    expect(md.slice(links[0]!.start, links[0]!.end)).toBe('[[Reunião com pastor]]');
  });

  it('formatWikilink gera texto que o parser entende', () => {
    const text = formatWikilink({ type: 'media', ref: MEDIA }, { embed: true });
    expect(parseWikilinks(text)[0]!.target).toEqual({ type: 'media', ref: MEDIA });
  });
});

describe('diffMarkdownLinks', () => {
  const row = (over: Partial<LinkRow>): LinkRow => ({
    id: 'l1',
    source_type: 'note',
    source_id: NOTE,
    target_type: 'tx',
    target_ref: TX,
    relation: 'ref',
    origin: 'markdown',
    deleted_at: null,
    ...over,
  });

  it('adiciona novos, remove os que sumiram e preserva manuais', () => {
    const existing = [
      row({ id: 'keep' }),
      row({ id: 'gone', target_type: 'bible', target_ref: 'PSA.23' }),
      row({ id: 'manual', origin: 'manual', target_type: 'bible', target_ref: 'ROM.8.28' }),
    ];
    const wl = parseWikilinks(`[[tx:${TX}]] [[Jo 3:16]] [[Existe]] [[Não existe]]`);
    const diff = diffMarkdownLinks(existing, wl, (t) => (t === 'Existe' ? NOTE : undefined));
    expect(diff.remove).toEqual(['gone']);
    expect(diff.add).toEqual([
      { target_type: 'bible', target_ref: 'JHN.3.16', relation: 'ref' },
      { target_type: 'note', target_ref: NOTE, relation: 'ref' },
    ]);
    expect(diff.unresolved).toEqual(['Não existe']);
  });
});
