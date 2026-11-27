import type { PGlite } from '@electric-sql/pglite';
import { beforeAll, describe, expect, it } from 'vitest';

import { USER_A, USER_B, asUser, createDatabase } from './harness';

let db: PGlite;
let planB: string;

const PLAN = `insert into public.bible_plans (name, groups, days, weekdays, start_date) values ('Salmos', '{poet}', 30, '{0,1,2,3,4,5,6}', '2026-11-27') returning id`;

beforeAll(async () => {
  db = await createDatabase();
  // dados de B gravados direto (asUser desfaz tudo ao terminar)
  const r = await db.query<{ id: string }>(
    `insert into public.bible_plans (user_id, name, groups, days, weekdays, start_date) values ($1, 'Salmos', '{poet}', 30, '{0,1,2,3,4,5,6}', '2026-11-27') returning id`,
    [USER_B],
  );
  planB = r.rows[0]!.id;
  await db.query(`insert into public.bible_plan_reads (user_id, plan_id, ref, read_on) values ($1, $2, 'PSA.23', '2026-11-27')`, [USER_B, planB]);
}, 60_000);

const asA = <T,>(sql: string, params: unknown[] = []) => asUser(db, USER_A, (tx) => tx.query<T>(sql, params));

describe('planos de leitura: isolamento e regras do banco', () => {
  it('A não enxerga nem altera os planos e leituras de B', async () => {
    expect(Number((await asA<{ n: number }>('select count(*) as n from public.bible_plans')).rows[0]!.n)).toBe(0);
    expect(Number((await asA<{ n: number }>('select count(*) as n from public.bible_plan_reads')).rows[0]!.n)).toBe(0);
    const u = await asA(`update public.bible_plans set name = 'x'`);
    expect(u.affectedRows ?? 0).toBe(0);
  });

  it('A não consegue registrar leitura no plano de B (FK composta)', async () => {
    await expect(asA(`insert into public.bible_plan_reads (plan_id, ref, read_on) values ($1, 'PSA.24', '2026-11-27')`, [planB])).rejects.toThrow();
  });

  it('A cria plano e grava a mesma leitura duas vezes (cópias de aparelhos offline são aceitas)', async () => {
    const r = await asUser(db, USER_A, async (tx) => {
      const p = await tx.query<{ id: string }>(PLAN);
      const id = p.rows[0]!.id;
      await tx.query(`insert into public.bible_plan_reads (plan_id, ref, read_on) values ($1, 'PSA.1', '2026-11-27'), ($1, 'PSA.1', '2026-11-27')`, [id]);
      return tx.query<{ n: number }>('select count(*) as n from public.bible_plan_reads where plan_id = $1', [id]);
    });
    expect(Number(r.rows[0]!.n)).toBe(2);
  });

  it.each([
    ['dia da semana repetido', `'{1,1}'`, `'{poet}'`, `null`, 30],
    ['dia da semana fora de 0–6', `'{7}'`, `'{poet}'`, `null`, 30],
    ['sem dias da semana', `'{}'`, `'{poet}'`, `null`, 30],
    ['sem grupos', `'{1}'`, `'{}'`, `null`, 30],
    ['grupo desconhecido', `'{1}'`, `'{salmos}'`, `null`, 30],
    ['lembrete 25:00', `'{1}'`, `'{poet}'`, `'25:00'`, 30],
    ['duração 0', `'{1}'`, `'{poet}'`, `null`, 0],
    ['duração 731', `'{1}'`, `'{poet}'`, `null`, 731],
  ])('recusa plano com %s', async (_, weekdays, groups, reminder, days) => {
    await expect(
      asA(`insert into public.bible_plans (name, groups, days, weekdays, start_date, reminder_time) values ('P', ${groups}, ${days}, ${weekdays}, '2026-11-27', ${reminder})`),
    ).rejects.toThrow();
  });

  it('recusa pausas que não são lista e leitura com ref de versículo (só capítulo)', async () => {
    await expect(asA(`insert into public.bible_plans (name, groups, days, weekdays, start_date, pauses) values ('P', '{poet}', 30, '{1}', '2026-11-27', '{"a":1}')`)).rejects.toThrow();
    const p = await asA<{ id: string }>(PLAN);
    await expect(asA(`insert into public.bible_plan_reads (plan_id, ref, read_on) values ($1, 'PSA.23.1', '2026-11-27')`, [p.rows[0]!.id])).rejects.toThrow();
  });
});
