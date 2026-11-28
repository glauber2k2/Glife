import type { PGlite, Transaction } from '@electric-sql/pglite';
import { beforeAll, describe, expect, it } from 'vitest';

import { USER_A, USER_B, asUser, createDatabase } from './harness';

let db: PGlite;

beforeAll(async () => {
  db = await createDatabase();
}, 60_000);

/** Executa como service_role (papel da Edge Function). A transação é desfeita. */
async function asService<T>(fn: (tx: Transaction) => Promise<T>): Promise<T> {
  let result!: T;
  let failure: unknown;
  await db
    .transaction(async (tx) => {
      await tx.exec('set local role service_role');
      try {
        result = await fn(tx);
      } catch (e) {
        failure = e;
      }
      await tx.rollback();
    })
    .catch(() => undefined);
  if (failure) throw failure;
  return result;
}

const insertTargets = (id: string, values: [number, number, number, number, number, number]) => (tx: Transaction) =>
  tx.query(`insert into public.investment_targets (id, fixed_income, stocks, reits, funds, crypto, other) values ($1, $2, $3, $4, $5, $6, $7)`, [id, ...values]);

describe('metas de alocação', () => {
  it('A grava e lê a própria meta', async () => {
    const mine = await asUser(db, USER_A, async (tx) => {
      await insertTargets(USER_A, [50, 15, 15, 0, 10, 10])(tx);
      return tx.query<{ stocks: number }>('select stocks from public.investment_targets');
    });
    expect(mine.rows).toEqual([{ stocks: 15 }]);
  });

  it('B não enxerga a meta de A', async () => {
    await db.query(`insert into public.investment_targets (id, user_id, fixed_income) values ($1, $1, 100)`, [USER_A]);
    const other = await asUser(db, USER_B, (tx) => tx.query('select * from public.investment_targets'));
    expect(other.rows).toEqual([]);
  });

  it('soma diferente de 100 é recusada', async () => {
    await expect(asUser(db, USER_B, insertTargets(USER_B, [50, 15, 15, 0, 10, 9]))).rejects.toThrow();
  });

  it('valor fora de 0–100 é recusado', async () => {
    await expect(asUser(db, USER_B, insertTargets(USER_B, [101, 0, 0, 0, 0, -1]))).rejects.toThrow();
  });

  it('segunda meta viva do mesmo usuário é recusada', async () => {
    await expect(
      asUser(db, USER_B, async (tx) => {
        await insertTargets(USER_B, [100, 0, 0, 0, 0, 0])(tx);
        await insertTargets('43000000-0000-4000-8000-00000000000b', [100, 0, 0, 0, 0, 0])(tx);
      }),
    ).rejects.toThrow();
  });
});

const key = JSON.stringify({ source: 'brapi', symbol: 'ITSA4' });
const points = (close: number) => JSON.stringify([{ date: '2026-11-26', close_e8: close }, { date: '2026-11-27', close_e8: 1085000000 }]);

describe('histórico diário e listas de mercado (só servidor)', () => {
  it('usuário logado não executa as funções nem lê as tabelas', async () => {
    await expect(asUser(db, USER_A, (tx) => tx.query('select * from public.market_prices_get($1)', [key]))).rejects.toThrow();
    await expect(asUser(db, USER_A, (tx) => tx.query('select public.market_prices_put($1, $2)', [key, points(1)]))).rejects.toThrow();
    await expect(asUser(db, USER_A, (tx) => tx.query('select public.market_history_fetched($1, $2)', [key, '2026-11-27']))).rejects.toThrow();
    await expect(asUser(db, USER_A, (tx) => tx.query('select public.market_lists_get($1)', ['brapi']))).rejects.toThrow();
    await expect(asUser(db, USER_A, (tx) => tx.query('select * from private.market_prices_daily'))).rejects.toThrow();
  });

  it('service_role grava, substitui na mesma data e lê em ordem', async () => {
    const rows = await asService(async (tx) => {
      await tx.query('select public.market_prices_put($1, $2)', [key, points(1000000000)]);
      await tx.query('select public.market_prices_put($1, $2)', [key, points(1050000000)]);
      return (await tx.query<{ date: string; close_e8: number }>(`select to_char(date, 'YYYY-MM-DD') as date, close_e8 from public.market_prices_get($1)`, [key])).rows;
    });
    expect(rows).toEqual([
      { date: '2026-11-26', close_e8: 1050000000 },
      { date: '2026-11-27', close_e8: 1085000000 },
    ]);
  });

  it('marca a busca do dia', async () => {
    const r = await asService(async (tx) => {
      const before = (await tx.query<{ f: boolean }>('select public.market_history_fetched($1, $2) as f', [key, '2026-11-27'])).rows[0]!.f;
      await tx.query('select public.market_history_mark($1, $2)', [key, '2026-11-27']);
      const after = (await tx.query<{ f: boolean }>('select public.market_history_fetched($1, $2) as f', [key, '2026-11-27'])).rows[0]!.f;
      const otherDay = (await tx.query<{ f: boolean }>('select public.market_history_fetched($1, $2) as f', [key, '2026-11-28'])).rows[0]!.f;
      return { before, after, otherDay };
    });
    expect(r).toEqual({ before: false, after: true, otherDay: false });
  });

  it('lista de mercado é substituída e lida com a hora da busca', async () => {
    const r = await asService(async (tx) => {
      await tx.query('select public.market_lists_put($1, $2)', ['brapi', JSON.stringify([{ ticker: 'A' }])]);
      await tx.query('select public.market_lists_put($1, $2)', ['brapi', JSON.stringify([{ ticker: 'B' }])]);
      return (await tx.query<{ payload: unknown; fetched_at: string | null }>('select payload, fetched_at from public.market_lists_get($1)', ['brapi'])).rows;
    });
    expect(r).toHaveLength(1);
    expect(r[0]!.payload).toEqual([{ ticker: 'B' }]);
    expect(r[0]!.fetched_at).not.toBeNull();
  });
});
