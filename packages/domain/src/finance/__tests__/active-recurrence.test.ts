import { describe, expect, it } from 'vitest';

import { isRecurrenceActive } from '../overview.ts';

const rule = (end_date: string | null) => ({ end_date });

describe('isRecurrenceActive', () => {
  const today = '2026-11-24';
  it('sem fim é ativa', () => {
    expect(isRecurrenceActive(rule(null), today)).toBe(true);
  });
  it('encerrada "depois deste mês" sai das ativas', () => {
    expect(isRecurrenceActive(rule('2026-11-30'), today)).toBe(false);
  });
  it('encerrada "já neste mês" sai das ativas', () => {
    expect(isRecurrenceActive(rule('2026-11-09'), today)).toBe(false);
  });
  it('com fim em mês futuro continua ativa', () => {
    expect(isRecurrenceActive(rule('2026-12-01'), today)).toBe(true);
  });
  it('com fim no passado não é ativa', () => {
    expect(isRecurrenceActive(rule('2026-10-31'), today)).toBe(false);
  });
});
