// Web: localStorage (o navegador não tem Keystore). Guarda só o hash scrypt, nunca a senha.
import type { AsyncKeyValue } from '@/shared/lib/chunkedStorage';

export const appLockBackend: AsyncKeyValue = {
  getItem: async (k) => globalThis.localStorage?.getItem(k) ?? null,
  setItem: async (k, v) => globalThis.localStorage?.setItem(k, v),
  removeItem: async (k) => globalThis.localStorage?.removeItem(k),
};
