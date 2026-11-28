import { describe, expect, it } from 'vitest';

import { AI_DEFAULT_CAP_CENTS, costMicroUsd, isDeepSeekPeak, microUsdToBrlCents, parseUsdBrl } from '../index.ts';

const PEAK = new Date('2026-11-30T02:00:00Z'); // segunda, 02:00 UTC
const OFF = new Date('2026-11-30T05:00:00Z'); // segunda, 05:00 UTC

describe('horário de pico do DeepSeek', () => {
  it('pico só de segunda a sexta, 01–04 e 06–10 UTC', () => {
    expect(isDeepSeekPeak(PEAK)).toBe(true);
    expect(isDeepSeekPeak(OFF)).toBe(false);
    expect(isDeepSeekPeak(new Date('2026-11-30T09:59:00Z'))).toBe(true);
    expect(isDeepSeekPeak(new Date('2026-11-30T10:00:00Z'))).toBe(false);
    expect(isDeepSeekPeak(new Date('2026-11-28T02:00:00Z'))).toBe(false); // sábado
  });
});

describe('custo de uma chamada', () => {
  const million = { cacheHitTokens: 1_000_000, cacheMissTokens: 1_000_000, outputTokens: 1_000_000 };

  it('usa a tabela oficial do deepseek-flash, metade fora do pico', () => {
    expect(costMicroUsd(million, PEAK)).toBe(1_506_000);
    expect(costMicroUsd(million, OFF)).toBe(753_000);
  });

  it('arredonda para cima', () => {
    expect(costMicroUsd({ cacheHitTokens: 0, cacheMissTokens: 1, outputTokens: 0 }, PEAK)).toBe(1);
  });
});

describe('conversão para reais', () => {
  it('converte micro-dólares em centavos arredondando para cima', () => {
    expect(microUsdToBrlCents(1_000_000, 5.4)).toBe(540);
    expect(microUsdToBrlCents(1, 5.4)).toBe(1);
    expect(microUsdToBrlCents(0, 5.4)).toBe(0);
  });

  it('lê a cotação do secret com ponto ou vírgula e recusa valor sem sentido', () => {
    expect(parseUsdBrl('5,40')).toBe(5.4);
    expect(parseUsdBrl(' 5.40 ')).toBe(5.4);
    expect(parseUsdBrl('0')).toBeNull();
    expect(parseUsdBrl('abc')).toBeNull();
    expect(parseUsdBrl('150')).toBeNull();
    expect(parseUsdBrl(null)).toBeNull();
  });

  it('teto padrão de R$ 20,00', () => {
    expect(AI_DEFAULT_CAP_CENTS).toBe(2000);
  });
});
