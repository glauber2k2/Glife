// Registro do bloqueio (hash da senha, erros, preferências) numa chave do armazenamento seguro.
// O meio de guardar vem de fora: SecureStore (Keystore) no Android, localStorage no web (ver appLockBackend).
import { appLockRecordSchema, type AppLockStore } from '@glife/domain/applock';
import { RepositoryError } from '@glife/domain/core';

import type { AsyncKeyValue } from '@/shared/lib/chunkedStorage';

export const APP_LOCK_KEY = 'glife.applock.v1';

export function createAppLockStore(backend: AsyncKeyValue): AppLockStore {
  return {
    async load() {
      const raw = await backend.getItem(APP_LOCK_KEY);
      if (raw === null) return null;
      // Corrompido nunca vira "sem senha": isso deixaria criar outra por cima. A saída é o login da conta.
      try {
        return appLockRecordSchema.parse(JSON.parse(raw));
      } catch (e) {
        throw new RepositoryError('unavailable', { cause: e });
      }
    },
    async save(record) {
      await backend.setItem(APP_LOCK_KEY, JSON.stringify(appLockRecordSchema.parse(record)));
    },
    async clear() {
      await backend.removeItem(APP_LOCK_KEY);
    },
  };
}
