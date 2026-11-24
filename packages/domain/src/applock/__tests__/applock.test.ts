import { describe, expect, it } from 'vitest';

import { RepositoryError } from '../../core/index.ts';
import {
  DEFAULT_LOCK_TIMEOUT_MS,
  createAppLock,
  lockoutFor,
  shouldLockOnReturn,
  type AppLockRecord,
  type AppLockStore,
  type PasswordDigest,
  type PasswordHasher,
} from '../index.ts';

const SEC = 1000;
const MIN = 60 * SEC;

/** Hasher falso: reversível de propósito, só para os testes verem o que foi guardado. */
const fakeHasher: PasswordHasher = {
  async hash(password) {
    return { kdf: { algo: 'scrypt', N: 2, r: 1, p: 1, dkLen: 8 }, salt: 'c2Fs', hash: `h(${password})` };
  },
  async verify(password, digest: PasswordDigest) {
    return digest.hash === `h(${password})`;
  },
};

function setup() {
  let saved: AppLockRecord | null = null;
  const store: AppLockStore = {
    load: async () => saved,
    save: async (r) => {
      saved = structuredClone(r);
    },
    clear: async () => {
      saved = null;
    },
  };
  let now = 1_000_000;
  const clock = {
    now: () => now,
    advance: (ms: number) => {
      now += ms;
    },
  };
  const lock = createAppLock({ store, hasher: fakeHasher, now: clock.now });
  return { lock, clock, saved: () => saved };
}

async function failTimes(lock: ReturnType<typeof setup>['lock'], n: number) {
  for (let i = 0; i < n; i++) await lock.unlockWithPassword('errada');
}

describe('lockoutFor', () => {
  it('até 4 erros não espera; 5–6 esperam 30 s; 7–9 esperam 5 min; 10 exige a conta', () => {
    expect(lockoutFor(4)).toEqual({ kind: 'none' });
    expect(lockoutFor(5)).toEqual({ kind: 'wait', ms: 30 * SEC });
    expect(lockoutFor(6)).toEqual({ kind: 'wait', ms: 30 * SEC });
    expect(lockoutFor(7)).toEqual({ kind: 'wait', ms: 5 * MIN });
    expect(lockoutFor(9)).toEqual({ kind: 'wait', ms: 5 * MIN });
    expect(lockoutFor(10)).toEqual({ kind: 'account' });
  });
});

describe('shouldLockOnReturn', () => {
  it('bloqueia depois do tempo em segundo plano; "imediatamente" (0) sempre bloqueia', () => {
    expect(shouldLockOnReturn(0, MIN, MIN)).toBe(true);
    expect(shouldLockOnReturn(0, MIN - 1, MIN)).toBe(false);
    expect(shouldLockOnReturn(0, 1, 0)).toBe(true);
    expect(shouldLockOnReturn(null, 99 * MIN, MIN)).toBe(false);
  });
});

describe('createAppLock', () => {
  it('sem senha definida: não configurado', async () => {
    const { lock } = setup();
    expect((await lock.status()).configured).toBe(false);
    expect(await lock.unlockWithPassword('qualquer')).toEqual({ ok: false, reason: 'no_password' });
  });

  it('define a senha guardando só o hash, com padrões de biometria e tempo', async () => {
    const { lock, saved } = setup();
    await lock.setPassword('segredo1');
    expect(JSON.stringify(saved())).not.toContain('"segredo1"');
    expect(await lock.status()).toMatchObject({
      configured: true,
      biometrics: false,
      timeoutMs: DEFAULT_LOCK_TIMEOUT_MS,
      failures: 0,
      requireAccount: false,
    });
  });

  it('recusa senha curta e não deixa definir de novo por cima', async () => {
    const { lock } = setup();
    await expect(lock.setPassword('12345')).rejects.toMatchObject({ code: 'validation' });
    await lock.setPassword('segredo1');
    await expect(lock.setPassword('outra123')).rejects.toBeInstanceOf(RepositoryError);
  });

  it('senha certa desbloqueia e zera os erros', async () => {
    const { lock } = setup();
    await lock.setPassword('segredo1');
    await failTimes(lock, 3);
    expect(await lock.unlockWithPassword('segredo1')).toEqual({ ok: true });
    expect((await lock.status()).failures).toBe(0);
  });

  it('no 5º erro espera 30 s; durante a espera nem a senha certa entra', async () => {
    const { lock, clock } = setup();
    await lock.setPassword('segredo1');
    await failTimes(lock, 4);
    expect(await lock.unlockWithPassword('errada')).toEqual({ ok: false, reason: 'wrong', failures: 5 });
    expect(await lock.unlockWithPassword('segredo1')).toEqual({ ok: false, reason: 'wait', remainingMs: 30 * SEC });
    clock.advance(30 * SEC);
    expect(await lock.unlockWithPassword('segredo1')).toEqual({ ok: true });
  });

  it('no 10º erro trava até o login da conta, que redefine a senha', async () => {
    const { lock, clock } = setup();
    await lock.setPassword('segredo1');
    for (let i = 0; i < 10; i++) {
      await lock.unlockWithPassword('errada');
      clock.advance(5 * MIN);
    }
    expect(await lock.unlockWithPassword('segredo1')).toEqual({ ok: false, reason: 'account' });
    expect(await lock.canUseBiometrics()).toBe(false);
    await lock.resetWithAccount('nova-senha');
    expect(await lock.status()).toMatchObject({ requireAccount: false, failures: 0 });
    expect(await lock.unlockWithPassword('nova-senha')).toEqual({ ok: true });
  });

  it('trocar exige a senha atual; errar conta como erro', async () => {
    const { lock } = setup();
    await lock.setPassword('segredo1');
    expect(await lock.changePassword('errada', 'nova-senha')).toEqual({ ok: false, reason: 'wrong', failures: 1 });
    expect(await lock.changePassword('segredo1', 'nova-senha')).toEqual({ ok: true });
    expect(await lock.unlockWithPassword('segredo1')).toMatchObject({ ok: false, reason: 'wrong' });
    expect(await lock.unlockWithPassword('nova-senha')).toEqual({ ok: true });
  });

  it('biometria só quando ligada; digital nova exige a senha uma vez', async () => {
    const { lock } = setup();
    await lock.setPassword('segredo1');
    expect(await lock.canUseBiometrics()).toBe(false);
    await lock.setBiometrics(true);
    expect(await lock.canUseBiometrics()).toBe(true);
    await lock.biometricsChanged();
    expect(await lock.canUseBiometrics()).toBe(false);
    await lock.unlockWithPassword('segredo1');
    expect(await lock.canUseBiometrics()).toBe(true);
  });

  it('desbloqueio por biometria registra sucesso e zera erros', async () => {
    const { lock } = setup();
    await lock.setPassword('segredo1');
    await lock.setBiometrics(true);
    await failTimes(lock, 2);
    expect(await lock.unlockWithBiometrics()).toEqual({ ok: true });
    expect((await lock.status()).failures).toBe(0);
  });

  it('tempo para bloquear só aceita as opções previstas', async () => {
    const { lock } = setup();
    await lock.setPassword('segredo1');
    await lock.setTimeout(5 * MIN);
    expect((await lock.status()).timeoutMs).toBe(5 * MIN);
    await expect(lock.setTimeout(7)).rejects.toMatchObject({ code: 'validation' });
  });
});
