import { describe, expect, it } from 'vitest';

import { ALL_WEEKDAYS, addDays, occurrenceDates, shiftMinutes, upcomingNotices, weekdayBit, weekdayOf, type RepeatRule } from '../index.ts';

const rule = (r: Partial<RepeatRule>): RepeatRule => ({
  start_date: '2026-11-02',
  frequency: 'none',
  interval_count: 1,
  weekdays: 0,
  until: null,
  skipped_dates: [],
  ...r,
});

describe('tempo de calendário', () => {
  it('dias e dia da semana', () => {
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(weekdayOf('2026-11-25')).toBe(3); // quarta
    expect(shiftMinutes('2026-11-25', '00:10', -30)).toEqual({ date: '2026-11-24', time: '23:40' });
  });
});

describe('repetição', () => {
  it('única só no dia do início', () => {
    expect(occurrenceDates(rule({}), '2026-11-01', '2026-11-30')).toEqual(['2026-11-02']);
    expect(occurrenceDates(rule({}), '2026-11-03', '2026-11-30')).toEqual([]);
  });

  it('diária a cada 3 dias, a partir de uma data no meio', () => {
    expect(occurrenceDates(rule({ frequency: 'daily', interval_count: 3 }), '2026-11-06', '2026-11-12')).toEqual(['2026-11-08', '2026-11-11']);
  });

  it('semanal em segunda e quarta, a cada 2 semanas, com data pulada e fim', () => {
    const r = rule({
      frequency: 'weekly',
      interval_count: 2,
      weekdays: weekdayBit(1) | weekdayBit(3),
      skipped_dates: ['2026-11-16'],
      until: '2026-11-30',
    });
    expect(occurrenceDates(r, '2026-11-01', '2026-12-31')).toEqual(['2026-11-02', '2026-11-04', '2026-11-18', '2026-11-30']);
  });

  it('mensal no dia 31 cai no último dia dos meses curtos', () => {
    expect(occurrenceDates(rule({ start_date: '2026-01-31', frequency: 'monthly' }), '2026-02-01', '2026-04-30')).toEqual([
      '2026-02-28',
      '2026-03-31',
      '2026-04-30',
    ]);
  });

  it('anual em 29/02 vira 28/02 nos anos comuns', () => {
    expect(occurrenceDates(rule({ start_date: '2028-02-29', frequency: 'yearly' }), '2029-01-01', '2032-12-31')).toEqual([
      '2029-02-28',
      '2030-02-28',
      '2031-02-28',
      '2032-02-29',
    ]);
  });

  it('semanal sem dias marcados usa o dia do início', () => {
    expect(occurrenceDates(rule({ frequency: 'weekly', weekdays: 0 }), '2026-11-01', '2026-11-15')).toEqual(['2026-11-02', '2026-11-09']);
    expect(ALL_WEEKDAYS).toBe(127);
  });
});

describe('avisos', () => {
  it('só os futuros, os mais próximos primeiro, até o limite', () => {
    const n = (key: string, date: string, time: string) => ({ key, title: key, body: '', date, time, url: '/' });
    const list = [n('c', '2026-11-26', '08:00'), n('a', '2026-11-25', '09:00'), n('b', '2026-11-25', '10:00'), n('z', '2026-11-25', '07:00')];
    expect(upcomingNotices(list, { date: '2026-11-25', time: '08:00' }, 2).map((x) => x.key)).toEqual(['a', 'b']);
  });
});
