import { formatDateInput, parseDateInput, parseTimeInput } from './calendarInput';

export type CalendarMode = 'date' | 'time';

/** Os seletores nativos usam os componentes locais do Date, nunca uma data UTC em texto. */
export function pickerDate(mode: CalendarMode, value: string, fallback = new Date()): Date {
  const result = new Date(fallback.getTime());
  if (mode === 'date') {
    const iso = parseDateInput(value);
    if (iso) {
      // setFullYear preserva também anos abaixo de 100 (o construtor do Date não).
      result.setFullYear(Number(iso.slice(0, 4)), Number(iso.slice(5, 7)) - 1, Number(iso.slice(8, 10)));
    }
  } else {
    const time = parseTimeInput(value);
    if (time) result.setHours(Number(time.slice(0, 2)), Number(time.slice(3, 5)), 0, 0);
  }
  return result;
}

export function pickerResult(mode: CalendarMode, eventType: string, date?: Date): string | null {
  if (eventType !== 'set' || !date || !Number.isFinite(date.getTime())) return null;
  if (mode === 'time') return parseTimeInput(`${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`);
  const iso = `${String(date.getFullYear()).padStart(4, '0')}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  const text = formatDateInput(iso);
  return parseDateInput(text) ? text : null;
}

export function pickerWebValue(mode: CalendarMode, value: string): string {
  return (mode === 'date' ? parseDateInput(value) : parseTimeInput(value)) ?? '';
}

export function pickerWebResult(mode: CalendarMode, value: string): string | null {
  if (!value) return '';
  if (mode === 'time') return parseTimeInput(value);
  const text = formatDateInput(value);
  return parseDateInput(text) === value ? text : null;
}
