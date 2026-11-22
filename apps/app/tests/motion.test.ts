import { describe, expect, it } from 'vitest';

import { resolveSpring } from '../src/shared/ui/motion';
import { spring } from '../src/shared/ui/theme/tokens';

describe('resolveSpring', () => {
  it.each(['standard', 'snappy'] as const)('usa a mola %s dos tokens', (kind) => {
    expect(resolveSpring(kind, false)).toEqual(spring[kind]);
  });

  it.each(['standard', 'snappy'] as const)('desliga a mola %s ao reduzir movimento', (kind) => {
    expect(resolveSpring(kind, true)).toBeNull();
  });

  it.each(['standard', 'snappy'] as const)('mantém a mola %s amortecida e entre 200–350 ms', (kind) => {
    const config = resolveSpring(kind, false)!;
    expect(config.duration).toBeGreaterThanOrEqual(200);
    expect(config.duration).toBeLessThanOrEqual(350);
    expect(config.dampingRatio).toBeGreaterThanOrEqual(1);
    expect(config.overshootClamping).toBe(true);
  });
});
