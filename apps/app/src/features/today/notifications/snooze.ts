import type { AppNotification } from '@glife/domain/notifications';
import type { ScheduledNotice } from '@glife/domain/time';

import { parseNoticeRef, SAFE_NOTICE_ROUTES } from '@/shared/lib/notices/types';

export type SnoozeOption = '10min' | '1h' | 'tomorrow';

/** A data mantém a hora local do aparelho, inclusive ao mudar o mês/ano. */
export function snoozeUntil(option: SnoozeOption, now: Date): Date {
  if (option !== 'tomorrow') return new Date(now.getTime() + (option === '10min' ? 10 : 60) * 60_000);
  const at = new Date(now);
  at.setDate(at.getDate() + 1);
  at.setHours(9, 0, 0, 0);
  return at;
}

/** O id do feed conserva a data da ocorrência: concluir um adiamento continua concluindo a ocorrência certa. */
export function noticeForSnooze(n: AppNotification): ScheduledNotice | null {
  const [kind, id, date, extra] = n.id.split(':');
  const ref = parseNoticeRef({ kind, id, date });
  if (extra !== undefined || !ref || !n.route || !SAFE_NOTICE_ROUTES.test(n.route)) return null;
  if ((n.module !== 'agenda' || kind !== 'reminder') && (n.module !== 'diet' || kind !== 'meal')) return null;
  return { key: n.id, title: n.title, body: n.message, date: ref.date, time: '00:00', url: n.route, ref };
}
