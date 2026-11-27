import type { PGlite } from '@electric-sql/pglite';
import { beforeAll, describe, expect, it } from 'vitest';

import { USER_A, USER_B, asUser, createDatabase } from './harness';

const PLAN_A = '51000000-0000-4000-8000-00000000000a';
const PLAN_B = '51000000-0000-4000-8000-00000000000b';

let db: PGlite;

beforeAll(async () => {
  db = await createDatabase();
  await db.query(
    `insert into public.meal_plans (id, user_id, name, time) values ($1, $2, 'Almoço', '12:30'), ($3, $4, 'Almoço B', '12:00')`,
    [PLAN_A, USER_A, PLAN_B, USER_B],
  );
  await db.query(`insert into public.events (user_id, title, start_date, end_date) values ($1, 'Evento de B', '2026-11-25', '2026-11-25')`, [USER_B]);
}, 60_000);

const fails = (sql: string) => asUser(db, USER_A, (tx) => tx.query(sql));

describe('agenda e dieta: isolamento e regras do banco', () => {
  it('A não enxerga eventos nem refeições de B', async () => {
    const r = await asUser(db, USER_A, (tx) => tx.query<{ n: number }>('select (select count(*) from public.events) + (select count(*) from public.meal_plans where user_id <> auth.uid()) as n'));
    expect(Number(r.rows[0]!.n)).toBe(0);
  });

  it('A não registra refeição apontando para o plano de B', async () => {
    await expect(fails(`insert into public.meals (date, time, plan_id) values ('2026-11-25', '12:40', '${PLAN_B}')`)).rejects.toThrow();
  });

  it('A registra refeição no próprio plano; excluir o plano deixa o registro sem ligação', async () => {
    const r = await asUser(db, USER_A, async (tx) => {
      await tx.query(`insert into public.meals (date, time, plan_id) values ('2026-11-25', '12:40', '${PLAN_A}')`);
      await tx.query(`delete from public.meal_plans where id = '${PLAN_A}'`);
      return tx.query<{ plan_id: string | null }>('select plan_id from public.meals');
    });
    expect(r.rows).toEqual([{ plan_id: null }]);
  });

  it('o banco recusa hora inválida, fim antes do início e dia inteiro com hora de fim', async () => {
    await expect(fails(`insert into public.reminders (title, start_date, time) values ('X', '2026-11-25', '25:00')`)).rejects.toThrow();
    await expect(
      fails(`insert into public.events (title, start_date, start_time, end_date, end_time) values ('X', '2026-11-25', '10:00', '2026-11-25', '09:00')`),
    ).rejects.toThrow();
    await expect(fails(`insert into public.events (title, start_date, end_date, end_time) values ('X', '2026-11-25', '2026-11-25', '09:00')`)).rejects.toThrow();
  });

  it('lembrete com vários horários: lista e intervalo como o app envia; o banco recusa o incoerente', async () => {
    const ok = (sql: string) => asUser(db, USER_A, (tx) => tx.query(sql));
    await ok(`insert into public.reminders (title, start_date, time, time_mode, times, done_slots) values ('Remédio', '2026-11-25', '08:00', 'list', '["08:00","20:00"]', '["2026-11-25T08:00"]')`);
    await ok(`insert into public.reminders (title, start_date, time, time_mode, every_minutes, end_time) values ('Água', '2026-11-25', '08:00', 'interval', 120, '18:00')`);
    await expect(fails(`insert into public.reminders (title, start_date, time, time_mode, times) values ('X', '2026-11-25', '08:00', 'list', '["08:00"]')`)).rejects.toThrow();
    await expect(fails(`insert into public.reminders (title, start_date, time, time_mode, every_minutes, end_time) values ('X', '2026-11-25', '08:00', 'interval', 10, '18:00')`)).rejects.toThrow();
    await expect(fails(`insert into public.reminders (title, start_date, time, time_mode, every_minutes, end_time) values ('X', '2026-11-25', '08:00', 'interval', 60, '07:00')`)).rejects.toThrow();
    await expect(fails(`insert into public.reminders (title, start_date, time, every_minutes) values ('X', '2026-11-25', '08:00', 60)`)).rejects.toThrow();
    await expect(fails(`insert into public.reminders (title, start_date, time, time_mode, times, done_at) values ('X', '2026-11-25', '08:00', 'list', '["08:00","09:00"]', now())`)).rejects.toThrow();
  });

  it('plano precisa de ao menos um dia', async () => {
    await expect(fails(`insert into public.meal_plans (name, time, weekdays) values ('X', '10:00', 0)`)).rejects.toThrow();
  });
  it('metas da dieta: B não enxerga as de A, uma linha viva por usuário e valores limitados', async () => {
    await db.query(`insert into public.diet_goals (user_id, kcal_target) values ($1, 2000)`, [USER_B]);
    const n = await asUser(db, USER_A, (tx) => tx.query<{ n: number }>('select count(*)::int as n from public.diet_goals'));
    expect(Number(n.rows[0]!.n)).toBe(0);
    await expect(
      asUser(db, USER_A, async (tx) => {
        await tx.query(`insert into public.diet_goals (kcal_target) values (2200)`);
        await tx.query(`insert into public.diet_goals (kcal_target) values (1800)`);
      }),
    ).rejects.toThrow();
    await expect(fails(`insert into public.diet_goals (kcal_target) values (30000)`)).rejects.toThrow();
    await expect(fails(`insert into public.meals (date, time, kcal) values ('2026-11-25', '12:40', -1)`)).rejects.toThrow();
  });
});
