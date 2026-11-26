import { describe, expect, it } from 'vitest';

import { balanceAdjustment } from '../index.ts';

describe('balanceAdjustment', () => {
  it('sem diferença não há ajuste', () => {
    expect(balanceAdjustment(100, 100)).toBeNull();
  });
  it('banco menor que o app: despesa da diferença', () => {
    expect(balanceAdjustment(1000, 763)).toEqual({ type: 'expense', amount_cents: 237 });
  });
  it('banco maior que o app: receita da diferença', () => {
    expect(balanceAdjustment(1000, 1200)).toEqual({ type: 'income', amount_cents: 200 });
  });
  it('saldo negativo', () => {
    expect(balanceAdjustment(-500, -200)).toEqual({ type: 'income', amount_cents: 300 });
  });
  it('recusa valor que não é inteiro', () => {
    expect(() => balanceAdjustment(100, 10.5)).toThrow(RangeError);
  });
});
