import { describe, expect, it } from 'vitest';

import { dayTime, parseQuantity, pctSigned, quantityText, shareText } from '../src/features/finance/components/investmentFormat';

describe('textos de investimento', () => {
  it('percentual com sinal e duas casas', () => {
    expect(pctSigned(0.091571)).toBe('+9,16%');
    expect(pctSigned(-0.19686)).toBe('−19,69%');
    expect(pctSigned(0)).toBe('+0,00%');
    expect(pctSigned(12.3456)).toBe('+1.234,56%');
  });

  it('participação com uma casa', () => {
    expect(shareText(0.4123)).toBe('41,2%');
    expect(shareText(1)).toBe('100,0%');
  });

  it('quantidade sem zeros sobrando', () => {
    expect(quantityText(100 * 1e8)).toBe('100');
    expect(quantityText(12_345)).toBe('0,00012345');
    expect(quantityText(1_234_567 * 1e8 + 50_000_000)).toBe('1.234.567,5');
  });

  it('lê a quantidade digitada (vírgula ou ponto decimal; até 8 casas)', () => {
    expect(parseQuantity('100')).toBe(100 * 1e8);
    expect(parseQuantity('0,00012345')).toBe(12_345);
    expect(parseQuantity('0.5')).toBe(50_000_000);
    expect(parseQuantity('1.234,5')).toBe(123_450_000_000);
    expect(parseQuantity('0.123')).toBe(12_300_000);
    expect(parseQuantity('0.001')).toBe(100_000);
    expect(parseQuantity('1.500')).toBe(1_500 * 1e8);
    expect(parseQuantity('0,000000001')).toBeNull();
    expect(parseQuantity('')).toBeNull();
    expect(parseQuantity('0')).toBeNull();
    expect(parseQuantity('abc')).toBeNull();
  });

  it('dia e hora locais da cotação', () => {
    const at = new Date(2026, 10, 25, 9, 7).toISOString();
    expect(dayTime(at)).toBe('25/11 09:07');
    expect(dayTime('2026-11-25 12:07:00+00')).toMatch(/^25\/11 \d\d:07$/);
  });
});
