// Planos de leitura: o plano guarda só a regra (grupos de livros, duração em dias de leitura, dias da semana, início,
// pausas). Daqui sai o cronograma de cada dia e a situação (dia atual, perdidos, sequência, progresso), sempre pelo
// calendário: dia não lido fica perdido até ser lido; ler adiantado vale; pausa empurra os dias seguintes.
import { addDays, weekdayOf, type IsoDate, type ScheduledNotice } from '../time/index.ts';
import { getBook } from './books.ts';

export const PLAN_GROUP_CODES = ['pent', 'hist', 'poet', 'prof', 'evan', 'atos', 'paulo', 'gerais', 'apoc'] as const;
export type PlanGroup = (typeof PLAN_GROUP_CODES)[number];

const books = (s: string) => s.split(' ');
export const PLAN_GROUPS: readonly { code: PlanGroup; name: string; books: readonly string[] }[] = [
  { code: 'pent', name: 'Pentateuco', books: books('GEN EXO LEV NUM DEU') },
  { code: 'hist', name: 'Históricos', books: books('JOS JDG RUT 1SA 2SA 1KI 2KI 1CH 2CH EZR NEH EST') },
  { code: 'poet', name: 'Poéticos', books: books('JOB PSA PRO ECC SNG') },
  { code: 'prof', name: 'Profetas', books: books('ISA JER LAM EZK DAN HOS JOL AMO OBA JON MIC NAM HAB ZEP HAG ZEC MAL') },
  { code: 'evan', name: 'Evangelhos', books: books('MAT MRK LUK JHN') },
  { code: 'atos', name: 'Atos', books: books('ACT') },
  { code: 'paulo', name: 'Cartas de Paulo', books: books('ROM 1CO 2CO GAL EPH PHP COL 1TH 2TH 1TI 2TI TIT PHM') },
  { code: 'gerais', name: 'Cartas gerais', books: books('HEB JAS 1PE 2PE 1JN 2JN 3JN JUD') },
  { code: 'apoc', name: 'Apocalipse', books: books('REV') },
];

export const PLAN_TEMPLATES: readonly { id: 'ano' | 'nt' | 'ev30'; name: string; groups: PlanGroup[]; days: number }[] = [
  { id: 'ano', name: 'Bíblia em 1 ano', groups: [...PLAN_GROUP_CODES], days: 365 },
  { id: 'nt', name: 'Novo Testamento em 90 dias', groups: ['evan', 'atos', 'paulo', 'gerais', 'apoc'], days: 90 },
  { id: 'ev30', name: 'Evangelhos em 30 dias', groups: ['evan'], days: 30 },
];

export interface PlanPause {
  from: IsoDate;
  /** null = pausado agora */
  to: IsoDate | null;
}

export interface PlanRule {
  groups: readonly PlanGroup[];
  /** dias de leitura */
  days: number;
  /** 0 = domingo … 6 = sábado */
  weekdays: readonly number[];
  start_date: IsoDate;
  pauses: readonly PlanPause[];
}

export interface PlanDay {
  n: number;
  date: IsoDate;
  /** capítulos em OSIS, ex.: ROM.1 */
  refs: string[];
  label: string;
}

export interface PlanRead {
  ref: string;
  read_on: IsoDate;
}

export interface PlanStatus {
  current: PlanDay | null;
  todayDone: boolean;
  readToday: string[];
  doneDays: number[];
  missedDays: number[];
  streak: number;
  progress: number;
  endDate: IsoDate;
  completed: boolean;
  paused: boolean;
}

/** Capítulos do plano, na ordem do cânon (a ordem dos grupos segue a da Bíblia, não a da escolha). */
export function planChapters(groups: readonly PlanGroup[]): string[] {
  const wanted = new Set(groups);
  return PLAN_GROUPS.filter((g) => wanted.has(g.code)).flatMap((g) =>
    g.books.flatMap((code) => Array.from({ length: getBook(code)?.chapters ?? 0 }, (_, i) => `${code}.${i + 1}`)),
  );
}

export const chapterCount = (groups: readonly PlanGroup[]): number => planChapters(groups).length;

const split = (ref: string) => {
  const i = ref.lastIndexOf('.');
  return { book: ref.slice(0, i), chapter: Number(ref.slice(i + 1)) };
};
const nameOf = (code: string) => getBook(code)?.name ?? code;

/** "Salmos 23–27", "Romanos 16", "Romanos 16 a 1 Coríntios 2". */
export function dayLabel(refs: readonly string[]): string {
  if (!refs.length) return '';
  const a = split(refs[0]!);
  const z = split(refs[refs.length - 1]!);
  if (a.book !== z.book) return `${nameOf(a.book)} ${a.chapter} a ${nameOf(z.book)} ${z.chapter}`;
  return a.chapter === z.chapter ? `${nameOf(a.book)} ${a.chapter}` : `${nameOf(a.book)} ${a.chapter}–${z.chapter}`;
}

const pausedOn = (date: IsoDate, pauses: readonly PlanPause[], today: IsoDate) => pauses.some((p) => date >= p.from && date <= (p.to ?? today));

/** Datas dos `count` dias de leitura a partir do início (dias da semana escolhidos, fora das pausas). */
function readingDates(rule: PlanRule, count: number, today: IsoDate): IsoDate[] {
  const out: IsoDate[] = [];
  const week = new Set(rule.weekdays);
  if (!week.size) return out;
  for (let d = rule.start_date; out.length < count; d = addDays(d, 1)) if (week.has(weekdayOf(d)) && !pausedOn(d, rule.pauses, today)) out.push(d);
  return out;
}

export function schedule(rule: PlanRule, today: IsoDate): PlanDay[] {
  const chapters = planChapters(rule.groups);
  const days = Math.max(1, rule.days);
  const dates = readingDates(rule, days, today);
  const base = Math.floor(chapters.length / days);
  const extra = chapters.length % days;
  let at = 0;
  return dates.map((date, i) => {
    const take = base + (i < extra ? 1 : 0);
    const refs = chapters.slice(at, at + take);
    at += take;
    return { n: i + 1, date, refs, label: dayLabel(refs) };
  });
}

export function planStatus(rule: PlanRule, reads: readonly PlanRead[], today: IsoDate): PlanStatus {
  const days = schedule(rule, today);
  const firstRead = new Map<string, IsoDate>();
  for (const r of reads) {
    const cur = firstRead.get(r.ref);
    if (!cur || r.read_on < cur) firstRead.set(r.ref, r.read_on);
  }
  const done = (d: PlanDay) => d.refs.every((ref) => firstRead.has(ref));
  const onTime = (d: PlanDay) => d.refs.every((ref) => (firstRead.get(ref) ?? '9999') <= d.date);

  const current = days.find((d) => d.date >= today) ?? null;
  let streak = 0;
  for (const d of [...days].reverse()) {
    if (d.date > today) continue;
    if (d.date === today && !done(d)) continue;
    if (!done(d) || !onTime(d)) break;
    streak++;
  }
  const total = days.reduce((n, d) => n + d.refs.length, 0);
  const read = days.reduce((n, d) => n + d.refs.filter((ref) => firstRead.has(ref)).length, 0);
  const last = rule.pauses[rule.pauses.length - 1];
  return {
    current,
    todayDone: !!current && current.date === today && done(current),
    readToday: current ? current.refs.filter((ref) => firstRead.has(ref)) : [],
    doneDays: days.filter(done).map((d) => d.n),
    missedDays: days.filter((d) => d.date < today && !done(d)).map((d) => d.n),
    streak,
    progress: total ? read / total : 0,
    endDate: days[days.length - 1]?.date ?? rule.start_date,
    completed: days.length > 0 && days.every(done),
    paused: !!last && last.to === null,
  };
}

/**
 * Lembretes dos planos para os próximos `days` dias a partir de `from`: um por dia de leitura ainda não concluído, no
 * horário do plano. Plano sem lembrete, pausado, concluído ou excluído não avisa. Sem botões: tocar abre o plano.
 */
export function planNotices(
  plans: readonly {
    plan: PlanRule & { id: string; reminder_time: string | null; completed_at: string | null; deleted_at: string | null };
    reads: readonly PlanRead[];
  }[],
  from: IsoDate,
  days: number,
): ScheduledNotice[] {
  const until = addDays(from, days);
  const out: ScheduledNotice[] = [];
  for (const { plan, reads } of plans) {
    if (!plan.reminder_time || plan.completed_at || plan.deleted_at || plan.pauses.some((p) => p.to === null)) continue;
    const read = new Set(reads.map((r) => r.ref));
    for (const d of schedule(plan, from)) {
      if (d.date < from || d.date >= until || d.refs.every((r) => read.has(r))) continue;
      out.push({ key: `bible-plan:${plan.id}:${d.date}`, title: 'Leitura de hoje', body: d.label, date: d.date, time: plan.reminder_time, url: `/biblia/planos/${plan.id}` });
    }
  }
  return out;
}
