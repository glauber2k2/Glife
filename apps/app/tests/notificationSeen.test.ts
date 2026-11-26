import { describe, expect, it } from 'vitest';

import { createSeenStore, parseSeenUntil } from '../src/shared/lib/seenStore';
import type { KeyValueStorage } from '../src/shared/lib/moneyVisibilityStore';

function memoryStorage(initial: Record<string, string> = {}): KeyValueStorage & { data: Record<string, string> } {
  const data = { ...initial };
  return {
    data,
    getItem: async (k) => data[k] ?? null,
    setItem: async (k, v) => {
      data[k] = v;
    },
  };
}

describe('parseSeenUntil', () => {
  it('lê só instante ISO válido', () => {
    expect(parseSeenUntil('2026-11-26T13:00:00.000Z')).toEqual(new Date('2026-11-26T13:00:00.000Z'));
    for (const bad of [null, '', 'ontem', '2026-13-40T99:00:00Z', '1']) expect(parseSeenUntil(bad)).toBeNull();
  });
});

describe('createSeenStore', () => {
  it('guarda e lê o "visto até"', async () => {
    const storage = memoryStorage();
    const store = createSeenStore(storage);
    expect(await store.load()).toBeNull();
    await store.save(new Date('2026-11-26T13:00:00.000Z'));
    expect(await store.load()).toEqual(new Date('2026-11-26T13:00:00.000Z'));
  });

  it('falha do armazenamento não derruba: lê null e grava em silêncio', async () => {
    const broken: KeyValueStorage = {
      getItem: async () => {
        throw new Error('x');
      },
      setItem: async () => {
        throw new Error('x');
      },
    };
    const store = createSeenStore(broken);
    expect(await store.load()).toBeNull();
    await expect(store.save(new Date())).resolves.toBeUndefined();
  });
});
