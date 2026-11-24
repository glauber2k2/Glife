import { describe, expect, it } from 'vitest';

import {
  createAppLock,
  disableBiometrics,
  enableBiometrics,
  tryBiometricUnlock,
  unlockWithPasswordAndRearm,
  type AppLockRecord,
  type BiometricOutcome,
  type DeviceBiometrics,
  type PasswordHasher,
} from '../index.ts';

const fakeHasher: PasswordHasher = {
  async hash(password) {
    return { kdf: { algo: 'scrypt', N: 2, r: 1, p: 1, dkLen: 8 }, salt: 'c2Fs', hash: `h(${password})` };
  },
  async verify(password, digest) {
    return digest.hash === `h(${password})`;
  },
};

/** Biometria falsa: `armed` imita a sentinela; `enroll()` imita uma digital nova (invalida a sentinela). */
function fakeBiometrics(opts: { available?: boolean } = {}) {
  const state = { armed: false, invalidated: false, next: 'ok' as BiometricOutcome, calls: [] as string[] };
  const bio: DeviceBiometrics = {
    async available() {
      return opts.available ?? true;
    },
    async arm() {
      state.calls.push('arm');
      if (state.next !== 'ok') return state.next;
      state.armed = true;
      state.invalidated = false;
      return 'ok';
    },
    async verify() {
      state.calls.push('verify');
      if (state.invalidated) return 'changed';
      return state.next;
    },
    async disarm() {
      state.calls.push('disarm');
      state.armed = false;
    },
  };
  return { bio, state, enroll: () => void (state.invalidated = true) };
}

async function setup(opts?: { available?: boolean }) {
  let saved: AppLockRecord | null = null;
  const lock = createAppLock({
    store: {
      load: async () => saved,
      save: async (r) => void (saved = structuredClone(r)),
      clear: async () => void (saved = null),
    },
    hasher: fakeHasher,
    now: () => 1_000_000,
  });
  await lock.setPassword('segredo1');
  return { lock, ...fakeBiometrics(opts) };
}

describe('ligar e desligar a biometria', () => {
  it('liga só depois que o aparelho confirmou (sentinela criada)', async () => {
    const { lock, bio, state } = await setup();
    expect(await enableBiometrics(lock, bio)).toBe('ok');
    expect(state.armed).toBe(true);
    expect((await lock.status()).biometrics).toBe(true);
  });

  it('cancelar ao ligar deixa desligada', async () => {
    const { lock, bio, state } = await setup();
    state.next = 'cancel';
    expect(await enableBiometrics(lock, bio)).toBe('cancel');
    expect((await lock.status()).biometrics).toBe(false);
  });

  it('aparelho sem biometria não liga nem chama o diálogo', async () => {
    const { lock, bio, state } = await setup({ available: false });
    expect(await enableBiometrics(lock, bio)).toBe('unavailable');
    expect(state.calls).toEqual([]);
    expect((await lock.status()).biometrics).toBe(false);
  });

  it('desligar apaga a sentinela', async () => {
    const { lock, bio, state } = await setup();
    await enableBiometrics(lock, bio);
    await disableBiometrics(lock, bio);
    expect(state.armed).toBe(false);
    expect((await lock.status()).biometrics).toBe(false);
  });
});

describe('tryBiometricUnlock', () => {
  it('biometria desligada: vai direto para a senha, sem diálogo', async () => {
    const { lock, bio, state } = await setup();
    expect(await tryBiometricUnlock(lock, bio)).toEqual({ kind: 'password', reason: 'off' });
    expect(state.calls).toEqual([]);
  });

  it('confirmada: desbloqueia', async () => {
    const { lock, bio } = await setup();
    await enableBiometrics(lock, bio);
    expect(await tryBiometricUnlock(lock, bio)).toEqual({ kind: 'unlocked' });
  });

  it('cancelada ou falhou: cai na senha do app', async () => {
    const { lock, bio, state } = await setup();
    await enableBiometrics(lock, bio);
    state.next = 'cancel';
    expect(await tryBiometricUnlock(lock, bio)).toEqual({ kind: 'password', reason: 'cancel' });
    state.next = 'error';
    expect(await tryBiometricUnlock(lock, bio)).toEqual({ kind: 'password', reason: 'error' });
  });

  it('biometria sumiu do aparelho: senha', async () => {
    const { lock } = await setup();
    const on = fakeBiometrics();
    await enableBiometrics(lock, on.bio);
    const off = fakeBiometrics({ available: false });
    expect(await tryBiometricUnlock(lock, off.bio)).toEqual({ kind: 'password', reason: 'unavailable' });
  });

  it('digital nova: pede a senha uma vez e, depois dela, rearma e volta a aceitar a biometria', async () => {
    const { lock, bio, state, enroll } = await setup();
    await enableBiometrics(lock, bio);
    enroll();
    expect(await tryBiometricUnlock(lock, bio)).toEqual({ kind: 'password', reason: 'changed' });
    // enquanto a senha não for usada, nem chama o diálogo
    state.calls = [];
    expect(await tryBiometricUnlock(lock, bio)).toEqual({ kind: 'password', reason: 'changed' });
    expect(state.calls).toEqual([]);

    const r = await unlockWithPasswordAndRearm(lock, bio, 'segredo1');
    expect(r).toEqual({ result: { ok: true }, rearm: 'ok' });
    expect(await tryBiometricUnlock(lock, bio)).toEqual({ kind: 'unlocked' });
  });

  it('digital nova e rearme cancelado: a biometria fica desligada (Ajustes mostra a verdade)', async () => {
    const { lock, bio, state, enroll } = await setup();
    await enableBiometrics(lock, bio);
    enroll();
    await tryBiometricUnlock(lock, bio);
    state.next = 'cancel';
    const r = await unlockWithPasswordAndRearm(lock, bio, 'segredo1');
    expect(r).toEqual({ result: { ok: true }, rearm: 'cancel' });
    expect((await lock.status()).biometrics).toBe(false);
  });

  it('senha errada não rearma', async () => {
    const { lock, bio, state, enroll } = await setup();
    await enableBiometrics(lock, bio);
    enroll();
    await tryBiometricUnlock(lock, bio);
    state.calls = [];
    const r = await unlockWithPasswordAndRearm(lock, bio, 'errada');
    expect(r.result.ok).toBe(false);
    expect(r.rearm).toBeNull();
    expect(state.calls).toEqual([]);
  });

  it('senha certa sem digital nova não chama o diálogo', async () => {
    const { lock, bio, state } = await setup();
    await enableBiometrics(lock, bio);
    state.calls = [];
    expect(await unlockWithPasswordAndRearm(lock, bio, 'segredo1')).toEqual({ result: { ok: true }, rearm: null });
    expect(state.calls).toEqual([]);
  });
});
