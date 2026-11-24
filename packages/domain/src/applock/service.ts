// Serviço do bloqueio: aplica as regras sobre o registro guardado. A biometria em si (o diálogo do sistema)
// fica no app; aqui só se decide se ela pode ser usada e se registra o resultado.
import { RepositoryError, parseOrThrow } from '../core/index.ts';
import {
  DEFAULT_LOCK_TIMEOUT_MS,
  appLockRecordSchema,
  appPasswordSchema,
  lockTimeoutSchema,
  lockoutFor,
  type AppLockRecord,
  type AppLockStatus,
  type AppLockStore,
  type PasswordHasher,
  type UnlockResult,
} from './model.ts';

export interface AppLockDeps {
  store: AppLockStore;
  hasher: PasswordHasher;
  now?: () => number;
}

export function createAppLock({ store, hasher, now = Date.now }: AppLockDeps) {
  async function load(): Promise<AppLockRecord | null> {
    const r = await store.load();
    return r ? appLockRecordSchema.parse(r) : null;
  }

  async function required(): Promise<AppLockRecord> {
    const r = await load();
    if (!r) throw new RepositoryError('not_found');
    return r;
  }

  /** Recusa antes de verificar: travado pela conta ou dentro da espera. */
  function gate(r: AppLockRecord): UnlockResult | null {
    if (r.requireAccount) return { ok: false, reason: 'account' };
    if (r.blockedUntil !== null && now() < r.blockedUntil) {
      return { ok: false, reason: 'wait', remainingMs: r.blockedUntil - now() };
    }
    return null;
  }

  async function fail(r: AppLockRecord): Promise<UnlockResult> {
    const failures = r.failures + 1;
    const lockout = lockoutFor(failures);
    await store.save({
      ...r,
      failures,
      requireAccount: lockout.kind === 'account',
      blockedUntil: lockout.kind === 'wait' ? now() + lockout.ms : null,
    });
    return { ok: false, reason: 'wrong', failures };
  }

  const succeeded = (r: AppLockRecord): AppLockRecord => ({ ...r, failures: 0, blockedUntil: null });

  /** Confere a senha respeitando esperas; acerto zera erros e libera a biometria de novo. */
  async function checkPassword(password: string): Promise<{ result: UnlockResult; record: AppLockRecord | null }> {
    const r = await load();
    if (!r) return { result: { ok: false, reason: 'no_password' }, record: null };
    const blocked = gate(r);
    if (blocked) return { result: blocked, record: null };
    if (!(await hasher.verify(password, r.digest))) return { result: await fail(r), record: null };
    return { result: { ok: true }, record: { ...succeeded(r), mustUsePassword: false } };
  }

  return {
    async status(): Promise<AppLockStatus> {
      const r = await load();
      return {
        configured: !!r,
        biometrics: r?.biometrics ?? false,
        timeoutMs: r?.timeoutMs ?? DEFAULT_LOCK_TIMEOUT_MS,
        failures: r?.failures ?? 0,
        blockedUntil: r?.blockedUntil ?? null,
        requireAccount: r?.requireAccount ?? false,
        mustUsePassword: r?.mustUsePassword ?? false,
      };
    },

    /** Primeiro uso. Para trocar, use `changePassword`; para esquecida, `resetWithAccount`. */
    async setPassword(password: string): Promise<void> {
      const clean = parseOrThrow(appPasswordSchema, password);
      if (await load()) throw new RepositoryError('conflict');
      await store.save({
        v: 1,
        digest: await hasher.hash(clean),
        failures: 0,
        blockedUntil: null,
        requireAccount: false,
        biometrics: false,
        mustUsePassword: false,
        timeoutMs: DEFAULT_LOCK_TIMEOUT_MS,
      });
    },

    async unlockWithPassword(password: string): Promise<UnlockResult> {
      const { result, record } = await checkPassword(password);
      if (record) await store.save(record);
      return result;
    },

    /** Troca confirmando a atual; errar a atual conta como erro (não serve de atalho para adivinhar). */
    async changePassword(current: string, next: string): Promise<UnlockResult> {
      const clean = parseOrThrow(appPasswordSchema, next);
      const { result, record } = await checkPassword(current);
      if (record) await store.save({ ...record, digest: await hasher.hash(clean) });
      return result;
    },

    /** Depois do login completo da conta (e-mail, senha e MFA): nova senha e erros zerados. */
    async resetWithAccount(newPassword: string): Promise<void> {
      const clean = parseOrThrow(appPasswordSchema, newPassword);
      const r = await required();
      await store.save({
        ...succeeded(r),
        requireAccount: false,
        mustUsePassword: false,
        digest: await hasher.hash(clean),
      });
    },

    async canUseBiometrics(): Promise<boolean> {
      const r = await load();
      return !!r && r.biometrics && !r.mustUsePassword && gate(r) === null;
    },

    /** Chame depois que o diálogo de biometria do sistema confirmou. */
    async unlockWithBiometrics(): Promise<UnlockResult> {
      const r = await load();
      if (!r) return { ok: false, reason: 'no_password' };
      const blocked = gate(r);
      if (blocked) return blocked;
      if (!r.biometrics || r.mustUsePassword) return { ok: false, reason: 'wrong', failures: r.failures };
      await store.save(succeeded(r));
      return { ok: true };
    },

    async setBiometrics(on: boolean): Promise<void> {
      await store.save({ ...(await required()), biometrics: on });
    },

    /** O sistema avisou que a biometria do aparelho mudou (digital nova). */
    async biometricsChanged(): Promise<void> {
      await store.save({ ...(await required()), mustUsePassword: true });
    },

    async setTimeout(ms: number): Promise<void> {
      const timeoutMs = parseOrThrow(lockTimeoutSchema, ms);
      await store.save({ ...(await required()), timeoutMs });
    },
  };
}

export type AppLock = ReturnType<typeof createAppLock>;
