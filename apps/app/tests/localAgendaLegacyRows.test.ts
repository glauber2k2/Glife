import { describe, expect, it } from 'vitest';

import { agendaBetween } from '@glife/domain/agenda';

import { createLocalAgenda } from '../src/features/agenda/data/localAgenda';
import { agendaTables } from '../src/features/agenda/data/schema';
import { createSqliteLocalDb } from './support/sqliteLocalDb';

const USER = '11110000-0000-4000-8000-000000000001';
const ID = '22220000-0000-4000-8000-000000000002';

// Lembrete de antes da 0.9: o sync não reenvia a linha só porque o banco ganhou colunas, então ela chega sem elas.
describe('lembrete antigo no banco local (sem as colunas de vários horários)', () => {
  it('é lido como de uma vez só, aparece na agenda e continua editável', async () => {
    const db = await createSqliteLocalDb(agendaTables);
    await db.execute(
      `INSERT INTO reminders (id, user_id, title, notes, start_date, time, frequency, interval_count, weekdays, skipped_dates, created_at, updated_at)
       VALUES (?, ?, 'Pagar luz', '', '2026-11-25', '09:00', 'daily', 1, 0, '[]', '2026-11-25T00:00:00.000Z', '2026-11-25T00:00:00.000Z')`,
      [ID, USER],
    );
    const repo = createLocalAgenda(db, USER, () => new Date('2026-11-25T12:00:00.000Z'));
    const r = await repo.getReminder(ID);
    expect(r).toMatchObject({ time_mode: 'once', times: [], done_slots: [], every_minutes: null, end_time: null });
    const { reminders } = await repo.snapshot();
    expect(agendaBetween([], reminders, '2026-11-25', '2026-11-25').map((i) => i.time)).toEqual(['09:00']);
    await expect(repo.updateReminder(ID, { title: 'Pagar a luz' })).resolves.toMatchObject({ title: 'Pagar a luz', time_mode: 'once' });
    await expect(repo.completeReminder(ID, '2026-11-25')).resolves.toMatchObject({ skipped_dates: ['2026-11-25'] });
  });
});
