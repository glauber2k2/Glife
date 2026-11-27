import { describe, expect, it } from 'vitest';

import { maskToWeekdays, nextHue, paceLabel, shortDate, startDate, weekdaysToMask } from '../src/features/bible/components/planMath';

describe('contas dos planos na interface', () => {
  it('ritmo: capítulos por dia, ou um capítulo a cada N dias', () => {
    expect(paceLabel(87, 30)).toBe('≈ 3 cap./dia');
    expect(paceLabel(1189, 365)).toBe('≈ 3,5 cap./dia');
    expect(paceLabel(89, 89)).toBe('1 cap./dia');
    expect(paceLabel(22, 66)).toBe('1 cap. a cada 3 dias');
  });

  it('início: hoje, amanhã ou a próxima segunda (sexta 27/11/2026)', () => {
    expect(startDate('today', '2026-11-27')).toBe('2026-11-27');
    expect(startDate('tomorrow', '2026-11-27')).toBe('2026-11-28');
    expect(startDate('monday', '2026-11-27')).toBe('2026-11-30');
    expect(startDate('monday', '2026-11-30')).toBe('2026-12-07');
  });

  it('data curta em português', () => {
    expect(shortDate('2026-12-26')).toBe('26 de dez.');
  });

  it('cor do próximo plano: a primeira da paleta ainda não usada; todas usadas, recomeça', () => {
    expect(nextHue([])).toBe(350);
    expect(nextHue([350, 25])).toBe(130);
    expect(nextHue([350, 25, 130, 205, 260, 305])).toBe(350);
  });

  it('dias da semana entre lista e máscara de bits', () => {
    expect(weekdaysToMask([0, 1, 6])).toBe(0b1000011);
    expect(maskToWeekdays(0b0111110)).toEqual([1, 2, 3, 4, 5]);
  });
});
