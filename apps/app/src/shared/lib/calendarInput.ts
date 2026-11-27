// Texto digitado ↔ data e hora de calendário (teclado numérico do aparelho, sem seletor próprio).
// "25/11/2026" ↔ "2026-11-25"; "9:05" ou "0905" → "09:05". Inválido = null.
import { isoDateSchema, type IsoDate, type LocalTime } from '@glife/domain/time';

/** Põe as barras enquanto se digita: "25112026" → "25/11/2026". */
export function maskDate(text: string): string {
  const d = text.replace(/\D/g, '').slice(0, 8);
  return [d.slice(0, 2), d.slice(2, 4), d.slice(4, 8)].filter(Boolean).join('/');
}

/** Põe os dois-pontos enquanto se digita: "0905" → "09:05". */
export function maskTime(text: string): string {
  const d = text.replace(/\D/g, '').slice(0, 4);
  return d.length <= 2 ? d : `${d.slice(0, 2)}:${d.slice(2)}`;
}

export function parseDateInput(text: string): IsoDate | null {
  const m = text.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!m) return null;
  const iso = `${m[3]}-${m[2]!.padStart(2, '0')}-${m[1]!.padStart(2, '0')}`;
  return isoDateSchema.safeParse(iso).success ? iso : null;
}

export const formatDateInput = (iso: IsoDate) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`;

export function parseTimeInput(text: string): LocalTime | null {
  const m = text.trim().match(/^(\d{1,2}):?(\d{2})$/);
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 23 || min > 59) return null;
  return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
}

const WEEKDAY_SHORT = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'] as const;
const WEEKDAY_LONG = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'] as const;
const MONTHS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'] as const;

export const weekdayShort = (wd: number) => WEEKDAY_SHORT[wd]!;
/** "qua, 25 nov" */
export function shortDay(iso: IsoDate): string {
  const wd = new Date(`${iso}T12:00:00Z`).getUTCDay();
  return `${WEEKDAY_SHORT[wd]!.toLowerCase()}, ${Number(iso.slice(8, 10))} ${MONTHS[Number(iso.slice(5, 7)) - 1]}`;
}
/** "quarta, 25 de novembro" sem o ano. */
export function longDay(iso: IsoDate): string {
  const wd = new Date(`${iso}T12:00:00Z`).getUTCDay();
  const full = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
  return `${WEEKDAY_LONG[wd]}, ${Number(iso.slice(8, 10))} de ${full[Number(iso.slice(5, 7)) - 1]}`;
}

/** "Seg, Qua e Sex" · "Todos os dias" · "Dias úteis". */
export function weekdaysLabel(mask: number): string {
  if (mask === 0b1111111) return 'Todos os dias';
  if (mask === 0b0111110) return 'Dias úteis';
  if (mask === 0b1000001) return 'Fins de semana';
  const days = WEEKDAY_SHORT.filter((_, i) => mask & (1 << i));
  return days.length <= 1 ? (days[0] ?? '') : `${days.slice(0, -1).join(', ')} e ${days[days.length - 1]}`;
}
