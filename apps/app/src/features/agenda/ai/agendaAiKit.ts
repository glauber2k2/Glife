// Executores das ferramentas de agenda do Glife IA (definições em `@glife/domain/agenda` → ai-tools). Usam o mesmo
// repositório das telas. Saídas com apelidos (e1, r1) e texto mascarado; nada de ids reais.
import { agendaBetween, type AgendaRepository, type CalendarEvent, type EventPatch, type Reminder, type ReminderPatch } from '@glife/domain/agenda';
import { resolveAlias, type AiExecContext, type AiToolKit } from '@glife/domain/ai';

const dm = (date: string) => `${date.slice(8, 10)}/${date.slice(5, 7)}`;
const when = (date: string, time: string | null | undefined) => (time ? `${dm(date)} ${time}` : `${dm(date)}, dia inteiro`);

type Masker = AiExecContext['aliases'];
const unmaskText = <T extends Record<string, unknown>>(obj: T, aliases: Masker, keys: readonly string[]): T =>
  Object.fromEntries(Object.entries(obj).map(([k, v]) => [k, keys.includes(k) && typeof v === 'string' ? aliases.unmask(v) : v])) as T;

const TEXT_KEYS = ['title', 'notes', 'location'] as const;

const pickBefore = <T extends object>(row: T, patch: object) => Object.fromEntries(Object.keys(patch).map((k) => [k, row[k as keyof T]]));

export function createAgendaAiKit(agenda: AgendaRepository): AiToolKit {
  return {
    executors: {
      async agenda_list(input, ctx) {
        const { from, to } = input as { from: string; to: string };
        const snap = await agenda.snapshot();
        const items = agendaBetween(snap.events, snap.reminders, from, to).map((i) => ({
          [i.kind]: ctx.aliases.alias(i.kind, i.id),
          title: ctx.aliases.mask(i.title),
          date: i.date,
          time: i.time,
          end_time: i.end_time,
          location: i.location ? ctx.aliases.mask(i.location) : null,
          repeats: i.repeats,
          done: i.done,
        }));
        return { output: { items }, touches: [], summary: '' };
      },
      async event_create(input, ctx) {
        const i = unmaskText(input as Record<string, unknown>, ctx.aliases, TEXT_KEYS) as unknown as CalendarEvent;
        const e = await agenda.createEvent({ ...i, end_date: i.end_date ?? i.start_date });
        return { output: { event: ctx.aliases.alias('event', e.id) }, touches: [{ entity: 'event', id: e.id, kind: 'create', before: null }], summary: `Evento criado: ${e.title} · ${when(e.start_date, e.start_time)}` };
      },
      async event_update(input, ctx) {
        const { event, ...rest } = input as { event: string } & Record<string, unknown>;
        const id = resolveAlias(ctx.aliases, 'event', event);
        const patch = Object.fromEntries(Object.entries(unmaskText(rest, ctx.aliases, TEXT_KEYS)).filter(([, v]) => v !== undefined)) as EventPatch;
        const before = await agenda.getEvent(id);
        const after = await agenda.updateEvent(id, patch);
        return { output: { event, ok: true }, touches: [{ entity: 'event', id, kind: 'update', before: pickBefore(before, patch) }], summary: `Evento alterado: ${after.title} · ${when(after.start_date, after.start_time)}` };
      },
      async event_trash(input, ctx) {
        const id = resolveAlias(ctx.aliases, 'event', (input as { event: string }).event);
        const e = await agenda.getEvent(id);
        await agenda.removeEvent(id);
        return { output: { ok: true }, touches: [{ entity: 'event', id, kind: 'trash', before: null }], summary: `Evento na lixeira: ${e.title}` };
      },
      async reminder_create(input, ctx) {
        const i = unmaskText(input as Record<string, unknown>, ctx.aliases, TEXT_KEYS) as unknown as Reminder;
        const r = await agenda.createReminder(i);
        return { output: { reminder: ctx.aliases.alias('reminder', r.id) }, touches: [{ entity: 'reminder', id: r.id, kind: 'create', before: null }], summary: `Lembrete criado: ${r.title} · ${when(r.start_date, r.time)}` };
      },
      async reminder_update(input, ctx) {
        const { reminder, ...rest } = input as { reminder: string } & Record<string, unknown>;
        const id = resolveAlias(ctx.aliases, 'reminder', reminder);
        const patch = Object.fromEntries(Object.entries(unmaskText(rest, ctx.aliases, TEXT_KEYS)).filter(([, v]) => v !== undefined)) as ReminderPatch;
        const before = await agenda.getReminder(id);
        const after = await agenda.updateReminder(id, patch);
        return { output: { reminder, ok: true }, touches: [{ entity: 'reminder', id, kind: 'update', before: pickBefore(before, patch) }], summary: `Lembrete alterado: ${after.title} · ${when(after.start_date, after.time)}` };
      },
      async reminder_complete(input, ctx) {
        const { reminder, date, time } = input as { reminder: string; date: string; time?: string };
        const id = resolveAlias(ctx.aliases, 'reminder', reminder);
        const r = await agenda.completeReminder(id, date, time);
        // O "antes" guarda a data (e o horário) concluídos: desfazer chama `uncompleteReminder`.
        return { output: { reminder, ok: true }, touches: [{ entity: 'reminder', id, kind: 'update', before: { __complete: { date, time: time ?? null } } }], summary: `Lembrete feito: ${r.title} · ${dm(date)}` };
      },
      async reminder_trash(input, ctx) {
        const id = resolveAlias(ctx.aliases, 'reminder', (input as { reminder: string }).reminder);
        const r = await agenda.getReminder(id);
        await agenda.removeReminder(id);
        return { output: { ok: true }, touches: [{ entity: 'reminder', id, kind: 'trash', before: null }], summary: `Lembrete na lixeira: ${r.title}` };
      },
    },
    preview: {
      async event_trash(input, ctx) {
        const e = await agenda.getEvent(resolveAlias(ctx.aliases, 'event', (input as { event: string }).event));
        return `Mandar para a lixeira o evento: ${e.title} · ${when(e.start_date, e.start_time)}`;
      },
      async reminder_trash(input, ctx) {
        const r = await agenda.getReminder(resolveAlias(ctx.aliases, 'reminder', (input as { reminder: string }).reminder));
        return `Mandar para a lixeira o lembrete: ${r.title} · ${when(r.start_date, r.time)}`;
      },
    },
    undo: {
      async event(t) {
        if (t.kind === 'create') await agenda.removeEvent(t.id);
        else if (t.kind === 'trash') await agenda.restoreEvent(t.id);
        else await agenda.updateEvent(t.id, (t.before ?? {}) as EventPatch);
      },
      async reminder(t) {
        if (t.kind === 'create') await agenda.removeReminder(t.id);
        else if (t.kind === 'trash') await agenda.restoreReminder(t.id);
        else {
          const done = (t.before as { __complete?: { date: string; time: string | null } } | null)?.__complete;
          if (done) await agenda.uncompleteReminder(t.id, done.date, done.time ?? undefined);
          else await agenda.updateReminder(t.id, (t.before ?? {}) as ReminderPatch);
        }
      },
    },
  };
}
