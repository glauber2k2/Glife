import { describe, expect, it } from 'vitest';

import { createAliasBook, redactPersonalData } from '../index.ts';

const U1 = '0b9e1a52-8c39-4a0e-9d58-2f0c3b2f8a11';
const U2 = '6f1d6f0e-3f3c-4b6b-a3c1-7a8d2e9b4c22';

describe('apelidos de id', () => {
  it('o mesmo id recebe sempre o mesmo apelido, por tipo', () => {
    const book = createAliasBook();
    expect(book.alias('note', U1)).toBe('n1');
    expect(book.alias('note', U1)).toBe('n1');
    expect(book.alias('note', U2)).toBe('n2');
    expect(book.alias('event', U1)).toBe('e1');
    expect(book.alias('reminder', U2)).toBe('r1');
    expect(book.alias('folder', U2)).toBe('p1');
  });

  it('resolve só apelidos conhecidos, nunca UUID cru', () => {
    const book = createAliasBook();
    book.alias('note', U1);
    book.alias('note', U2);
    expect(book.resolve('n2')).toEqual({ kind: 'note', id: U2 });
    expect(book.resolve('n9')).toBeNull();
    expect(book.resolve(U1)).toBeNull();
  });
});

describe('marcadores de dados pessoais', () => {
  it('mascara e repõe o texto original', () => {
    const book = createAliasBook();
    const text = 'ligar para 11 98765-4321 e mandar para joao@x.com o link https://a.b/c';
    const masked = book.mask(text);
    expect(masked).toBe('ligar para [tel1] e mandar para [email1] o link [link1]');
    expect(book.unmask(masked)).toBe(text);
  });

  it('o mesmo valor gera o mesmo marcador', () => {
    const book = createAliasBook();
    expect(book.mask('11 98765-4321')).toBe('[tel1]');
    expect(book.mask('de novo 11 98765-4321')).toBe('de novo [tel1]');
    expect(book.mask('conta 123456789012')).toBe('conta [num1]');
  });

  it('o texto mascarado passa pela limpeza sem mudar', () => {
    const book = createAliasBook();
    const masked = book.mask('ligar 11 98765-4321, CPF 123.456.789-09');
    expect(redactPersonalData(masked)).toBe(masked);
  });

  it('marcador desconhecido fica como está', () => {
    expect(createAliasBook().unmask('[tel7]')).toBe('[tel7]');
  });
});
