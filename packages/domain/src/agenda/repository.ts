// Repositório da agenda sobre um RowStore (SQLite no app, memória nos testes). Regras aqui; o armazenamento só
// guarda linhas. Excluir é lógico (lixeira) e todo método devolve a linha como ficou.
import { RepositoryError, aliveRow, guardRules, repositoryErrorOf, restore, softDelete, type ErrorListener, type Listener, type RowStore, type Unsubscribe } from '../core/index.ts';
import type { IsoDate } from '../time/index.ts';
import {
  applyEventPatch,
  applyReminderPatch,
  completeReminder,
  uncompleteReminder,
  newEvent,
  newReminder,
  skipEventDate,
  type CalendarEvent,
  type EventDraft,
  type EventPatch,
  type Reminder,
  type ReminderDraft,
  type ReminderPatch,
} from './model.ts';

export type AgendaRows = {
  events: CalendarEvent;
  reminders: Reminder;
};
export const AGENDA_TABLES = ['events', 'reminders'] as const;

export interface AgendaSnapshot {
  events: CalendarEvent[];
  reminders: Reminder[];
}

export interface AgendaRepository {
  snapshot(): Promise<AgendaSnapshot>;
  watch(listener: Listener<AgendaSnapshot>, onError?: ErrorListener): Unsubscribe;
  getEvent(id: string): Promise<CalendarEvent>;
  createEvent(draft: EventDraft): Promise<CalendarEvent>;
  updateEvent(id: string, patch: EventPatch): Promise<CalendarEvent>;
  /** Pula só esta data de um evento que se repete. */
  skipEventDate(id: string, date: IsoDate): Promise<CalendarEvent>;
  removeEvent(id: string): Promise<void>;
  restoreEvent(id: string): Promise<void>;
  getReminder(id: string): Promise<Reminder>;
  createReminder(draft: ReminderDraft): Promise<Reminder>;
  updateReminder(id: string, patch: ReminderPatch): Promise<Reminder>;
  /** Único: marca como feito. Repetido: pula esta data. Várias vezes no dia: conclui só o horário `time`. */
  completeReminder(id: string, date: IsoDate, time?: string): Promise<Reminder>;
  /** Desfaz o feito desta data (ou do horário `time`). */
  uncompleteReminder(id: string, date: IsoDate, time?: string): Promise<Reminder>;
  removeReminder(id: string): Promise<void>;
  restoreReminder(id: string): Promise<void>;
}

export function createAgendaRepository(store: RowStore<AgendaRows>, userId: string, clock?: () => Date): AgendaRepository {
  const read = async (): Promise<AgendaSnapshot> => ({
    events: await store.listAlive('events'),
    reminders: await store.listAlive('reminders'),
  });
  /** Lê, muda e grava a mesma linha dentro de uma transação. */
  const change = <K extends 'events' | 'reminders'>(table: K, id: string, fn: (row: AgendaRows[K]) => AgendaRows[K]) =>
    guardRules(() =>
      store.transaction(async (tx) => {
        const next = fn(await aliveRow(tx, table, id));
        await tx.put(table, next);
        return next;
      }),
    );
  const remove = (table: 'events' | 'reminders', id: string) =>
    change(table, id, (row) => softDelete(row, clock)).then(() => undefined);
  const undelete = (table: 'events' | 'reminders', id: string) =>
    guardRules(async () => {
      const row = await store.get(table, id);
      // Item que não existe mais (apagado de vez): avisa em vez de fingir que restaurou.
      if (!row) throw new RepositoryError('not_found');
      if (row.deleted_at !== null) await store.put(table, restore(row, clock));
    });
  const create = async <T extends CalendarEvent | Reminder>(table: 'events' | 'reminders', row: T) => {
    await store.put(table, row);
    return row;
  };

  return {
    snapshot: () => guardRules(read),
    watch: (listener, onError) =>
      store.watch(
        () => void read().then(listener, (e) => onError?.(repositoryErrorOf(e))),
        (e) => onError?.(repositoryErrorOf(e)),
      ),
    getEvent: (id) => guardRules(() => aliveRow<AgendaRows, 'events'>(store, 'events', id)),
    createEvent: (draft) => guardRules(() => create('events', newEvent(draft, userId, clock))),
    updateEvent: (id, patch) => change('events', id, (e) => applyEventPatch(e, patch, clock)),
    skipEventDate: (id, date) => change('events', id, (e) => skipEventDate(e, date, clock)),
    removeEvent: (id) => remove('events', id),
    restoreEvent: (id) => undelete('events', id),
    getReminder: (id) => guardRules(() => aliveRow<AgendaRows, 'reminders'>(store, 'reminders', id)),
    createReminder: (draft) => guardRules(() => create('reminders', newReminder(draft, userId, clock))),
    updateReminder: (id, patch) => change('reminders', id, (r) => applyReminderPatch(r, patch, clock)),
    completeReminder: (id, date, time) => change('reminders', id, (r) => completeReminder(r, date, clock, time)),
    uncompleteReminder: (id, date, time) => change('reminders', id, (r) => uncompleteReminder(r, date, clock, time)),
    removeReminder: (id) => remove('reminders', id),
    restoreReminder: (id) => undelete('reminders', id),
  };
}
