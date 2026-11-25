// Tempo de calendário (sem fuso): datas "AAAA-MM-DD", horas "HH:MM", dias da semana em máscara de bits e a regra de
// repetição usada por eventos, lembretes e refeições. Horas são de parede (14:30 continua 14:30 em qualquer data).
// Também o aviso agendado (`ScheduledNotice`) que cada feature monta e o app entrega ao sistema de notificações.
import { z } from 'zod';

export type IsoDate = string;
/** "HH:MM", 24 h. */
export type LocalTime = string;

const DATE_RE = /^(\d{4})-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

export function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

export const isoDateSchema = z.string().refine((s) => {
  const m = s.match(DATE_RE);
  return !!m && Number(m[3]) <= daysInMonth(Number(m[1]), Number(m[2]));
}, 'Data inválida');
export const localTimeSchema = z.string().regex(TIME_RE, 'Hora inválida');

const toUtc = (d: IsoDate) => Date.UTC(Number(d.slice(0, 4)), Number(d.slice(5, 7)) - 1, Number(d.slice(8, 10)));
const fromUtc = (ms: number): IsoDate => new Date(ms).toISOString().slice(0, 10);
const DAY = 86_400_000;

export const addDays = (d: IsoDate, n: number): IsoDate => fromUtc(toUtc(d) + n * DAY);
export const daysBetween = (a: IsoDate, b: IsoDate): number => Math.round((toUtc(b) - toUtc(a)) / DAY);
/** 0 = domingo … 6 = sábado. */
export const weekdayOf = (d: IsoDate): number => new Date(toUtc(d)).getUTCDay();

/** Dia `day` do mês de `year`/`month`, preso ao último dia (31 em abril → 30). */
export function clampedDate(year: number, month: number, day: number): IsoDate {
  const d = Math.min(day, daysInMonth(year, month));
  return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

/** Data e hora locais do aparelho num instante. */
export function localNow(at: Date = new Date()): { date: IsoDate; time: LocalTime } {
  const p = (n: number) => String(n).padStart(2, '0');
  return {
    date: `${at.getFullYear()}-${p(at.getMonth() + 1)}-${p(at.getDate())}`,
    time: `${p(at.getHours())}:${p(at.getMinutes())}`,
  };
}

/** Minutos desde 00:00. */
export const minutesOf = (t: LocalTime): number => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));

/** Soma minutos a data e hora (pode mudar de dia). */
export function shiftMinutes(date: IsoDate, time: LocalTime, minutes: number): { date: IsoDate; time: LocalTime } {
  const total = minutesOf(time) + minutes;
  const days = Math.floor(total / 1440);
  const rest = total - days * 1440;
  const p = (n: number) => String(n).padStart(2, '0');
  return { date: addDays(date, days), time: `${p(Math.floor(rest / 60))}:${p(rest % 60)}` };
}

// ---------- Dias da semana ----------

export const ALL_WEEKDAYS = 0b1111111;
export const weekdayBit = (weekday: number) => 1 << weekday;
export const hasWeekday = (mask: number, weekday: number) => (mask & weekdayBit(weekday)) !== 0;
export const weekdaysSchema = z.number().int().min(0).max(ALL_WEEKDAYS);

// ---------- Repetição ----------

export const FREQUENCIES = ['none', 'daily', 'weekly', 'monthly', 'yearly'] as const;
export type Frequency = (typeof FREQUENCIES)[number];
export const INTERVAL_MAX = 99;

export interface RepeatRule {
  start_date: IsoDate;
  frequency: Frequency;
  /** a cada N dias/semanas/meses/anos */
  interval_count: number;
  /** só no semanal: dias da semana (0 = o dia da semana do início) */
  weekdays: number;
  /** último dia possível (inclusive); null = sem fim */
  until: IsoDate | null;
  /** ocorrências puladas */
  skipped_dates: readonly IsoDate[];
}

/** Campos de repetição comuns às entidades (para os schemas Zod). */
export const repeatFields = {
  frequency: z.enum(FREQUENCIES),
  interval_count: z.number().int().min(1).max(INTERVAL_MAX),
  weekdays: weekdaysSchema,
  until: isoDateSchema.nullable(),
};

/** Regras de coerência da repetição; devolve a mensagem do problema ou null. */
export function repeatProblem(r: Pick<RepeatRule, 'start_date' | 'frequency' | 'until'>): string | null {
  if (r.until !== null && r.until < r.start_date) return 'O fim da repetição é antes do início';
  if (r.frequency === 'none' && r.until !== null) return 'Sem repetição não tem data de fim';
  return null;
}

/** Datas da regra entre `from` e `to` (inclusive), em ordem, no máximo `limit`. */
export function occurrenceDates(rule: RepeatRule, from: IsoDate, to: IsoDate, limit = 1000): IsoDate[] {
  const end = rule.until !== null && rule.until < to ? rule.until : to;
  const lower = from > rule.start_date ? from : rule.start_date;
  if (lower > end) return [];
  const skipped = new Set(rule.skipped_dates);
  const out: IsoDate[] = [];
  const push = (d: IsoDate) => {
    if (d >= lower && d <= end && !skipped.has(d)) out.push(d);
  };
  const step = Math.max(1, rule.interval_count);
  const sy = Number(rule.start_date.slice(0, 4));
  const sm = Number(rule.start_date.slice(5, 7));
  const sd = Number(rule.start_date.slice(8, 10));

  switch (rule.frequency) {
    case 'none':
      push(rule.start_date);
      break;
    case 'daily': {
      // Pula direto para a primeira ocorrência perto de `lower`.
      let k = Math.max(0, Math.floor(daysBetween(rule.start_date, lower) / step));
      for (let d = addDays(rule.start_date, k * step); d <= end && out.length < limit; d = addDays(rule.start_date, ++k * step)) push(d);
      break;
    }
    case 'weekly': {
      const mask = rule.weekdays || weekdayBit(weekdayOf(rule.start_date));
      const week0 = addDays(rule.start_date, -weekdayOf(rule.start_date)); // domingo da semana do início
      let w = Math.max(0, Math.floor(daysBetween(week0, lower) / 7 / step));
      for (; out.length < limit; w++) {
        const sunday = addDays(week0, w * step * 7);
        if (sunday > end) break;
        for (let wd = 0; wd < 7; wd++) if (hasWeekday(mask, wd)) push(addDays(sunday, wd));
      }
      break;
    }
    case 'monthly': {
      const months = (y: number, m: number) => y * 12 + m - 1;
      let k = Math.max(0, Math.floor((months(Number(lower.slice(0, 4)), Number(lower.slice(5, 7))) - months(sy, sm)) / step));
      for (; out.length < limit; k++) {
        const idx = months(sy, sm) + k * step;
        const d = clampedDate(Math.floor(idx / 12), (idx % 12) + 1, sd);
        if (d > end) break;
        push(d);
      }
      break;
    }
    case 'yearly': {
      let k = Math.max(0, Math.floor((Number(lower.slice(0, 4)) - sy) / step));
      for (; out.length < limit; k++) {
        const d = clampedDate(sy + k * step, sm, sd);
        if (d > end) break;
        push(d);
      }
      break;
    }
  }
  return out.slice(0, limit);
}

/** Texto do JSON de datas puladas (como vem do banco) → lista validada; inválido = vazio. */
export function parseDateList(raw: unknown): IsoDate[] {
  if (Array.isArray(raw)) return raw.filter((d): d is IsoDate => isoDateSchema.safeParse(d).success);
  if (typeof raw !== 'string') return [];
  try {
    return parseDateList(JSON.parse(raw));
  } catch {
    return [];
  }
}

// ---------- Avisos ----------

/** Um aviso a entregar no aparelho, na hora local `date` + `time`. `key` é estável (mesmo aviso, mesma chave). */
export interface ScheduledNotice {
  key: string;
  title: string;
  body: string;
  date: IsoDate;
  time: LocalTime;
  /** rota do app aberta ao tocar no aviso */
  url: string;
}

/** Os mais próximos primeiro, só os que ainda não passaram, no máximo `max` (o Android limita alarmes). */
export function upcomingNotices(notices: readonly ScheduledNotice[], now: { date: IsoDate; time: LocalTime }, max: number): ScheduledNotice[] {
  const at = (n: ScheduledNotice) => `${n.date}T${n.time}`;
  const after = `${now.date}T${now.time}`;
  return notices
    .filter((n) => at(n) > after)
    .sort((a, b) => (at(a) !== at(b) ? (at(a) < at(b) ? -1 : 1) : a.key < b.key ? -1 : 1))
    .slice(0, max);
}
