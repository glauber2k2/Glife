import { describe, expect, it } from 'vitest';

import {
  SNIPPET_MARK_END,
  SNIPPET_MARK_START,
  matchActions,
  matchesWords,
  mergeResults,
  normalizeText,
  runSearch,
  snippetParts,
  toFtsQuery,
  type SearchAction,
  type SearchHit,
  type SearchSource,
} from '../index.ts';

describe('normalizeText', () => {
  it('tira acentos e maiúsculas e junta espaços', () => {
    expect(normalizeText('  Café   ÇÃO ')).toBe('cafe cao');
  });
});

describe('toFtsQuery', () => {
  it('cada palavra vira prefixo entre aspas, unidas por AND', () => {
    expect(toFtsQuery('café  com')).toBe('"café"* AND "com"*');
  });

  it('entrada vazia ou só espaços não vira consulta', () => {
    expect(toFtsQuery('')).toBeNull();
    expect(toFtsQuery('   ')).toBeNull();
  });

  it('aspas digitadas são escapadas', () => {
    expect(toFtsQuery('di"a')).toBe('"di""a"*');
  });

  it('operadores do FTS5 digitados são texto comum', () => {
    expect(toFtsQuery('a OR b')).toBe('"a"* AND "OR"* AND "b"*');
    expect(toFtsQuery('-x (y)')).toBe('"-x"* AND "(y)"*');
  });

  it('palavras sem letra nem número são ignoradas', () => {
    expect(toFtsQuery('" - *')).toBeNull();
    expect(toFtsQuery('nota *')).toBe('"nota"*');
  });

  it('limita a 8 palavras', () => {
    expect(toFtsQuery('a b c d e f g h i j')!.split(' AND ')).toHaveLength(8);
  });
});

describe('matchesWords', () => {
  it('toda palavra digitada é início de alguma palavra do texto, sem acento nem maiúscula', () => {
    expect(matchesWords('Estudos Bíblicos', 'bib est')).toBe(true);
    expect(matchesWords('Estudos Bíblicos', 'blicos')).toBe(false);
    expect(matchesWords('Estudos', '  ')).toBe(true);
  });
});

const actions: SearchAction[] = [
  {
    id: 'new-note',
    label: (q) => (q ? `Nova nota: ${q}` : 'Nova nota'),
    keywords: ['criar', 'escrever'],
    href: () => '/nota/nova',
    anyQuery: true,
  },
  { id: 'finance', label: () => 'Ir para Finanças', keywords: ['dinheiro'], href: () => '/financas' },
  { id: 'trash', label: () => 'Abrir Lixeira', keywords: ['excluídas'], href: () => '/lixeira' },
];

describe('matchActions', () => {
  it('campo vazio devolve todas, com o rótulo sem consulta', () => {
    expect(matchActions(actions, '  ').map((a) => a.title)).toEqual(['Nova nota', 'Ir para Finanças', 'Abrir Lixeira']);
  });

  it('casa início de palavra sem acento nem maiúscula', () => {
    expect(matchActions(actions, 'FIN').map((a) => a.id)).toContain('finance');
    expect(matchActions(actions, 'financas').map((a) => a.id)).toContain('finance');
    expect(matchActions(actions, 'nancas').map((a) => a.id)).not.toContain('finance');
  });

  it('casa pelas palavras-chave', () => {
    expect(matchActions(actions, 'excluidas').map((a) => a.id)).toContain('trash');
  });

  it('ação de qualquer consulta aparece sempre, com a consulta no rótulo e no endereço', () => {
    const hits = matchActions(
      [{ ...actions[0]!, href: (q) => `/nota/nova?titulo=${encodeURIComponent(q)}` }],
      ' lista de compras ',
    );
    expect(hits).toEqual([
      {
        group: 'actions',
        id: 'new-note',
        title: 'Nova nota: lista de compras',
        href: '/nota/nova?titulo=lista%20de%20compras',
      },
    ]);
  });
});

const hit = (group: SearchHit['group'], id: string): SearchHit => ({ group, id, title: id, href: `/${id}` });

describe('snippetParts', () => {
  it('separa o trecho em partes marcadas e não marcadas', () => {
    expect(snippetParts(`li o ${SNIPPET_MARK_START}salmo${SNIPPET_MARK_END} hoje`)).toEqual([
      { text: 'li o ', mark: false },
      { text: 'salmo', mark: true },
      { text: ' hoje', mark: false },
    ]);
  });

  it('marca sem fechamento não vaza caracteres de controle', () => {
    expect(snippetParts(`a${SNIPPET_MARK_START}b`)).toEqual([
      { text: 'a', mark: false },
      { text: 'b', mark: true },
    ]);
  });
});

describe('runSearch', () => {
  const notesSource: SearchSource = {
    group: 'notes',
    search: async (q, limit) => [hit('notes', `n:${q}:${limit}`)],
    recent: async () => [hit('notes', 'recente')],
  };
  const broken: SearchSource = { group: 'tags', search: () => Promise.reject(new Error('x')) };

  it('campo vazio: todas as ações e as sugestões das fontes', async () => {
    const sections = await runSearch([notesSource, broken], actions, ' ');
    expect(sections.map((s) => [s.group, s.hits.map((h) => h.id)])).toEqual([
      ['actions', ['new-note', 'finance', 'trash']],
      ['notes', ['recente']],
    ]);
  });

  it('com texto: ações que casam e o resultado de cada fonte; fonte com erro é ignorada', async () => {
    const sections = await runSearch([notesSource, broken], actions, ' fin ');
    expect(sections.map((s) => [s.group, s.hits.map((h) => h.id)])).toEqual([
      ['actions', ['new-note', 'finance']],
      ['notes', ['n:fin:20']],
    ]);
  });
});

describe('mergeResults', () => {
  it('ordena os grupos em Ações → Notas → Pastas → Tags e omite grupos vazios', () => {
    const sections = mergeResults([hit('tags', 't1'), hit('notes', 'n1'), hit('actions', 'a1'), hit('notes', 'n2')]);
    expect(sections.map((s) => [s.group, s.hits.map((h) => h.id)])).toEqual([
      ['actions', ['a1']],
      ['notes', ['n1', 'n2']],
      ['tags', ['t1']],
    ]);
  });

  it('corta cada grupo no limite', () => {
    const many = Array.from({ length: 9 }, (_, i) => hit('folders', `f${i}`));
    expect(mergeResults(many)[0]!.hits).toHaveLength(5);
    expect(mergeResults(many, { folders: 2 })[0]!.hits).toHaveLength(2);
  });

  it('não repete o mesmo item no grupo', () => {
    expect(mergeResults([hit('notes', 'n1'), hit('notes', 'n1')])[0]!.hits).toHaveLength(1);
  });
});
