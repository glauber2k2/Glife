import { describe, expect, it } from 'vitest';

import {
  BIOMETRIC_SENTINEL_KEY,
  biometricErrorOutcome,
  createDeviceBiometrics,
  type BiometricBackend,
} from '../src/features/app-lock/data/deviceBiometricsCore';

function fakeBackend(over: Partial<BiometricBackend> = {}) {
  const items = new Map<string, string>();
  const backend: BiometricBackend = {
    hasStrongBiometrics: async () => true,
    setItem: async (k, v) => void items.set(k, v),
    getItem: async (k) => items.get(k) ?? null,
    deleteItem: async (k) => void items.delete(k),
    randomToken: () => 'tok',
    ...over,
  };
  return { backend, items };
}

describe('biometricErrorOutcome', () => {
  it('cancelamento do usuário (Android e iOS) vira cancel; o resto vira error', () => {
    expect(biometricErrorOutcome(new Error('User canceled the authentication'))).toBe('cancel');
    expect(biometricErrorOutcome(new Error('User canceled the operation.'))).toBe('cancel');
    expect(biometricErrorOutcome(new Error('Authentication was cancelled'))).toBe('cancel');
    expect(biometricErrorOutcome(new Error('Too many attempts'))).toBe('error');
    expect(biometricErrorOutcome('x')).toBe('error');
  });
});

describe('createDeviceBiometrics', () => {
  it('arm grava a sentinela; verify confirma lendo-a', async () => {
    const { backend, items } = fakeBackend();
    const bio = createDeviceBiometrics(backend);
    expect(await bio.arm()).toBe('ok');
    expect(items.get(BIOMETRIC_SENTINEL_KEY)).toBe('tok');
    expect(await bio.verify()).toBe('ok');
  });

  it('sentinela invalidada (lê null) = digital nova', async () => {
    const { backend, items } = fakeBackend();
    const bio = createDeviceBiometrics(backend);
    await bio.arm();
    items.clear();
    expect(await bio.verify()).toBe('changed');
  });

  it('diálogo cancelado ou com erro não derruba: vira resultado', async () => {
    const cancel = createDeviceBiometrics(
      fakeBackend({
        getItem: async () => {
          throw new Error('User canceled the authentication');
        },
        setItem: async () => {
          throw new Error('User canceled the authentication');
        },
      }).backend,
    );
    expect(await cancel.verify()).toBe('cancel');
    expect(await cancel.arm()).toBe('cancel');
  });

  it('sem biometria forte: indisponível, sem diálogo', async () => {
    let calls = 0;
    const bio = createDeviceBiometrics(
      fakeBackend({
        hasStrongBiometrics: async () => false,
        getItem: async () => {
          calls++;
          return 'tok';
        },
      }).backend,
    );
    expect(await bio.available()).toBe(false);
    expect(await bio.verify()).toBe('unavailable');
    expect(await bio.arm()).toBe('unavailable');
    expect(calls).toBe(0);
  });

  it('desarmar ignora falha (o registro do bloqueio é quem manda)', async () => {
    const bio = createDeviceBiometrics(
      fakeBackend({
        deleteItem: async () => {
          throw new Error('User canceled the authentication');
        },
      }).backend,
    );
    await expect(bio.disarm()).resolves.toBeUndefined();
  });
});
