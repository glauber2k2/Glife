import { describe, expect, it } from 'vitest';

import { parseInline, parseMarkdown } from '../src/features/notes/components/markdown';

describe('markdown do modo Ler', () => {
  it('separa títulos, parágrafos, listas e citações', () => {
    const md = '## Nenhuma condenação\nNão há condenação.\n\n- v. 1–4\n- v. 18\n\n> Nada poderá nos separar. — v. 39';
    expect(parseMarkdown(md).map((b) => b.type)).toEqual(['heading', 'paragraph', 'list', 'quote']);
  });

  it('agrupa itens seguidos da mesma lista, inclusive numerada', () => {
    const blocks = parseMarkdown('1. um\n2. dois\n- três');
    expect(blocks).toHaveLength(2);
    expect(blocks[0]).toMatchObject({ type: 'list', ordered: true });
    expect(blocks[0]!.type === 'list' && blocks[0]!.items).toHaveLength(2);
  });

  it('junta linhas do mesmo parágrafo e separa por linha em branco', () => {
    const blocks = parseMarkdown('linha um\nlinha dois\n\noutro');
    expect(blocks).toHaveLength(2);
  });

  it('separa a referência no fim da citação ("— v. 39")', () => {
    const [quote] = parseMarkdown('> Nada poderá nos separar do amor de Deus. — Romanos 8:39');
    expect(quote).toMatchObject({ type: 'quote', cite: 'Romanos 8:39' });
  });

  it('reconhece negrito, vínculos [[ ]] e links', () => {
    expect(parseInline('abre com **liberdade** e [[Lectio — como faço]] e [site](https://a.b)')).toEqual([
      { type: 'text', text: 'abre com ' },
      { type: 'bold', text: 'liberdade' },
      { type: 'text', text: ' e ' },
      { type: 'wikilink', target: 'Lectio — como faço', text: 'Lectio — como faço' },
      { type: 'text', text: ' e ' },
      { type: 'link', url: 'https://a.b', text: 'site' },
    ]);
  });

  it('usa o apelido do vínculo [[alvo|texto]]', () => {
    expect(parseInline('[[Plano|o plano]]')).toEqual([{ type: 'wikilink', target: 'Plano', text: 'o plano' }]);
  });

  it('ignora links que não são http(s)', () => {
    expect(parseInline('[x](javascript:alert(1))')).toEqual([{ type: 'text', text: '[x](javascript:alert(1))' }]);
  });
});
