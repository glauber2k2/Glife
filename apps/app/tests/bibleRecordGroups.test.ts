import { describe, expect, it } from 'vitest';

import { recordBucket } from '../src/features/bible/components/recordGroups';

const now = new Date(2026, 10, 27, 15, 0);

describe('registros agrupados por período', () => {
  it('hoje, ontem, esta semana (até 6 dias) e antes', () => {
    expect(recordBucket(new Date(2026, 10, 27, 8, 0).toISOString(), now)).toBe('Hoje');
    expect(recordBucket(new Date(2026, 10, 26, 23, 0).toISOString(), now)).toBe('Ontem');
    expect(recordBucket(new Date(2026, 10, 21, 9, 0).toISOString(), now)).toBe('Esta semana');
    expect(recordBucket(new Date(2026, 10, 20, 9, 0).toISOString(), now)).toBe('Antes');
  });
});
