// Textos e estado da tela de bloqueio, puros (testados em tests/lockText.test.ts). Regras: protótipo
// "Glife Bloqueio", seção 08: espera no 5º erro (30 s) e no 7º (5 min); no 10º, trava até a conta.
import type { AppLockStatus } from '@glife/domain/applock';

export type LockPhase = 'senha' | 'erro' | 'espera' | 'travado' | 'nova';

/** Fase da tela a partir do registro. `justFailed`: a última tentativa desta tela foi errada. */
export function lockPhase(status: AppLockStatus, now: number, justFailed: boolean): LockPhase {
  if (status.requireAccount) return 'travado';
  if (status.blockedUntil !== null && now < status.blockedUntil) return 'espera';
  if (status.mustUsePassword) return 'nova';
  if (justFailed && status.failures > 0) return 'erro';
  return 'senha';
}

export function triesText(failures: number): string {
  if (failures < 5) return `${failures} de 5 tentativas antes de esperar`;
  if (failures < 7) return `${failures} de 7 tentativas antes de esperar`;
  return `${failures} de 10 tentativas antes de travar`;
}

export function waitNextText(failures: number): string {
  return failures >= 7
    ? 'Mais 3 erros e o app trava até você entrar com a conta.'
    : 'Mais 2 erros e a próxima espera é de 5 min.';
}

/** Tempo restante em m:ss, arredondado para cima: calculado do prazo, nunca subtraído a cada tique. */
export function formatClock(remainingMs: number): string {
  const s = Math.max(0, Math.ceil(remainingMs / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

export function timeoutLabel(ms: number): string {
  if (ms === 0) return 'Imediatamente';
  const min = Math.round(ms / 60_000);
  return min === 1 ? '1 minuto' : `${min} minutos`;
}
