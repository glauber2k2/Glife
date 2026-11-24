import { describe, expect, it } from 'vitest';

import { nextDayOfMonth } from '../calendar.ts';

describe('nextDayOfMonth', () => {
  it('fica no mesmo mês quando o dia ainda não passou', () => {
    expect(nextDayOfMonth('2026-11-24', 28)).toBe('2026-11-28');
  });
  it('o próprio dia conta', () => {
    expect(nextDayOfMonth('2026-11-24', 24)).toBe('2026-11-24');
  });
  it('vai para o mês seguinte quando o dia já passou', () => {
    expect(nextDayOfMonth('2026-11-24', 10)).toBe('2026-12-10');
    expect(nextDayOfMonth('2026-12-24', 5)).toBe('2027-01-05');
  });
  it('dia inexistente vira o último dia do mês', () => {
    expect(nextDayOfMonth('2026-02-10', 31)).toBe('2026-02-28');
    expect(nextDayOfMonth('2026-01-31', 30)).toBe('2026-02-28');
  });
  it('recusa dia fora de 1 a 31', () => {
    expect(() => nextDayOfMonth('2026-11-24', 0)).toThrow(RangeError);
    expect(() => nextDayOfMonth('2026-11-24', 32)).toThrow(RangeError);
  });
});
