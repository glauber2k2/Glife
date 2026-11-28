import { beforeEach, describe, expect, it } from 'vitest';

import { setIdGenerator } from '../../core/index.ts';
import { createMemoryRowStore } from '../../testing/index.ts';
import { weekdayBit } from '../../time/index.ts';
import {
  AGENDA_TABLES,
  agendaBetween,
  agendaNotices,
  createAgendaRepository,
  newEvent,
  newReminder,
  nextEvent,
  overdueReminders,
  type AgendaRows,
} from '../index.ts';

const USER = '11110000-0000-4000-8000-000000000001';
const OTHER = '22220000-0000-4000-8000-000000000002';
let seq = 0;
setIdGenerator(() => `9a1c0000-0000-4000-8000-${String(++seq).padStart(12, '0')}`);
const clock = () => new Date('2026-11-25T12:00:00.000Z');
const now = { date: '2026-11-25', time: '13:00' };

describe('agenda: regras do evento', () => {
  it('fim antes do início, dia inteiro com hora de fim e fim da repetição antes do início são recusados', () => {
    expect(() => newEvent({ title: 'X', start_date: '2026-11-25', start_time: '10:00', end_time: '09:00' }, USER)).toThrow();
    expect(() => newEvent({ title: 'X', start_date: '2026-11-25', end_time: '09:00' }, USER)).toThrow();
    expect(() => newEvent({ title: 'X', start_date: '2026-11-25', frequency: 'daily', until: '2026-11-01' }, USER)).toThrow();
    expect(() => newEvent({ title: '  ', start_date: '2026-11-25' }, USER)).toThrow();
  });

  it('semanal sem dias marcados grava o dia da semana do início', () => {
    const e = newEvent({ title: 'Academia', start_date: '2026-11-25', frequency: 'weekly' }, USER);
    expect(e.weekdays).toBe(weekdayBit(3));
    expect(e.end_date).toBe('2026-11-25');
  });
});

describe('agenda: o que acontece quando', () => {
  const reuniao = newEvent({ title: 'Reunião', start_date: '2026-11-25', start_time: '14:30', end_time: '15:30', location: 'Escritório', remind_before: 15 }, USER, clock);
  const cafe = newEvent({ title: 'Café', start_date: '2026-11-25', start_time: '09:00', end_time: '09:30' }, USER, clock);
  const feriado = newEvent({ title: 'Viagem', start_date: '2026-11-24', end_date: '2026-11-26' }, USER, clock);
  const academia = newEvent(
    { title: 'Academia', start_date: '2026-11-02', start_time: '18:00', frequency: 'weekly', weekdays: weekdayBit(1) | weekdayBit(3), remind_before: 30 },
    USER,
    clock,
  );
  const racao = newReminder({ title: 'Comprar ração', start_date: '2026-11-28', time: '09:00' }, USER, clock);

  it('lista o dia com o evento de vários dias, os repetidos e os lembretes, dia inteiro primeiro', () => {
    const day = agendaBetween([reuniao, cafe, feriado, academia], [racao], '2026-11-25', '2026-11-25');
    expect(day.map((i) => i.title)).toEqual(['Viagem', 'Café', 'Reunião', 'Academia']);
    expect(day[0]).toMatchObject({ time: null, end_date: '2026-11-26' });
  });

  it('próximo compromisso ignora o que já terminou e conta os outros de hoje', () => {
    const next = nextEvent([reuniao, cafe, academia], now)!;
    expect(next.item.title).toBe('Reunião');
    expect(next.moreToday).toBe(1);
  });

  it('avisos: minutos antes do evento e no horário do lembrete', () => {
    const notices = agendaNotices([reuniao, academia], [racao], '2026-11-25', 3);
    expect(notices.find((n) => n.key === `event:${reuniao.id}:2026-11-25`)).toMatchObject({ date: '2026-11-25', time: '14:15' });
    expect(notices.find((n) => n.key === `event:${academia.id}:2026-11-25`)).toMatchObject({ time: '17:30' });
    expect(notices.find((n) => n.key === `reminder:${racao.id}:2026-11-28`)).toMatchObject({ time: '09:00' });
  });

  it('lembrete único que passou sem concluir fica atrasado', () => {
    const old = newReminder({ title: 'Pagar luz', start_date: '2026-11-20', time: '10:00' }, USER, clock);
    expect(overdueReminders([old, racao], now).map((r) => r.title)).toEqual(['Pagar luz']);
  });
});

describe('agenda: repositório', () => {
  let repo: ReturnType<typeof createAgendaRepository>;
  let store: ReturnType<typeof createMemoryRowStore<AgendaRows>>;
  beforeEach(() => {
    store = createMemoryRowStore<AgendaRows>(AGENDA_TABLES, USER);
    repo = createAgendaRepository(store, USER, clock);
  });

  it('cria, edita, pula uma data, exclui e restaura', async () => {
    const e = await repo.createEvent({ title: 'Aula', start_date: '2026-11-02', start_time: '19:00', frequency: 'weekly' });
    await repo.updateEvent(e.id, { location: 'Sala 2' });
    const skipped = await repo.skipEventDate(e.id, '2026-11-09');
    expect(skipped.skipped_dates).toEqual(['2026-11-09']);
    await repo.removeEvent(e.id);
    expect((await repo.snapshot()).events).toHaveLength(0);
    await repo.restoreEvent(e.id);
    expect((await repo.snapshot()).events[0]?.location).toBe('Sala 2');
  });

  it('restaurar item que não existe mais avisa em vez de fingir que restaurou', async () => {
    await expect(repo.restoreEvent('00000000-0000-4000-8000-0000000000ff')).rejects.toMatchObject({ code: 'not_found' });
    await expect(repo.restoreReminder('00000000-0000-4000-8000-0000000000ff')).rejects.toMatchObject({ code: 'not_found' });
  });

  it('edição inválida não grava nada e vira erro de validação', async () => {
    const e = await repo.createEvent({ title: 'Aula', start_date: '2026-11-02' });
    await expect(repo.updateEvent(e.id, { title: '' })).rejects.toMatchObject({ code: 'validation' });
    expect((await repo.getEvent(e.id)).title).toBe('Aula');
  });

  it('não enxerga nem mexe na linha de outro dono', async () => {
    const theirs = createAgendaRepository(createMemoryRowStore<AgendaRows>(AGENDA_TABLES, OTHER), OTHER, clock);
    const r = await theirs.createReminder({ title: 'Deles', start_date: '2026-11-25', time: '08:00' });
    await expect(repo.getReminder(r.id)).rejects.toMatchObject({ code: 'not_found' });
  });

  it('concluir: único marca feito; repetido pula a data', async () => {
    const once = await repo.createReminder({ title: 'Uma vez', start_date: '2026-11-25', time: '08:00' });
    const daily = await repo.createReminder({ title: 'Remédio', start_date: '2026-11-01', time: '08:00', frequency: 'daily' });
    expect((await repo.completeReminder(once.id, '2026-11-25')).done_at).not.toBeNull();
    expect((await repo.completeReminder(daily.id, '2026-11-25')).skipped_dates).toEqual(['2026-11-25']);
  });
});
