import { describe, expect, it } from 'vitest';

import {
  balance,
  dayLabel,
  digitsToCents,
  lateText,
  longDay,
  money,
  monthName,
  parseDmy,
  relativeDay,
  signed,
} from '../src/features/finance/components/format';

describe('formatação de Finanças', () => {
  it('dinheiro com sinal tipográfico', () => {
    expect(money(123456)).toBe('R$ 1.234,56');
    expect(money(-1999)).toBe('R$ 19,99');
    expect(signed(-1999)).toBe('− R$ 19,99');
    expect(signed(500000)).toBe('+ R$ 5.000,00');
    expect(signed(0)).toBe('R$ 0,00');
    expect(balance(-1000)).toBe('− R$ 10,00');
  });

  it('teclado em centavos', () => {
    expect(digitsToCents('R$ 2.399,00')).toBe(239900);
    expect(digitsToCents('')).toBe(0);
    expect(digitsToCents('00012')).toBe(12);
  });

  it('datas', () => {
    expect(parseDmy('10/12/2026')).toBe('2026-12-10');
    expect(parseDmy('31/02/2026')).toBeNull();
    expect(parseDmy('1/1/2027')).toBe('2027-01-01');
    expect(dayLabel('2026-12-10', '2026-12-10')).toBe('Hoje, 10/12');
    expect(dayLabel('2026-12-09', '2026-12-10')).toBe('Ontem, 09/12');
    expect(dayLabel('2027-01-05', '2026-12-10')).toBe('05/01/2027');
    expect(longDay('2026-12-10')).toBe('Quinta-feira, 10 de dezembro');
    expect(lateText('2026-12-08', '2026-12-10')).toBe('Atrasado há 2 dias');
    expect(lateText('2026-12-09', '2026-12-10')).toBe('Atrasado há 1 dia');
  });

  it('nome do mês ganha o ano só quando está longe', () => {
    expect(monthName('2027-01', '2026-12-10')).toBe('janeiro');
    expect(monthName('2028-01', '2026-12-10')).toBe('janeiro de 2028');
  });
});

describe('dica do campo de data', () => {
  it('diz Hoje, Ontem ou Amanhã; nos outros dias a própria data basta', () => {
    expect(relativeDay('2026-12-10', '2026-12-10')).toBe('Hoje');
    expect(relativeDay('2026-12-09', '2026-12-10')).toBe('Ontem');
    expect(relativeDay('2026-12-11', '2026-12-10')).toBe('Amanhã');
    expect(relativeDay('2026-12-01', '2026-12-10')).toBeUndefined();
  });
});
