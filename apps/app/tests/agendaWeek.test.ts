import { describe, expect, it } from 'vitest';

import { weekStart } from '../src/features/agenda/components/week';

describe('weekStart', () => {
  it('volta para a segunda-feira da semana', () => {
    expect(weekStart('2026-11-26')).toBe('2026-11-23'); // quinta
    expect(weekStart('2026-11-23')).toBe('2026-11-23'); // segunda
    expect(weekStart('2026-11-29')).toBe('2026-11-23'); // domingo
    expect(weekStart('2026-12-01')).toBe('2026-11-30'); // virada de mês
  });
});
