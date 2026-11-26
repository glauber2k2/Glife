import type { PGlite } from '@electric-sql/pglite';
import { beforeAll, describe, expect, it } from 'vitest';

import { USER_A, USER_B, asUser, createDatabase } from './harness';

const CC_A = '40000000-0000-4000-8000-00000000000a';
const CARD_A = '40000000-0000-4000-8000-0000000000ca';
const CAT_A = '50000000-0000-4000-8000-00000000000a';
const CAT_B = '50000000-0000-4000-8000-00000000000b';
const TX_A = '60000000-0000-4000-8000-00000000000a';

let db: PGlite;

beforeAll(async () => {
  db = await createDatabase();
  await db.query(`insert into public.accounts (id, user_id, name, kind) values ($1, $2, 'Itaú', 'checking')`, [CC_A, USER_A]);
  await db.query(
    `insert into public.accounts (id, user_id, name, kind, closing_day, due_day, payment_account_id)
     values ($1, $2, 'Nubank', 'credit_card', 3, 10, $3)`,
    [CARD_A, USER_A, CC_A],
  );
  await db.query(
    `insert into public.categories (id, user_id, name, kind, color, icon) values ($1, $2, 'Mercado', 'expense', 'sage', 'cart'),
     ($3, $4, 'Mercado B', 'expense', 'sage', 'cart')`,
    [CAT_A, USER_A, CAT_B, USER_B],
  );
  await db.query(
    `insert into public.transactions (id, user_id, type, amount_cents, date, account_id, category_id, invoice_month)
     values ($1, $2, 'expense', 30000, '2026-11-28', $3, $4, '2026-12')`,
    [TX_A, USER_A, CARD_A, CAT_A],
  );
}, 60_000);

const count = async (tx: { query: PGlite['query'] }, sql: string) =>
  Number(((await tx.query<{ n: number }>(sql)).rows[0] as { n: number }).n);

const insertTx = (fields: string, values: string) => (tx: { query: PGlite['query'] }) =>
  tx.query(`insert into public.transactions (${fields}) values (${values})`);

describe('finanças: isolamento e regras do banco', () => {
  it('B não enxerga contas nem transações de A', async () => {
    const n = await asUser(db, USER_B, (tx) =>
      count(tx, 'select (select count(*) from public.transactions) + (select count(*) from public.accounts) as n'),
    );
    expect(n).toBe(0);
  });

  it('sessão sem MFA (aal1) não lê as transações nem do próprio dono', async () => {
    const n = await asUser(db, USER_A, (tx) => count(tx, 'select count(*)::int as n from public.transactions'), 'aal1');
    expect(n).toBe(0);
  });

  it('A não aponta para categoria de B (FK composta)', async () => {
    await expect(
      asUser(db, USER_A, insertTx('type, amount_cents, date, account_id, category_id', `'expense', 1, '2026-11-24', '${CC_A}', '${CAT_B}'`)),
    ).rejects.toThrow();
  });

  it('recusa valor zero ou negativo', async () => {
    await expect(
      asUser(db, USER_A, insertTx('type, amount_cents, date, account_id', `'expense', 0, '2026-11-24', '${CC_A}'`)),
    ).rejects.toThrow();
  });

  it('recusa transferência para a própria conta e transferência com categoria', async () => {
    await expect(
      asUser(db, USER_A, insertTx('type, amount_cents, date, account_id, to_account_id', `'transfer', 1, '2026-11-24', '${CC_A}', '${CC_A}'`)),
    ).rejects.toThrow();
    await expect(
      asUser(
        db,
        USER_A,
        insertTx('type, amount_cents, date, account_id, to_account_id, category_id', `'transfer', 1, '2026-11-24', '${CC_A}', '${CARD_A}', '${CAT_A}'`),
      ),
    ).rejects.toThrow();
  });

  it('recusa parcela incompleta e mês de fatura inválido', async () => {
    await expect(
      asUser(db, USER_A, insertTx('type, amount_cents, date, account_id, installment_index', `'expense', 1, '2026-11-24', '${CC_A}', 1`)),
    ).rejects.toThrow();
    await expect(
      asUser(db, USER_A, insertTx('type, amount_cents, date, account_id, invoice_month', `'expense', 1, '2026-11-24', '${CC_A}', '2026-13'`)),
    ).rejects.toThrow();
  });

  it('cartão precisa de fechamento e vencimento; conta comum não tem', async () => {
    await expect(
      asUser(db, USER_A, (tx) => tx.query(`insert into public.accounts (name, kind, due_day) values ('X', 'credit_card', 10)`)),
    ).rejects.toThrow();
    await expect(
      asUser(db, USER_A, (tx) => tx.query(`insert into public.accounts (name, kind, closing_day) values ('X', 'checking', 3)`)),
    ).rejects.toThrow();
  });

  it('um orçamento ativo por categoria e mês', async () => {
    await expect(
      asUser(db, USER_A, async (tx) => {
        await tx.query(`insert into public.budgets (category_id, starts_month, amount_cents) values ($1, '2026-12', 80000)`, [CAT_A]);
        await tx.query(`insert into public.budgets (category_id, starts_month, amount_cents) values ($1, '2026-12', 90000)`, [CAT_A]);
      }),
    ).rejects.toThrow();
  });

  it('orçamento zero encerra (aceito); negativo é recusado', async () => {
    const n = await asUser(db, USER_A, async (tx) => {
      await tx.query(`insert into public.budgets (category_id, starts_month, amount_cents) values ($1, '2027-03', 0)`, [CAT_A]);
      return count(tx, `select count(*)::int as n from public.budgets where starts_month = '2027-03' and amount_cents = 0`);
    });
    expect(n).toBe(1);
    await expect(
      asUser(db, USER_A, (tx) =>
        tx.query(`insert into public.budgets (category_id, starts_month, amount_cents) values ($1, '2027-04', -1)`, [CAT_A]),
      ),
    ).rejects.toThrow();
  });

  it('A grava a própria transação normalmente', async () => {
    const n = await asUser(db, USER_A, async (tx) => {
      await insertTx('type, amount_cents, date, account_id', `'expense', 1, '2026-11-24', '${CC_A}'`)(tx);
      return count(tx, 'select count(*)::int as n from public.transactions');
    });
    expect(n).toBe(2);
  });

  it('compras: lista de A não usa categoria de B; item não vai para lista de B', async () => {
    await expect(
      asUser(db, USER_A, (tx) => tx.query(`insert into public.shopping_lists (name, category_id) values ('Mercado', $1)`, [CAT_B])),
    ).rejects.toThrow();
    const listB = await asUser(db, USER_B, async (tx) => {
      const r = await tx.query<{ id: string }>(`insert into public.shopping_lists (name) values ('Feira') returning id`);
      return r.rows[0]!.id;
    });
    await expect(
      asUser(db, USER_A, (tx) => tx.query(`insert into public.shopping_items (list_id, name) values ($1, 'Arroz')`, [listB])),
    ).rejects.toThrow();
  });

  it('compras: recusa quantidade zero e preço zero; A lê só as próprias listas', async () => {
    const newList = async (tx: { query: PGlite['query'] }) =>
      (await tx.query<{ id: string }>(`insert into public.shopping_lists (name, category_id) values ('Mercado', $1) returning id`, [CAT_A]))
        .rows[0]!.id;
    const n = await asUser(db, USER_A, async (tx) => {
      const list = await newList(tx);
      await tx.query(`insert into public.shopping_items (list_id, name, quantity, unit_price_cents) values ($1, 'Arroz', 2, 2790)`, [list]);
      return count(tx, 'select count(*)::int as n from public.shopping_lists');
    });
    expect(n).toBeGreaterThanOrEqual(1);
    await expect(
      asUser(db, USER_A, async (tx) => tx.query(`insert into public.shopping_items (list_id, name, quantity) values ($1, 'X', 0)`, [await newList(tx)])),
    ).rejects.toThrow();
    await expect(
      asUser(db, USER_A, async (tx) =>
        tx.query(`insert into public.shopping_items (list_id, name, unit_price_cents) values ($1, 'X', 0)`, [await newList(tx)]),
      ),
    ).rejects.toThrow();
  });
  it('ajuste de saldo: só receita/despesa sem categoria', async () => {
    const ok = `user_id, type, amount_cents, date, account_id, is_adjustment`;
    await asUser(db, USER_A, insertTx(ok, `'${USER_A}', 'income', 500, '2026-11-27', '${CC_A}', true`));
    await expect(asUser(db, USER_A, insertTx(ok, `'${USER_A}', 'expense', 500, '2026-11-27', '${CC_A}', true`))).resolves.toBeDefined();
    await expect(
      asUser(db, USER_A, insertTx(`${ok}, category_id`, `'${USER_A}', 'expense', 500, '2026-11-27', '${CC_A}', true, '${CAT_A}'`)),
    ).rejects.toThrow();
  });
});
