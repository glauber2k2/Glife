import { describe, expect, it } from 'vitest';

import { installmentAmount } from '../money.ts';

describe('entrada do valor de uma compra parcelada', () => {
  it('divide o total preservando cada centavo', () => {
    expect(installmentAmount(10001, 3, 'total')).toEqual({ totalCents: 10001, amounts: [3334, 3334, 3333] });
  });

  it('valor unitário gera parcelas iguais e o total completo', () => {
    expect(installmentAmount(10001, 3, 'installment')).toEqual({ totalCents: 30003, amounts: [10001, 10001, 10001] });
  });

  it('à vista os dois modos representam o mesmo valor', () => {
    expect(installmentAmount(10001, 1, 'total')).toEqual({ totalCents: 10001, amounts: [10001] });
    expect(installmentAmount(10001, 1, 'installment')).toEqual({ totalCents: 10001, amounts: [10001] });
  });

  it('aceita campo vazio representado por zero sem criar valor artificial', () => {
    expect(installmentAmount(0, 3, 'installment')).toEqual({ totalCents: 0, amounts: [0, 0, 0] });
  });

  it.each([0, 121, 1.5])('recusa quantidade inválida: %s', (count) => {
    expect(() => installmentAmount(100, count, 'installment')).toThrow(RangeError);
    expect(() => installmentAmount(100, count, 'total')).toThrow(RangeError);
  });

  it.each([-100, 1.5, Number.NaN, Number.POSITIVE_INFINITY])('recusa valor inválido: %s', (cents) => {
    expect(() => installmentAmount(cents, 3, 'total')).toThrow(RangeError);
    expect(() => installmentAmount(cents, 3, 'installment')).toThrow(RangeError);
  });

  it('recusa multiplicação que ultrapassa centavos inteiros seguros', () => {
    expect(() => installmentAmount(Number.MAX_SAFE_INTEGER, 2, 'installment')).toThrow(RangeError);
    expect(installmentAmount(Number.MAX_SAFE_INTEGER, 1, 'installment').totalCents).toBe(Number.MAX_SAFE_INTEGER);
  });
});
