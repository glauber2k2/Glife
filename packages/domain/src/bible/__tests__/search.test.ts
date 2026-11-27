import { describe, expect, it } from 'vitest';
import { indexVerses, normalizeText, searchVerses } from '../index.ts';

const idx = indexVerses([
  { book: 'PSA', chapter: 23, verses: ['O SENHOR é meu pastor, nada me faltará.', 'Ele me faz deitar em pastos verdes, e me leva a águas quietas.'] },
  { book: 'JHN', chapter: 3, verses: ['Havia um homem dos fariseus.', 'Porque Deus amou o mundo de tal maneira.'] },
  { book: 'GEN', chapter: 1, verses: ['No princípio criou Deus os céus e a terra.'] },
]);

describe('busca no texto bíblico', () => {
  it('normaliza: minúsculas e sem acento', () => {
    expect(normalizeText('Águas Tranquilas')).toBe('aguas tranquilas');
  });

  it('sem acento acha com acento; referência em OSIS', () => {
    expect(searchVerses(idx, 'aguas', 'all').map((v) => v.ref)).toEqual(['PSA.23.2']);
  });

  it('frase: todas as palavras precisam estar no versículo', () => {
    expect(searchVerses(idx, 'nada me faltará', 'all').map((v) => v.ref)).toEqual(['PSA.23.1']);
    expect(searchVerses(idx, 'pastor fariseus', 'all')).toEqual([]);
  });

  it('escopo AT/NT e ordem canônica', () => {
    expect(searchVerses(idx, 'deus', 'all').map((v) => v.ref)).toEqual(['GEN.1.1', 'JHN.3.2']);
    expect(searchVerses(idx, 'deus', 'NT').map((v) => v.ref)).toEqual(['JHN.3.2']);
    expect(searchVerses(idx, 'deus', 'AT').map((v) => v.ref)).toEqual(['GEN.1.1']);
  });

  it('só palavras de 1 letra não acha nada (não devolve a Bíblia inteira)', () => {
    expect(searchVerses(idx, 'o e', 'all')).toEqual([]);
    expect(searchVerses(idx, '   ', 'all')).toEqual([]);
  });

  it('respeita o limite', () => {
    expect(searchVerses(idx, 'me', 'all', 1)).toHaveLength(1);
  });
});
