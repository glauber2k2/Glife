// Composição do bloqueio no aparelho: regras do domain + scrypt + armazenamento seguro.
import { createAppLock, type AppLock } from '@glife/domain/applock';
import * as Crypto from 'expo-crypto';

import { appLockBackend } from './appLockBackend';
import { createAppLockStore } from './appLockStore';
import { createScryptHasher } from './scryptHasher';
import { scryptKdf } from './scryptKdf';

export function createDeviceAppLock(): AppLock {
  return createAppLock({
    store: createAppLockStore(appLockBackend),
    hasher: createScryptHasher({ kdf: scryptKdf, randomBytes: (n) => Crypto.getRandomBytes(n) }),
  });
}
