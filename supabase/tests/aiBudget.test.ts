import type { PGlite, Transaction } from '@electric-sql/pglite';
import { beforeAll, describe, expect, it } from 'vitest';

import { asUser, createDatabase, USER_A, USER_B } from './harness.ts';

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
  tx.query<{ cap_cents: number; spent_cents: number }>('select cap_cents, spent_cents from public.ai_budget_status($1)', [user]).then((r) => r.rows[0]);

const record = (tx: Transaction, user: string, cents: number) =>
  tx.query('select public.ai_record_usage($1, $2, $3, $4, $5, $6)', [user, cents * 1000, cents, 10, 20, 30]);

describe('IA: uso e teto', () => {
  it('sem nada gravado: teto de R$ 20,00 e nada gasto', async () => {
    expect(await asService((tx) => status(tx, USER_A))).toEqual({ cap_cents: 2000, spent_cents: 0 });
  });

  it('soma o uso do mês só do próprio usuário', async () => {
    const [a, b] = await asService(async (tx) => {
      await record(tx, USER_A, 540);
      await record(tx, USER_A, 540);
      return [await status(tx, USER_A), await status(tx, USER_B)];
    });
    expect(a).toEqual({ cap_cents: 2000, spent_cents: 1080 });
    expect(b).toEqual({ cap_cents: 2000, spent_cents: 0 });
  });

  it('usa o teto de ai_settings quando existe', async () => {
    const s = await asService(async (tx) => {
      await tx.query('insert into public.ai_settings (user_id, cap_cents) values ($1, 5000)', [USER_A]);
      return status(tx, USER_A);
    });
    expect(s).toEqual({ cap_cents: 5000, spent_cents: 0 });
  });

  it('uso do mês anterior não conta', async () => {
    const s = await asService(async (tx) => {
      await tx.query(
        `insert into public.ai_usage (user_id, cost_micro_usd, cost_cents, cache_hit_tokens, cache_miss_tokens, output_tokens, created_at, updated_at)
         values ($1, 1, 900, 0, 0, 0, now() - interval '40 days', now() - interval '40 days')`,
        [USER_A],
      );
      return status(tx, USER_A);
    });
    expect(s!.spent_cents).toBe(0);
  });

  it('o usuário lê o próprio uso, mas não grava nem chama as funções', async () => {
    await asService((tx) => record(tx, USER_A, 10).then(() => undefined));
    await expect(
      asUser(db, USER_A, (tx) =>
        tx.query(`insert into public.ai_usage (user_id, cost_micro_usd, cost_cents, cache_hit_tokens, cache_miss_tokens, output_tokens) values ('${USER_A}', 0, 0, 0, 0, 0)`),
      ),
    ).rejects.toThrow();
    await expect(asUser(db, USER_A, (tx) => record(tx, USER_A, 1))).rejects.toThrow();
    await expect(asUser(db, USER_A, (tx) => status(tx, USER_A))).rejects.toThrow();
    const rows = await asUser(db, USER_A, (tx) => tx.query('select id from public.ai_usage'));
    expect(Array.isArray(rows.rows)).toBe(true);
  });

  it('o teto aceita só valores entre 0 e R$ 1.000,00', async () => {
    await expect(asService((tx) => tx.query('insert into public.ai_settings (user_id, cap_cents) values ($1, 100001)', [USER_B]))).rejects.toThrow();
  });
});
