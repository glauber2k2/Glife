// Bloqueio do app: regras puras (planejamento, seção "Bloqueio do app"). O bloqueio é local, de cada aparelho;
// a senha do app nunca vai ao servidor e nunca é guardada em texto (só o hash lento com sal).
import { z } from 'zod';

const SEC = 1000;
const MIN = 60 * SEC;

export const APP_PASSWORD_MIN = 6;
export const APP_PASSWORD_MAX = 128;
export const appPasswordSchema = z.string().min(APP_PASSWORD_MIN).max(APP_PASSWORD_MAX);

/** "Bloquear depois de": imediatamente, 1, 5 ou 15 min em segundo plano. */
export const LOCK_TIMEOUT_OPTIONS = [0, MIN, 5 * MIN, 15 * MIN] as const;
export const DEFAULT_LOCK_TIMEOUT_MS = MIN;
export const lockTimeoutSchema = z
  .number()
  .refine((v) => (LOCK_TIMEOUT_OPTIONS as readonly number[]).includes(v), 'Tempo não previsto.');

/** Depois destes erros seguidos, só o login completo da conta libera (e permite redefinir a senha). */
export const ACCOUNT_LOCK_FAILURES = 10;

export type Lockout = { kind: 'none' } | { kind: 'wait'; ms: number } | { kind: 'account' };

/** Espera crescente: 5–6 erros → 30 s; 7–9 → 5 min; 10 → só com a conta. */
export function lockoutFor(failures: number): Lockout {
  if (failures >= ACCOUNT_LOCK_FAILURES) return { kind: 'account' };
  if (failures >= 7) return { kind: 'wait', ms: 5 * MIN };
  if (failures >= 5) return { kind: 'wait', ms: 30 * SEC };
  return { kind: 'none' };
}

/** Ao voltar do segundo plano: bloqueia se ficou fora pelo menos `timeoutMs` (0 = sempre). */
export function shouldLockOnReturn(backgroundAt: number | null, now: number, timeoutMs: number): boolean {
  return backgroundAt !== null && now - backgroundAt >= timeoutMs;
}

export const passwordDigestSchema = z.object({
  kdf: z.object({
    algo: z.literal('scrypt'),
    N: z.number().int().positive(),
    r: z.number().int().positive(),
    p: z.number().int().positive(),
    dkLen: z.number().int().positive(),
  }),
  /** base64 */
  salt: z.string().min(1),
  /** base64 */
  hash: z.string().min(1),
});
export type PasswordDigest = z.infer<typeof passwordDigestSchema>;

export const appLockRecordSchema = z.object({
  v: z.literal(1),
  digest: passwordDigestSchema,
  failures: z.number().int().min(0),
  /** epoch ms até quando tentativas são recusadas */
  blockedUntil: z.number().nullable(),
  /** 10 erros: só o login da conta libera */
  requireAccount: z.boolean(),
  biometrics: z.boolean(),
  /** digital nova no aparelho: a senha precisa ser usada uma vez antes da biometria voltar */
  mustUsePassword: z.boolean(),
  timeoutMs: lockTimeoutSchema,
});
export type AppLockRecord = z.infer<typeof appLockRecordSchema>;

export interface PasswordHasher {
  hash(password: string): Promise<PasswordDigest>;
  verify(password: string, digest: PasswordDigest): Promise<boolean>;
}

/** Guarda o registro no armazenamento seguro do aparelho (Keystore no Android). */
export interface AppLockStore {
  load(): Promise<AppLockRecord | null>;
  save(record: AppLockRecord): Promise<void>;
  clear(): Promise<void>;
}

export type UnlockResult =
  | { ok: true }
  | { ok: false; reason: 'no_password' }
  | { ok: false; reason: 'wrong'; failures: number }
  | { ok: false; reason: 'wait'; remainingMs: number }
  | { ok: false; reason: 'account' };

export interface AppLockStatus {
  configured: boolean;
  biometrics: boolean;
  timeoutMs: number;
  failures: number;
  blockedUntil: number | null;
  requireAccount: boolean;
  mustUsePassword: boolean;
}
