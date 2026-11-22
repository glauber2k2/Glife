import { describe, expect, it } from 'vitest';
import { findBook, formatRef, parseBibleRef, parseOsis, toOsis } from '../index.ts';

const osis = (s: string) => {
  const r = parseBibleRef(s);
  return r ? toOsis(r) : null;
};

describe('findBook', () => {
  it('distingue Jó de João', () => {
    expect(findBook('Jó')?.code).toBe('JOB');
    expect(findBook('Jo')?.code).toBe('JHN');
    expect(findBook('João')?.code).toBe('JHN');
  });
  it('aceita numerais e romanos', () => {
    expect(findBook('1 Co')?.code).toBe('1CO');
    expect(findBook('II Coríntios')?.code).toBe('2CO');
    expect(findBook('1º Samuel')?.code).toBe('1SA');
    expect(findBook('Isaías')?.code).toBe('ISA');
  });
  it('rejeita desconhecidos', () => {
    expect(findBook('Xyz')).toBeUndefined();
  });
});

describe('parseBibleRef → OSIS', () => {
  it.each([
    ['Jo 3:16', 'JHN.3.16'],
    ['Jo 3.16', 'JHN.3.16'],
    ['Jo 3:16-18', 'JHN.3.16-18'],
    ['Jo 3:16-4:2', 'JHN.3.16-4.2'],
    ['Sl 23', 'PSA.23'],
    ['Salmos 23-24', 'PSA.23-24'],
    ['1 Co 13:4-7', '1CO.13.4-7'],
    ['Jó 1:1', 'JOB.1.1'],
    ['Apocalipse 22:21', 'REV.22.21'],
  ])('%s → %s', (input, expected) => {
    expect(osis(input)).toBe(expected);
  });

  it.each(['Jo 22', 'Jo 3:18-16', 'Reunião com pastor', 'Mercado', 'Sl 0'])('rejeita %s', (input) => {
    expect(parseBibleRef(input)).toBeNull();
  });
});

describe('OSIS ida e volta', () => {
  it.each(['JHN.3.16', 'JHN.3.16-18', 'JHN.3.16-4.2', 'PSA.23', 'PSA.23-24'])('%s', (s) => {
    const r = parseOsis(s);
    expect(r).not.toBeNull();
    expect(toOsis(r!)).toBe(s);
  });
  it('formata para exibição', () => {
    expect(formatRef(parseOsis('JHN.3.16-18')!)).toBe('Jo 3:16-18');
    expect(formatRef(parseOsis('PSA.23')!, 'name')).toBe('Salmos 23');
  });
});
