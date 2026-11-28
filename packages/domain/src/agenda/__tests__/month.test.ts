import { describe, expect, it } from 'vitest';

import { dayDots, monthGrid, shiftMonth } from '../index.ts';

describe('agenda: grade do mês', () => {
  it('nov/2026 tem 35 células e começa no domingo 2026-11-01', () => {
    const g = monthGrid('2026-11', 0);
    expect(g).toHaveLength(35);
    expect(g[0]).toEqual({ date: '2026-11-01', inMonth: true });
    expect(g[29]).toEqual({ date: '2026-11-30', inMonth: true });
    expect(g[30]).toEqual({ date: '2026-12-01', inMonth: false });
    expect(g[34]!.date).toBe('2026-12-05');
  });

  it('ago/2026 tem 42 células, com dias de julho antes', () => {
    const g = monthGrid('2026-08', 0);
    expect(g).toHaveLength(42);
    expect(g[0]).toEqual({ date: '2026-07-26', inMonth: false });
    expect(g[6]).toEqual({ date: '2026-08-01', inMonth: true });
    expect(g[41]!.date).toBe('2026-09-05');
  });

  it('fev/2028 tem 29 dias no mês', () => {
    const g = monthGrid('2028-02', 0);
    expect(g.filter((c) => c.inMonth)).toHaveLength(29);
    expect(g.length % 7).toBe(0);
  });

  it('semana começando na segunda', () => {
    expect(monthGrid('2026-11', 1)[0]).toEqual({ date: '2026-10-26', inMonth: false });
  });

  it('shiftMonth atravessa o ano', () => {
    expect(shiftMonth('2026-12', 1)).toBe('2027-01');
    expect(shiftMonth('2026-01', -1)).toBe('2025-12');
  });
});

describe('agenda: pontos do dia', () => {
  const o = (date: string, module: 'agenda' | 'reminders') => ({ date, module });
  it('um ponto por módulo, na ordem agenda, lembrete, só do dia (dia livre fica sem ponto)', () => {
    const occ = [o('2026-11-26', 'reminders'), o('2026-11-26', 'agenda'), o('2026-11-26', 'agenda'), o('2026-11-27', 'agenda')];
    expect(dayDots('2026-11-26', occ)).toEqual(['agenda', 'reminders']);
    expect(dayDots('2026-11-27', occ)).toEqual(['agenda']);
    expect(dayDots('2026-11-28', occ)).toEqual([]);
  });
});
