import { planOngoingInstallments, planPreviousBalance } from '@glife/domain/finance';
import { describe, expect, it } from 'vitest';

import { createLocalFinance } from '../src/features/finance/data/localFinanceStore';
import { financeTables } from '../src/features/finance/data/schema';
import { createSqliteLocalDb } from './support/sqliteLocalDb';

const USER = '11110000-0000-4000-8000-000000000001';
const TODAY = '2026-11-24';

// Cadastro de cartão já em uso: saldo anterior + parcelamentos em andamento, no banco local.
describe('cartão em uso com parcelamentos (SQLite local)', () => {
  it('grava o saldo anterior e as parcelas que faltam', async () => {
    const db = await createSqliteLocalDb(financeTables);
    const finance = createLocalFinance(db, USER);
    const bank = await finance.accounts.create({ kind: 'checking', name: 'Banco', initial_balance_cents: 0 });
    const card = await finance.accounts.create({
      kind: 'credit_card',
      name: 'Cartão',
      closing_day: 1,
      due_day: 8,
      credit_limit_cents: null,
      payment_account_id: bank.id,
    });
    const rows = [
      planPreviousBalance({ card, amountCents: 50_000, today: TODAY }),
      ...planOngoingInstallments({
        card,
        description: 'Celular',
        category_id: null,
        installmentCents: 10_000,
        currentIndex: 3,
        count: 10,
        today: TODAY,
      }),
    ];
    const created = await finance.transactions.createMany(rows);
    expect(created).toHaveLength(9);
    expect(created.filter((t) => t.installment_of !== null).every((t) => t.installment_of === created[1]!.id)).toBe(true);
  });

  it('varre fechamento e vencimento', async () => {
    const db = await createSqliteLocalDb(financeTables);
    const finance = createLocalFinance(db, USER);
    const bank = await finance.accounts.create({ kind: 'checking', name: 'Banco', initial_balance_cents: 0 });
    const failures: string[] = [];
    for (let closing = 1; closing <= 31; closing += 1) {
      for (let due = 1; due <= 31; due += 1) {
        try {
          const card = await finance.accounts.create({
            kind: 'credit_card',
            name: `C${closing}-${due}`,
            closing_day: closing,
            due_day: due,
            credit_limit_cents: null,
            payment_account_id: bank.id,
          });
          await finance.transactions.createMany([
            planPreviousBalance({ card, amountCents: 100, today: TODAY }),
            ...planOngoingInstallments({ card, description: 'X', category_id: null, installmentCents: 100, currentIndex: 1, count: 3, today: TODAY }),
          ]);
        } catch (e) {
          failures.push(`${closing}/${due}: ${String(e)} ${String((e as { cause?: unknown }).cause ?? '')}`);
        }
      }
    }
    expect(failures.slice(0, 5)).toEqual([]);
  }, 60_000);
});
