import { describe, expect, it } from 'vitest';

import { annotationDraft, copyText, groupVerses, refCoversVerse, refTouchesChapter } from '../coverage.ts';
import { parseOsis, toOsis } from '../refs.ts';

const ref = (osis: string) => parseOsis(osis)!;

describe('cobertura de referências', () => {
  it('capítulo cobre todos os versículos dele', () => {
    expect(refCoversVerse(ref('JHN.3'), 'JHN', 3, 1)).toBe(true);
    expect(refCoversVerse(ref('JHN.3'), 'JHN', 3, 36)).toBe(true);
    expect(refCoversVerse(ref('JHN.3'), 'JHN', 4, 1)).toBe(false);
  });

  it('trecho que cruza capítulo cobre do início ao fim', () => {
    const r = ref('JHN.3.16-4.2');
    expect(refCoversVerse(r, 'JHN', 3, 15)).toBe(false);
    expect(refCoversVerse(r, 'JHN', 3, 36)).toBe(true);
    expect(refCoversVerse(r, 'JHN', 4, 1)).toBe(true);
    expect(refCoversVerse(r, 'JHN', 4, 3)).toBe(false);
    expect(refTouchesChapter(r, 'JHN', 4)).toBe(true);
    expect(refTouchesChapter(r, 'JHN', 5)).toBe(false);
  });

  it('versículo e trecho no mesmo capítulo; outro livro nunca', () => {
    expect(refCoversVerse(ref('JHN.3.16'), 'JHN', 3, 16)).toBe(true);
    expect(refCoversVerse(ref('JHN.3.16'), 'JHN', 3, 17)).toBe(false);
    expect(refCoversVerse(ref('JHN.3.16-18'), 'JHN', 3, 18)).toBe(true);
    expect(refCoversVerse(ref('JHN.3.16'), 'ROM', 3, 16)).toBe(false);
    expect(refCoversVerse(ref('PSA.23-24'), 'PSA', 24, 10)).toBe(true);
  });
});

describe('agrupar versículos selecionados', () => {
  it('ordena, tira repetidos e junta os contíguos', () => {
    expect(groupVerses('JHN', 3, [18, 16, 17, 20, 16]).map(toOsis)).toEqual(['JHN.3.16-18', 'JHN.3.20']);
    expect(groupVerses('JHN', 3, [])).toEqual([]);
  });
});

describe('anotação e cópia', () => {
  const blocks = [
    { ref: ref('JHN.3.16-18'), text: 'Porque Deus amou o mundo.' },
    { ref: ref('JHN.3.20'), text: 'Todo aquele que faz o mal.' },
  ];

  it('uma nota: título pela primeira referência, corpo cita cada bloco com wikilink', () => {
    const d = annotationDraft(blocks);
    expect(d.title).toBe('João 3:16-18 e outros');
    expect(d.body.startsWith('> [[Jo 3:16-18]] Porque Deus amou o mundo.')).toBe(true);
    expect(d.body).toContain('\n\n> [[Jo 3:20]] Todo aquele que faz o mal.');
    expect(d.body.endsWith('\n\n')).toBe(true);
    expect(annotationDraft(blocks.slice(0, 1)).title).toBe('João 3:16-18');
  });

  it('cópia leva texto, referência por extenso e sigla', () => {
    expect(copyText(blocks.slice(1), 'BLIVRE')).toBe('"Todo aquele que faz o mal." — João 3:20 (BLIVRE)');
    expect(copyText(blocks, 'BLIVRE').split('\n\n')).toHaveLength(2);
  });
});
