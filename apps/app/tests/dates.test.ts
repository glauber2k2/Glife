import { describe, expect, it } from 'vitest';

import { shortStamp } from '../src/shared/lib/dates';

// Datas em horário local, para o teste não depender do fuso da máquina.
const now = new Date(2026, 10, 23, 15, 0);
const at = (y: number, m: number, d: number, h = 9, min = 5) => new Date(y, m, d, h, min).toISOString();

describe('data curta das listas', () => {
  it('hoje mostra a hora', () => {
    expect(shortStamp(at(2026, 10, 23, 14, 30), now)).toBe('14:30');
  });

  it('ontem mostra "ontem"', () => {
    expect(shortStamp(at(2026, 10, 22), now)).toBe('ontem');
  });

  it('no mesmo ano mostra dia/mês', () => {
    expect(shortStamp(at(2026, 0, 5), now)).toBe('05/01');
  });

  it('em outro ano mostra dia/mês/ano', () => {
    expect(shortStamp(at(2025, 11, 31), now)).toBe('31/12/2025');
  });
});
