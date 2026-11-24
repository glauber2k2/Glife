import { describe, expect, it } from 'vitest';

import {
  INSTALLMENTS_MAX,
  centsSchema,
  formatBRL,
  parseBRL,
  splitInstallments,
  sumCents,
} from '../index.ts';

describe('centsSchema', () => {
  it('aceita inteiros, inclusive negativos e zero', () => {
    expect(centsSchema.parse(0)).toBe(0);
    expect(centsSchema.parse(-1999)).toBe(-1999);
    expect(centsSchema.parse(123456)).toBe(123456);
  });

  it.each([[1.5], [Number.NaN], [Number.POSITIVE_INFINITY], [Number.MAX_SAFE_INTEGER + 1], ['100']])(
    'recusa %s',
    (v) => {
      expect(centsSchema.safeParse(v).success).toBe(false);
    },
  );
});

describe('formatBRL', () => {
  it.each([
    [0, 'R$ 0,00'],
    [5, 'R$ 0,05'],
    [99, 'R$ 0,99'],
    [100, 'R$ 1,00'],
    [123456, 'R$ 1.234,56'],
    [100000000, 'R$ 1.000.000,00'],
    [-1999, '-R$ 19,99'],
    [-5, '-R$ 0,05'],
  ])('%i centavos → %s', (cents, text) => {
    expect(formatBRL(cents)).toBe(text);
  });

  it('mostra o sinal de mais quando pedido, e nunca no zero', () => {
    expect(formatBRL(1050, { signed: true })).toBe('+R$ 10,50');
    expect(formatBRL(-1050, { signed: true })).toBe('-R$ 10,50');
    expect(formatBRL(0, { signed: true })).toBe('R$ 0,00');
  });

  it('omite o símbolo quando pedido', () => {
    expect(formatBRL(123456, { symbol: false })).toBe('1.234,56');
    expect(formatBRL(-123456, { symbol: false })).toBe('-1.234,56');
  });

  it('recusa valor que não é centavo inteiro', () => {
    expect(() => formatBRL(1.5)).toThrow();
  });
});

describe('parseBRL', () => {
  it.each([
    ['0', 0],
    ['12', 1200],
    ['12,5', 1250],
    ['12,50', 1250],
    ['1.234,56', 123456],
    ['1234,56', 123456],
    ['R$ 1.234,56', 123456],
    ['r$1.234,56', 123456],
    ['  R$ 7,00  ', 700],
    ['-19,99', -1999],
    ['-R$ 19,99', -1999],
    ['R$ -19,99', -1999],
    [',99', 99],
    ['1.000.000', 100000000],
  ])('%j → %i', (text, cents) => {
    expect(parseBRL(text)).toBe(cents);
  });

  it.each([
    [''],
    ['   '],
    ['R$'],
    ['abc'],
    ['12,345'],
    ['1,2,3'],
    ['1.23,00'],
    ['12.34'],
    ['--5'],
    ['5-'],
    ['1e5'],
    ['99999999999999999999'],
  ])('%j → null', (text) => {
    expect(parseBRL(text)).toBeNull();
  });

  it('volta ao mesmo valor que formatBRL escreveu', () => {
    for (const cents of [0, 1, 99, 100, 123456, -1999, 100000000]) {
      expect(parseBRL(formatBRL(cents))).toBe(cents);
    }
  });
});

describe('splitInstallments', () => {
  it('divide sem perder centavo, com a sobra nas primeiras parcelas', () => {
    expect(splitInstallments(10000, 3)).toEqual([3334, 3333, 3333]);
    expect(splitInstallments(10001, 3)).toEqual([3334, 3334, 3333]);
    expect(splitInstallments(9000, 3)).toEqual([3000, 3000, 3000]);
  });

  it('a soma das parcelas é sempre o total', () => {
    for (const [total, n] of [
      [1, 12],
      [99999, 7],
      [123457, 10],
      [5, 5],
    ] as const) {
      const parts = splitInstallments(total, n);
      expect(parts).toHaveLength(n);
      expect(parts.reduce((a, b) => a + b, 0)).toBe(total);
    }
  });

  it('parcela única devolve o total', () => {
    expect(splitInstallments(4590, 1)).toEqual([4590]);
  });

  it('trata total negativo (estorno) espelhando o positivo', () => {
    expect(splitInstallments(-10000, 3)).toEqual([-3334, -3333, -3333]);
  });

  it.each([[0], [-1], [1.5], [INSTALLMENTS_MAX + 1]])('recusa %s parcelas', (n) => {
    expect(() => splitInstallments(10000, n)).toThrow();
  });

  it('aceita até o limite de parcelas', () => {
    expect(splitInstallments(INSTALLMENTS_MAX, INSTALLMENTS_MAX)).toHaveLength(INSTALLMENTS_MAX);
  });

  it('recusa total que não é centavo inteiro', () => {
    expect(() => splitInstallments(10.5, 2)).toThrow();
  });
});

describe('sumCents', () => {
  it('soma centavos e devolve 0 para lista vazia', () => {
    expect(sumCents([])).toBe(0);
    expect(sumCents([100, -30, 5])).toBe(75);
  });

  it('recusa soma que sai do intervalo seguro', () => {
    expect(() => sumCents([Number.MAX_SAFE_INTEGER, 1])).toThrow();
  });

  it('recusa parcela que não é centavo inteiro', () => {
    expect(() => sumCents([1, 0.5])).toThrow();
  });
});
