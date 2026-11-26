import { describe, expect, it } from 'vitest';

import { resolveSpring } from '../src/shared/ui/motion';
import { spring } from '../src/shared/ui/theme/tokens';

const KINDS = ['tap', 'standard', 'emphasis', 'gentle'] as const;

describe('resolveSpring', () => {
  it.each(KINDS)('usa a mola %s dos tokens', (kind) => {
    expect(resolveSpring(kind, false)).toEqual(spring[kind]);
  });

  it.each(KINDS)('desliga a mola %s ao reduzir movimento', (kind) => {
    expect(resolveSpring(kind, true)).toBeNull();
  });

  it.each(KINDS)('mantém a mola %s curta e gentil (300–400 ms), no máximo um leve passar do ponto', (kind) => {
    const config = resolveSpring(kind, false)!;
    expect(config.duration).toBeGreaterThanOrEqual(300);
    expect(config.duration).toBeLessThanOrEqual(400);
    expect(config.dampingRatio).toBeGreaterThanOrEqual(0.7);
    expect(config.dampingRatio).toBeLessThan(1);
  });

  it('segue as molas do Cobalto (volta do toque em 380 ms)', () => {
    expect(spring.tap).toEqual({ duration: 380, dampingRatio: 0.72 });
    expect(spring.standard).toEqual({ duration: 340, dampingRatio: 0.9 });
    expect(spring.emphasis).toEqual({ duration: 400, dampingRatio: 0.82 });
    expect(spring.gentle).toEqual({ duration: 300, dampingRatio: 0.95 });
  });
});
