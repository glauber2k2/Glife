import type { AppLockRecord } from '@glife/domain/applock';
import { describe, expect, it } from 'vitest';

import { APP_LOCK_KEY, createAppLockStore } from '../src/features/app-lock/data/appLockStore';
import type { AsyncKeyValue } from '../src/shared/lib/chunkedStorage';

function memory(): AsyncKeyValue & { data: Map<string, string> } {
  const data = new Map<string, string>();
  return {
    data,
    getItem: async (k) => data.get(k) ?? null,
    setItem: async (k, v) => void data.set(k, v),
    removeItem: async (k) => void data.delete(k),
  };
}

const record: AppLockRecord = {
  v: 1,
  digest: { kdf: { algo: 'scrypt', N: 1024, r: 8, p: 1, dkLen: 32 }, salt: 'c2Fs', hash: 'aGFzaA==' },
  failures: 2,
  blockedUntil: null,
  requireAccount: false,
  biometrics: true,
  mustUsePassword: false,
  timeoutMs: 60_000,
};

describe('loja do bloqueio', () => {
  it('vazia devolve null; guarda e lê de volta igual', async () => {
    const store = createAppLockStore(memory());
    expect(await store.load()).toBeNull();
    await store.save(record);
    expect(await store.load()).toEqual(record);
  });

  it('apaga', async () => {
    const backend = memory();
    const store = createAppLockStore(backend);
    await store.save(record);
    await store.clear();
    expect(backend.data.has(APP_LOCK_KEY)).toBe(false);
  });

  it('registro corrompido não vira "sem senha" (isso liberaria criar outra): recusa', async () => {
    const backend = memory();
    backend.data.set(APP_LOCK_KEY, '{"v":1,"lixo":true}');
    await expect(createAppLockStore(backend).load()).rejects.toMatchObject({ code: 'unavailable' });
  });
});
