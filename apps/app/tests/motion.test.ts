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

  it.each(KINDS)('mantém a mola %s amortecida, sem quique, entre 200–350 ms', (kind) => {
    const config = resolveSpring(kind, false)!;
    expect(config.duration).toBeGreaterThanOrEqual(200);
    expect(config.duration).toBeLessThanOrEqual(350);
    expect(config.dampingRatio).toBeGreaterThanOrEqual(0.8);
    expect(config.dampingRatio).toBeLessThan(1);
  });

  it('segue as quatro molas do design system', () => {
    expect(spring.tap).toEqual({ duration: 200, dampingRatio: 0.9 });
    expect(spring.standard).toEqual({ duration: 300, dampingRatio: 0.85 });
    expect(spring.emphasis).toEqual({ duration: 350, dampingRatio: 0.82 });
    expect(spring.gentle).toEqual({ duration: 320, dampingRatio: 0.95 });
  });
});
