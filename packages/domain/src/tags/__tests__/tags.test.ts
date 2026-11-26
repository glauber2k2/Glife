import { describe, expect, it } from 'vitest';

import { describeTagCounts, tagTotal } from '../index.ts';

const UNITS = { note: ['nota', 'notas'], tx: ['gasto', 'gastos'] } as const;

describe('describeTagCounts', () => {
  it('junta as contagens com singular e plural', () => {
    expect(describeTagCounts({ note: 5, tx: 1 }, UNITS)).toBe('5 notas · 1 gasto');
    expect(describeTagCounts({ note: 1 }, UNITS)).toBe('1 nota');
  });

  it('tipo sem rótulo vira "item" e zeros somem', () => {
    expect(describeTagCounts({ event: 2, note: 0 }, UNITS)).toBe('2 itens');
    expect(describeTagCounts({}, UNITS)).toBe('');
  });

  it('soma o total', () => {
    expect(tagTotal({ note: 5, tx: 6 })).toBe(11);
    expect(tagTotal({})).toBe(0);
  });
});
