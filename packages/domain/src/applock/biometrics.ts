// Fluxos da biometria sobre o serviço do bloqueio. O aparelho entra pela interface `DeviceBiometrics`:
// no Android, uma sentinela no armazenamento seguro presa à biometria; uma digital nova a invalida ('changed').
import type { AppLock } from './service.ts';
import type { UnlockResult } from './model.ts';

export type BiometricOutcome = 'ok' | 'cancel' | 'changed' | 'unavailable' | 'error';

export interface DeviceBiometrics {
  /** Há biometria forte cadastrada no aparelho. */
  available(): Promise<boolean>;
  /** Cria a sentinela (mostra o diálogo do sistema). */
  arm(): Promise<BiometricOutcome>;
  /** Mostra o diálogo e confere a sentinela. */
  verify(): Promise<BiometricOutcome>;
  disarm(): Promise<void>;
}

export type BiometricAttempt =
  | { kind: 'unlocked' }
  | { kind: 'password'; reason: 'off' | 'cancel' | 'changed' | 'unavailable' | 'error' };

/** Liga a biometria só depois que o aparelho confirmou. */
export async function enableBiometrics(lock: AppLock, bio: DeviceBiometrics): Promise<BiometricOutcome> {
  if (!(await bio.available())) return 'unavailable';
  const outcome = await bio.arm();
  if (outcome === 'ok') await lock.setBiometrics(true);
  return outcome;
}

export async function disableBiometrics(lock: AppLock, bio: DeviceBiometrics): Promise<void> {
  await lock.setBiometrics(false);
  await bio.disarm();
}

/** Chamado ao aparecer a tela de bloqueio. Qualquer coisa que não seja confirmação leva à senha do app. */
export async function tryBiometricUnlock(lock: AppLock, bio: DeviceBiometrics): Promise<BiometricAttempt> {
  const status = await lock.status();
  if (!status.biometrics) return { kind: 'password', reason: 'off' };
  if (status.mustUsePassword) return { kind: 'password', reason: 'changed' };
  // esperas e trava da conta: a tela lê o status e mostra
  if (!(await lock.canUseBiometrics())) return { kind: 'password', reason: 'off' };
  if (!(await bio.available())) return { kind: 'password', reason: 'unavailable' };
  const outcome = await bio.verify();
  if (outcome === 'changed') {
    await lock.biometricsChanged();
    return { kind: 'password', reason: 'changed' };
  }
  if (outcome !== 'ok') return { kind: 'password', reason: outcome };
  const result = await lock.unlockWithBiometrics();
  return result.ok ? { kind: 'unlocked' } : { kind: 'password', reason: 'error' };
}

/**
 * Desbloqueio pela senha. Se ela vinha sendo exigida por digital nova, recria a sentinela; se o rearme não for
 * confirmado, a biometria fica desligada (Ajustes mostra a verdade).
 */
export async function unlockWithPasswordAndRearm(
  lock: AppLock,
  bio: DeviceBiometrics,
  password: string,
): Promise<{ result: UnlockResult; rearm: BiometricOutcome | null }> {
  const before = await lock.status();
  const result = await lock.unlockWithPassword(password);
  if (!result.ok || !before.biometrics || !before.mustUsePassword) return { result, rearm: null };
  const rearm = await bio.arm();
  if (rearm !== 'ok') await lock.setBiometrics(false);
  return { result, rearm };
}
