import { describe, expect, it } from 'vitest';

import { isRepositoryError } from '../../core/index.ts';
import { parseTranslationFiles } from '../importFile.ts';

const usfm = (book: string, body: string) => `\\id ${book}\n\\c 1\n${body}`;
const reason = (fn: () => unknown) => {
  try {
    fn();
  } catch (e) {
    expect(isRepositoryError(e, 'validation')).toBe(true);
    return ((e as { cause?: Error }).cause as Error).message;
  }
  throw new Error('não recusou');
};

describe('importar tradução', () => {
  it('lê vários USFM (um livro por arquivo)', () => {
    const r = parseTranslationFiles(
      [
        { name: 'JUD.usfm', text: usfm('JUD', '\\v 1 Judas, servo de Jesus.') },
        { name: 'PHM.SFM', text: usfm('PHM', '\\v 1 Paulo, prisioneiro.') },
      ],
      { abbr: 'nvi', name: ' Minha NVI ' },
    );
    expect(r.abbr).toBe('NVI');
    expect(r.name).toBe('Minha NVI');
    expect(r.books.map((b) => b.book)).toEqual(['JUD', 'PHM']);
    expect(r.books[0]!.chapters[0]).toEqual(['Judas, servo de Jesus.']);
  });

  it('lê o JSON no formato do importador', () => {
    const json = JSON.stringify({ books: [{ book: '2JN', chapters: [['a', 'b', 'c']] }] });
    expect(parseTranslationFiles([{ name: 'biblia.json', text: json }], { abbr: 'ARA', name: 'ARA' }).books[0]!.chapters[0]).toEqual(['a', 'b', 'c']);
  });

  it('recusa com o motivo: nada reconhecido, livro repetido, capítulos demais, sigla e nome inválidos', () => {
    expect(reason(() => parseTranslationFiles([{ name: 'x.txt', text: 'oi' }], { abbr: 'X1', name: 'X' }))).toMatch(/Nenhum livro/);
    expect(reason(() => parseTranslationFiles([{ name: 'a.json', text: '{ quebrado' }], { abbr: 'X1', name: 'X' }))).toMatch(/Nenhum livro/);
    const jhn = { name: 'a.usfm', text: usfm('JHN', '\\v 1 a') };
    expect(reason(() => parseTranslationFiles([jhn, jhn], { abbr: 'X1', name: 'X' }))).toMatch(/João.*mais de uma vez/);
    const big = JSON.stringify({ books: [{ book: 'JUD', chapters: [['a'], ['b']] }] });
    expect(reason(() => parseTranslationFiles([{ name: 'b.json', text: big }], { abbr: 'X1', name: 'X' }))).toMatch(/Judas/);
    expect(reason(() => parseTranslationFiles([jhn], { abbr: 'N', name: 'X' }))).toMatch(/Sigla/);
    // um arquivo bom e um que não é reconhecido: recusa tudo, dizendo qual
    const jud = { name: 'JUD.usfm', text: usfm('JUD', '\\v 1 Judas, servo.') };
    expect(reason(() => parseTranslationFiles([jud, { name: 'ROM.usfm', text: '\\id XYZ\n\\c 1\n\\v 1 a' }], { abbr: 'X1', name: 'X' }))).toMatch(/ROM\.usfm/);
    // livro truncado (João tem 21 capítulos) ou com capítulo vazio no meio
    expect(reason(() => parseTranslationFiles([jhn], { abbr: 'X1', name: 'X' }))).toMatch(/João.*incompleto.*1 de 21/);
    const gap = JSON.stringify({ books: [{ book: 'JUD', chapters: [[]] }] });
    expect(reason(() => parseTranslationFiles([{ name: 'g.json', text: gap }], { abbr: 'X1', name: 'X' }))).toMatch(/Judas.*incompleto/);
    expect(reason(() => parseTranslationFiles([jhn], { abbr: 'NVI', name: '  ' }))).toMatch(/Nome/);
  });
});
