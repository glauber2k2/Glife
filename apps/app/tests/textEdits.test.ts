import { describe, expect, it } from 'vitest';

import { applyWikilink, prefixLines, toggleBold, toggleHeading, toggleWrap, insertAt, normalizeSelection, wikilinkQuery } from '../src/features/notes/components/textEdits';

describe('seleção após alterações e linhas vazias', () => {
  it('normaliza índices atrasados, invertidos, fracionários e não finitos', () => {
    expect(normalizeSelection('curto', { start: 20, end: 30 })).toEqual({ start: 5, end: 5 });
    expect(normalizeSelection('abc', { start: 2.8, end: -4 })).toEqual({ start: 0, end: 2 });
    expect(normalizeSelection('', { start: NaN, end: Infinity })).toEqual({ start: 0, end: 0 });
  });

  it('insere no final do texto encurtado em vez de enviar cursor além do conteúdo', () => {
    expect(insertAt('a', { start: 12, end: 12 }, 'x')).toEqual({ text: 'ax', selection: { start: 2, end: 2 } });
  });

  it('formata a primeira linha vazia sem deslocar a quebra para cima', () => {
    expect(prefixLines('\nitem', { start: 0, end: 0 }, '- ')).toEqual({ text: '- \nitem', selection: { start: 2, end: 2 } });
    expect(toggleHeading('\nitem', { start: 0, end: 0 }, 1)).toEqual({ text: '# \nitem', selection: { start: 2, end: 2 } });
  });

  it('mantém cursor válido ao desmarcar no início de uma lista', () => {
    expect(prefixLines('- item', { start: 0, end: 0 }, '- ')).toEqual({ text: 'item', selection: { start: 0, end: 0 } });
  });

  it('todas as ações respeitam limites mesmo com eventos de seleção antigos', () => {
    const text = '- item\n\n  😀';
    for (const selection of [{ start: 99, end: 99 }, { start: -8, end: 5 }, { start: 9, end: 2 }, { start: NaN, end: Infinity }]) {
      const edits = [insertAt(text, selection, '[['), toggleWrap(text, selection, '**'), toggleHeading(text, selection, 1), prefixLines(text, selection, '- '), applyWikilink(text, selection.start, selection.end, 'Nota')];
      for (const edit of edits) {
        expect(edit.selection.start).toBeGreaterThanOrEqual(0);
        expect(edit.selection.end).toBeGreaterThanOrEqual(edit.selection.start);
        expect(edit.selection.end).toBeLessThanOrEqual(edit.text.length);
      }
    }
  });
});

describe('edições da barra de formatação', () => {
  it('negrito envolve a seleção', () => {
    expect(toggleBold('abre com liberdade', { start: 9, end: 18 })).toEqual({
      text: 'abre com **liberdade**',
      selection: { start: 11, end: 20 },
    });
  });

  it('negrito sem seleção abre um par e põe o cursor no meio', () => {
    expect(toggleBold('ab', { start: 1, end: 1 })).toEqual({ text: 'a****b', selection: { start: 3, end: 3 } });
  });

  it('negrito já aplicado é retirado', () => {
    expect(toggleBold('x **y** z', { start: 4, end: 5 })).toEqual({ text: 'x y z', selection: { start: 2, end: 3 } });
  });

  it('lista e citação marcam o começo de cada linha selecionada', () => {
    expect(prefixLines('um\ndois\ntrês', { start: 1, end: 5 }, '- ')).toEqual({
      text: '- um\n- dois\ntrês',
      selection: { start: 3, end: 9 },
    });
  });

  it('marcar de novo desmarca', () => {
    expect(prefixLines('> citação', { start: 3, end: 3 }, '> ').text).toBe('citação');
  });

  it('insere texto na posição do cursor', () => {
    expect(insertAt('Ver ', { start: 4, end: 4 }, '[[')).toEqual({ text: 'Ver [[', selection: { start: 6, end: 6 } });
  });
});

describe('sugestões de [[', () => {
  it('reconhece o [[ aberto antes do cursor', () => {
    expect(wikilinkQuery('Ver também [[Lect', 17)).toEqual({ start: 11, query: 'Lect' });
    expect(wikilinkQuery('Ver [[', 6)).toEqual({ start: 4, query: '' });
  });

  it('não abre se o vínculo já foi fechado ou atravessa linha', () => {
    expect(wikilinkQuery('[[Lectio]] e mais', 17)).toBeNull();
    expect(wikilinkQuery('[[abc\ndef', 9)).toBeNull();
  });

  it('aplica a escolha fechando o vínculo e põe o cursor depois', () => {
    expect(applyWikilink('Ver também [[Lect', 11, 17, 'Lectio — como faço')).toEqual({
      text: 'Ver também [[Lectio — como faço]]',
      selection: { start: 33, end: 33 },
    });
  });

  it('aproveita o ]] que já estava depois do cursor', () => {
    expect(applyWikilink('[[Le]] fim', 0, 4, 'Lectio')).toEqual({ text: '[[Lectio]] fim', selection: { start: 10, end: 10 } });
  });
});
