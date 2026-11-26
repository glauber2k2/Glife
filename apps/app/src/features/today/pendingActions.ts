// Fila de "Feito" tocados no aviso antes de a sessão abrir (ex.: esperando o código do MFA). Puro e testado.
import type { NoticeActionEvent } from '@/shared/lib/notices';

/** Quanto tempo uma ação espera a sessão; depois é descartada. */
export const PENDING_ACTION_TTL_MS = 5 * 60_000;

export interface PendingAction {
  event: NoticeActionEvent;
  at: number;
}

/** Ações na fila que ainda valem (as velhas demais são descartadas). */
export const freshPending = (queue: readonly PendingAction[], now: number): PendingAction[] =>
  queue.filter((p) => now - p.at >= 0 && now - p.at <= PENDING_ACTION_TTL_MS);
