import { addDays, type IsoDate } from '@glife/domain/time';

/** Segunda-feira da semana de `iso` (a faixa de dias da Agenda vai de segunda a domingo). */
export function weekStart(iso: IsoDate): IsoDate {
  const wd = new Date(`${iso}T12:00:00Z`).getUTCDay();
  return addDays(iso, wd === 0 ? -6 : 1 - wd);
}
