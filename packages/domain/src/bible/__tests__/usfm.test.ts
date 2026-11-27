import { describe, expect, it } from 'vitest';

import { parseUsfm } from '../usfm.ts';

const SAMPLE = [
  '\\id JHN Bíblia Livre',
  '\\h João',
  '\\mt1 Evangelho Segundo João',
  '\\c 1',
  '\\p',
  '\\v 1 No princípio era a Palavra, \\f + \\fr 1:1 \\fq Palavra \\ft equiv. Verbo \\f* e a Palavra era Deus.',
  '\\v 2 Esta \\add estava\\add* no princípio.',
  '\\c 3',
  '\\s Nicodemos',
  '\\d Título que não é versículo',
  '\\p',
  '\\v 16 Porque Deus \\w amou|strong="G25"\\w* o mundo\\x - Rm 5:8\\x* de tal maneira',
  '\\q1 que deu o seu Filho.',
].join('\n');

describe('parseUsfm', () => {
  it('lê livro, capítulos e versículos sem notas, títulos nem marcas', () => {
    const r = parseUsfm(SAMPLE);
    expect(r?.book).toBe('JHN');
    expect(r?.chapters[0]).toEqual(['No princípio era a Palavra, e a Palavra era Deus.', 'Esta estava no princípio.']);
    expect(r?.chapters[1]).toEqual([]);
    expect(r?.chapters[2]?.[15]).toBe('Porque Deus amou o mundo de tal maneira que deu o seu Filho.');
  });

  it('versículos que faltam no meio ficam vazios', () => {
    expect(r(['\\id GEN', '\\c 1', '\\v 1 a', '\\v 3 c'])?.chapters[0]).toEqual(['a', '', 'c']);
  });

  it('sem \\id reconhecido não é um livro', () => {
    expect(parseUsfm('\\c 1\n\\v 1 texto')).toBeNull();
    expect(parseUsfm('\\id XYZ\n\\c 1\n\\v 1 texto')).toBeNull();
  });
});

const r = (lines: string[]) => parseUsfm(lines.join('\n'));
