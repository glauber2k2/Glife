import { describe, expect, it } from 'vitest';

import { snap, valueAt } from '../src/shared/ui/sliderMath';

describe('controle deslizante: passo e posição', () => {
  it('arredonda ao passo e prende na faixa', () => {
    expect(snap(1.93, 1.6, 2.4, 0.05)).toBe(1.95);
    expect(snap(30, 15, 26, 1)).toBe(26);
    expect(snap(-5, -2, 10, 1)).toBe(-2);
    expect(snap(18.4, 15, 26, 1)).toBe(18);
  });

  it('posição do toque no trilho vira valor no passo', () => {
    expect(valueAt(0, 200, 15, 26, 1)).toBe(15);
    expect(valueAt(200, 200, 15, 26, 1)).toBe(26);
    expect(valueAt(100, 200, 1.6, 2.4, 0.05)).toBe(2);
    expect(valueAt(-30, 200, 15, 26, 1)).toBe(15);
    expect(valueAt(50, 0, 15, 26, 1)).toBe(15);
  });
});
