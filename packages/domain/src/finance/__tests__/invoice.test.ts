import { describe, expect, it } from 'vitest';

import {
  addDays,
  addMonths,
  compareDates,
  dateInMonth,
  invoiceDates,
  invoiceMonthFor,
  isoDateSchema,
  monthOf,
  monthSchema,
  type CardCycle,
} from '../index.ts';

const A: CardCycle = { closing_day: 3, due_day: 10 };
const B: CardCycle = { closing_day: 25, due_day: 5 };
const C: CardCycle = { closing_day: 31, due_day: 10 };

describe('calendário', () => {
  it('limita o dia ao fim do mês', () => {
    expect(dateInMonth('2027-02', 31)).toBe('2027-02-28');
    expect(dateInMonth('2028-02', 30)).toBe('2028-02-29');
    expect(dateInMonth('2026-04', 31)).toBe('2026-04-30');
  });

  it('soma meses atravessando o ano', () => {
    expect(addMonths('2026-12', 1)).toBe('2027-01');
    expect(addMonths('2027-01', -1)).toBe('2026-12');
    expect(addMonths('2026-11', 14)).toBe('2028-01');
  });

  it('soma dias e compara datas', () => {
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2027-03-01', -1)).toBe('2027-02-28');
    expect(compareDates('2026-11-24', '2026-11-25')).toBeLessThan(0);
    expect(compareDates('2026-11-24', '2026-11-24')).toBe(0);
    expect(monthOf('2026-11-24')).toBe('2026-11');
  });

  it('valida datas e meses', () => {
    expect(monthSchema.safeParse('2026-13').success).toBe(false);
    expect(monthSchema.safeParse('2026-12').success).toBe(true);
    expect(isoDateSchema.safeParse('2026-02-30').success).toBe(false);
    expect(isoDateSchema.safeParse('2028-02-29').success).toBe(true);
    expect(isoDateSchema.safeParse('2026-1-05').success).toBe(false);
  });
});

describe('invoiceMonthFor', () => {
  it('fecha 3, vence 10: compra no dia do fechamento vai para a fatura seguinte', () => {
    expect(invoiceMonthFor('2026-11-28', A)).toBe('2026-12');
    expect(invoiceMonthFor('2026-12-02', A)).toBe('2026-12');
    expect(invoiceMonthFor('2026-12-03', A)).toBe('2027-01');
  });

  it('fecha 25, vence 5 (vencimento no mês seguinte ao fechamento)', () => {
    expect(invoiceMonthFor('2026-11-20', B)).toBe('2026-12');
    expect(invoiceMonthFor('2026-11-25', B)).toBe('2027-01');
  });

  it('fecha 31 em fevereiro', () => {
    expect(invoiceMonthFor('2027-02-27', C)).toBe('2027-03');
    expect(invoiceMonthFor('2027-02-28', C)).toBe('2027-04');
  });
});

describe('invoiceDates', () => {
  it('devolve fechamento e vencimento da fatura', () => {
    expect(invoiceDates('2026-12', A)).toEqual({ closingDate: '2026-12-03', dueDate: '2026-12-10' });
    expect(invoiceDates('2027-01', B)).toEqual({ closingDate: '2026-12-25', dueDate: '2027-01-05' });
  });

  it.each([
    ['A', A],
    ['B', B],
    ['C', C],
  ])('cartão %s: toda compra fecha depois dela e depois do fechamento anterior', (_, card) => {
    let d = '2026-11-01';
    for (let i = 0; i < 60; i++) {
      const month = invoiceMonthFor(d, card);
      const { closingDate } = invoiceDates(month, card);
      const previous = invoiceDates(addMonths(month, -1), card).closingDate;
      expect(compareDates(closingDate, d)).toBeGreaterThan(0);
      expect(compareDates(previous, d)).toBeLessThanOrEqual(0);
      d = addDays(d, 1);
    }
  });
});
