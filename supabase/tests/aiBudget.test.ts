import type { PGlite, Transaction } from '@electric-sql/pglite';
import { beforeAll, describe, expect, it } from 'vitest';

import { asUser, createDatabase, USER_A, USER_B } from './harness.ts';

// Teto e uso da IA em micro-dólares (US$ 1 = 1.000.000): o usuário paga a DeepSeek em dólar, sem cotação.

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

const status = (tx: Transaction, user: string) =>
  tx
    .query<{ cap_micro_usd: number; spent_micro_usd: number }>('select cap_micro_usd::float8 as cap_micro_usd, spent_micro_usd::float8 as spent_micro_usd from public.ai_budget_status($1)', [user])
    .then((r) => r.rows[0]);

const reserve = (tx: Transaction, user: string, microUsd: number) =>
  tx.query<{ id: string | null }>('select public.ai_reserve_budget($1, $2) as id', [user, microUsd]).then((r) => r.rows[0]!.id);

const settle = (tx: Transaction, id: string, user: string, microUsd: number) =>
  tx.query('select public.ai_settle_usage($1, $2, $3, $4, $5, $6)', [id, user, microUsd, 10, 20, 30]);

describe('IA: teto em dólar', () => {
  it('sem nada gravado: teto de US$ 2,00 e nada gasto', async () => {
    expect(await asService((tx) => status(tx, USER_A))).toEqual({ cap_micro_usd: 2_000_000, spent_micro_usd: 0 });
  });

  it('reserva conta no gasto do próprio usuário e recusa quando o teto já foi alcançado', async () => {
    const out = await asService(async (tx) => {
      const first = await reserve(tx, USER_B, 1_990_000); // 0 < 2.000.000: passa
      const second = await reserve(tx, USER_B, 50_000); // 1.990.000 < 2.000.000: passa
      const third = await reserve(tx, USER_B, 50_000); // 2.040.000 >= 2.000.000: recusa
      return { first, second, third, b: await status(tx, USER_B), a: await status(tx, USER_A) };
    });
    expect(out.first).toMatch(/^[0-9a-f-]{36}$/);
    expect(out.second).toMatch(/^[0-9a-f-]{36}$/);
    expect(out.third).toBeNull();
    expect(out.b).toEqual({ cap_micro_usd: 2_000_000, spent_micro_usd: 2_040_000 });
    expect(out.a!.spent_micro_usd).toBe(0);
  });

  it('acerta a reserva com o custo real', async () => {
    const s = await asService(async (tx) => {
      const id = (await reserve(tx, USER_B, 50_000))!;
      await settle(tx, id, USER_B, 3_000);
      return status(tx, USER_B);
    });
    expect(s!.spent_micro_usd).toBe(3_000);
  });

  it('usa o teto de ai_settings quando existe', async () => {
    const s = await asService(async (tx) => {
      await tx.query('insert into public.ai_settings (user_id, cap_micro_usd) values ($1, 5000000)', [USER_A]);
      return status(tx, USER_A);
    });
    expect(s).toEqual({ cap_micro_usd: 5_000_000, spent_micro_usd: 0 });
  });

  it('uso do mês anterior não conta', async () => {
    const s = await asService(async (tx) => {
      await tx.query(
        `insert into public.ai_usage (user_id, cost_micro_usd, cache_hit_tokens, cache_miss_tokens, output_tokens, created_at, updated_at)
         values ($1, 900000, 0, 0, 0, now() - interval '40 days', now() - interval '40 days')`,
        [USER_A],
      );
      return status(tx, USER_A);
    });
    expect(s!.spent_micro_usd).toBe(0);
  });

  it('o usuário lê o próprio uso, mas não grava nem chama as funções', async () => {
    await expect(
      asUser(db, USER_A, (tx) =>
        tx.query(`insert into public.ai_usage (user_id, cost_micro_usd, cache_hit_tokens, cache_miss_tokens, output_tokens) values ('${USER_A}', 0, 0, 0, 0)`),
      ),
    ).rejects.toThrow();
    await expect(asUser(db, USER_A, (tx) => reserve(tx, USER_A, 1))).rejects.toThrow();
    await expect(asUser(db, USER_A, (tx) => status(tx, USER_A))).rejects.toThrow();
    const rows = await asUser(db, USER_A, (tx) => tx.query('select id from public.ai_usage'));
    expect(Array.isArray(rows.rows)).toBe(true);
  });

  it('o teto aceita só valores entre US$ 0 e US$ 100', async () => {
    await expect(asService((tx) => tx.query('insert into public.ai_settings (user_id, cap_micro_usd) values ($1, 100000001)', [USER_B]))).rejects.toThrow();
  });
});
