import type { PGlite, Transaction } from '@electric-sql/pglite';
import { beforeAll, describe, expect, it } from 'vitest';

import { USER_A, USER_B, asUser, createDatabase } from './harness';

const ACC_A = '41000000-0000-4000-8000-00000000000a';
const ACC_B = '41000000-0000-4000-8000-00000000000b';
const ASSET_A = '42000000-0000-4000-8000-00000000000a';
const ASSET_B = '42000000-0000-4000-8000-00000000000b';

let db: PGlite;

beforeAll(async () => {
  db = await createDatabase();
  await db.query(`insert into public.accounts (id, user_id, name, kind) values ($1, $2, 'Itaú', 'checking'), ($3, $4, 'Nubank B', 'checking')`, [
    ACC_A,
    USER_A,
    ACC_B,
    USER_B,
  ]);
  await db.query(
    `insert into public.investment_assets (id, user_id, name, kind, quote_symbol) values ($1, $2, 'Itaúsa', 'stocks', 'ITSA4'), ($3, $4, 'CDB B', 'fixed_income', null)`,
    [ASSET_A, USER_A, ASSET_B, USER_B],
  );
}, 60_000);

const insertMov = (fields: string, values: string) => (tx: Transaction) =>
  tx.query(`insert into public.investment_movements (${fields}) values (${values})`);

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

describe('investimentos: isolamento e regras do banco', () => {
  it('B não enxerga os ativos de A', async () => {
    const r = await asUser(db, USER_B, (tx) => tx.query<{ id: string }>('select id from public.investment_assets'));
    expect(r.rows.map((x) => x.id)).toEqual([ASSET_B]);
  });

  it('A grava aporte com conta e quantidade', async () => {
    const r = await asUser(db, USER_A, async (tx) => {
      await insertMov('asset_id, kind, amount_cents, quantity, date, account_id', `'${ASSET_A}', 'contribution', 100000, 10000000000, '2026-11-25', '${ACC_A}'`)(tx);
      return tx.query<{ n: number }>('select count(*)::int as n from public.investment_movements');
    });
    expect(r.rows[0]!.n).toBe(1);
  });

  it('A não liga movimento ao ativo nem à conta de B (FK composta)', async () => {
    await expect(asUser(db, USER_A, insertMov('asset_id, kind, amount_cents, date', `'${ASSET_B}', 'contribution', 1, '2026-11-25'`))).rejects.toThrow();
    await expect(
      asUser(db, USER_A, insertMov('asset_id, kind, amount_cents, date, account_id', `'${ASSET_A}', 'contribution', 1, '2026-11-25', '${ACC_B}'`)),
    ).rejects.toThrow();
  });

  it('recusa rendimento zero, aporte negativo, quantidade negativa e conta em rendimento', async () => {
    await expect(asUser(db, USER_A, insertMov('asset_id, kind, amount_cents, date', `'${ASSET_A}', 'income', 0, '2026-11-25'`))).rejects.toThrow();
    await expect(asUser(db, USER_A, insertMov('asset_id, kind, amount_cents, date', `'${ASSET_A}', 'contribution', -5, '2026-11-25'`))).rejects.toThrow();
    await expect(
      asUser(db, USER_A, insertMov('asset_id, kind, amount_cents, quantity, date', `'${ASSET_A}', 'contribution', 5, -1, '2026-11-25'`)),
    ).rejects.toThrow();
    await expect(
      asUser(db, USER_A, insertMov('asset_id, kind, amount_cents, date, account_id', `'${ASSET_A}', 'income', 5, '2026-11-25', '${ACC_A}'`)),
    ).rejects.toThrow();
  });

  it('rendimento negativo é aceito', async () => {
    await asUser(db, USER_A, insertMov('asset_id, kind, amount_cents, date', `'${ASSET_A}', 'income', -12000, '2026-11-25'`));
  });

  it('ação sem código e renda fixa com código são recusadas', async () => {
    await expect(asUser(db, USER_A, (tx) => tx.query(`insert into public.investment_assets (name, kind) values ('X', 'stocks')`))).rejects.toThrow();
    await expect(
      asUser(db, USER_A, (tx) => tx.query(`insert into public.investment_assets (name, kind, quote_symbol) values ('X', 'fixed_income', 'ABCD3')`)),
    ).rejects.toThrow();
  });
});

describe('cache de cotações (servidor)', () => {
  const keys = JSON.stringify([{ source: 'brapi', symbol: 'ITSA4' }]);
  const quotes = JSON.stringify([{ source: 'brapi', symbol: 'ITSA4', price_e8: 1023000000, name: 'Itaúsa', quoted_at: '2026-11-25T13:07:00Z' }]);

  it('usuário logado não lê nem grava o cache', async () => {
    await expect(asUser(db, USER_A, (tx) => tx.query('select * from public.market_quotes_get($1)', [keys]))).rejects.toThrow();
    await expect(asUser(db, USER_A, (tx) => tx.query('select public.market_quotes_put($1)', [quotes]))).rejects.toThrow();
    await expect(asUser(db, USER_A, (tx) => tx.query('select * from private.market_quotes'))).rejects.toThrow();
  });

  it('service_role grava, atualiza e lê pelas funções', async () => {
    const rows = await asService(async (tx) => {
      await tx.query('select public.market_quotes_put($1)', [quotes]);
      await tx.query('select public.market_quotes_put($1)', [quotes.replace('1023000000', '1100000000')]);
      return (await tx.query<{ symbol: string; price_e8: number }>('select symbol, price_e8 from public.market_quotes_get($1)', [keys])).rows;
    });
    expect(rows).toEqual([{ symbol: 'ITSA4', price_e8: 1100000000 }]);
  });
});
