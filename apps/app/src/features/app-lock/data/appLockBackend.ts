// Android/iOS: SecureStore (Keystore). O registro tem < 1 KB, cabe numa chave só.
import * as SecureStore from 'expo-secure-store';

import type { AsyncKeyValue } from '@/shared/lib/chunkedStorage';

export const appLockBackend: AsyncKeyValue = {
  getItem: (k) => SecureStore.getItemAsync(k),
  setItem: (k, v) => SecureStore.setItemAsync(k, v),
  removeItem: (k) => SecureStore.deleteItemAsync(k),
};
