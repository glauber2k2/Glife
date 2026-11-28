import { describe, expect, it } from 'vitest';

import { findBibleRefs } from '../findRefs.ts';

const found = (text: string) => findBibleRefs(text).map((r) => ({ text: text.slice(r.start, r.end), ref: r.ref }));

describe('findBibleRefs', () => {
  it('acha a referência no fim do versículo', () => {
    expect(found('essa se tornou a principal de esquina, Salmo 118:22')).toEqual([
      { text: 'Salmo 118:22', ref: { book: 'PSA', chapter: 118, verse: 22 } },
    ]);
  });

  it('separa listas com ponto e vírgula', () => {
    expect(found('“o trabalhador é digno do seu salário”. Lucas 10:7; Levítico 19:13')).toEqual([
      { text: 'Lucas 10:7', ref: { book: 'LUK', chapter: 10, verse: 7 } },
      { text: 'Levítico 19:13', ref: { book: 'LEV', chapter: 19, verse: 13 } },
    ]);
  });

  it('livro com número', () => {
    expect(found('que não dobraram os joelhos a Baal.” 1 Reis 19:18')[0]).toEqual({
      text: '1 Reis 19:18',
      ref: { book: '1KI', chapter: 19, verse: 18 },
    });
  });

  it('não inclui a pontuação final', () => {
    expect(found('será salvo.” Joel 2:32.')[0]!.text).toBe('Joel 2:32');
  });

  it('intervalo de versículos e abreviação', () => {
    expect(found('veja Jo 3:16-18 e')[0]).toEqual({ text: 'Jo 3:16-18', ref: { book: 'JHN', chapter: 3, verse: 16, verseEnd: 18 } });
  });

  it('versículo solto depois de uma referência é do mesmo livro', () => {
    expect(found('Isaías 40:3; 52:7')).toEqual([
      { text: 'Isaías 40:3', ref: { book: 'ISA', chapter: 40, verse: 3 } },
      { text: '52:7', ref: { book: 'ISA', chapter: 52, verse: 7 } },
    ]);
  });

  it('versículos em lista com vírgula ficam no mesmo link', () => {
    expect(found('Isaías 59:20,21; 27:9; Jeremias 31:33-34').map((r) => r.text)).toEqual(['Isaías 59:20,21', '27:9', 'Jeremias 31:33-34']);
  });

  it('acentos e nomes compostos', () => {
    expect(found('Oseías 11:1')[0]!.ref.book).toBe('HOS');
    expect(found('Cântico dos Cânticos 2:1')[0]).toEqual({ text: 'Cântico dos Cânticos 2:1', ref: { book: 'SNG', chapter: 2, verse: 1 } });
  });

  it('ignora o que não é referência', () => {
    expect(found('Atos 2 e o capítulo 3:4')).toEqual([]);
    expect(found('às 10:30 fomos')).toEqual([]);
    expect(found('todos os 3:4')).toEqual([]);
    expect(found('Salmos 151:1')).toEqual([]); // capítulo inexistente
  });
});
