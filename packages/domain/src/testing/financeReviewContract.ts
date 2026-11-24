// Casos levantados na revisão final de finanças: dividir regra, pagamento recorrente, orçamento offline,
// ocorrência confirmada em outro mês e troca de conta. Roda junto com `financeRepositoryContract`.
import { describe, expect, it } from 'vitest';

import { isRepositoryError } from '../core/index.ts';
import { budgetId, occurrenceId } from '../finance/index.ts';
import type { FinanceContractSubject } from './financeContract.ts';

async function expectCode(p: Promise<unknown>, code: string) {
  const error = await p.then(() => null, (e: unknown) => e);
  expect(isRepositoryError(error, code as never), `esperava erro ${code}, veio ${String(error)}`).toBe(true);
}

async function setup(make: () => Promise<FinanceContractSubject>) {
  const { finance } = await make();
  const cc = await finance.accounts.create({ name: 'Itaú', kind: 'checking' });
  const card = await finance.accounts.create({ name: 'Nu', kind: 'credit_card', closing_day: 3, due_day: 10, payment_account_id: cc.id });
  const mercado = await finance.categories.create({ name: 'Mercado', kind: 'expense', color: 'sage', icon: 'cart' });
  return { finance, cc, card, mercado };
}

export function financeReviewContract(name: string, make: () => Promise<FinanceContractSubject>) {
  describe(`Finanças — revisão (${name})`, () => {
    it('dividir a regra mantém o atrasado (a nova regra herda a data de cadastro)', async () => {
      const { finance, cc } = await setup(make);
      const rule = await finance.recurrences.create({ type: 'expense', amount_cents: 100, account_id: cc.id, frequency: 'monthly', start_date: '2026-01-10' });
      const { next } = await finance.recurrences.split(rule.id, '2026-06-10', {});
      expect(next.created_at).toBe(rule.created_at);
    });

    it('dividir a regra leva as linhas gravadas dali em diante para a regra nova', async () => {
      const { finance, cc } = await setup(make);
      const rule = await finance.recurrences.create({ type: 'expense', amount_cents: 1000, account_id: cc.id, frequency: 'monthly', start_date: '2026-12-05' });
      const occ = (date: string, fields: object) =>
        finance.transactions.upsertOccurrence({
          id: occurrenceId(rule.id, date),
          type: 'expense',
          amount_cents: 1000,
          date,
          account_id: cc.id,
          status: 'planned',
          recurrence_id: rule.id,
          occurrence_date: date,
          ...fields,
        });
      await occ('2026-12-05', { status: 'confirmed' });
      await occ('2027-02-05', { amount_cents: 1500 });
      const { next } = await finance.recurrences.split(rule.id, '2027-01-05', { amount_cents: 1200 });
      const moved = await finance.transactions.listForRecurrences([next.id]);
      expect(moved.map((t) => [t.id, t.occurrence_date, t.amount_cents])).toEqual([
        [occurrenceId(next.id, '2027-02-05'), '2027-02-05', 1500],
      ]);
      const old = await finance.transactions.listForRecurrences([rule.id]);
      expect(old.map((t) => t.occurrence_date)).toEqual(['2026-12-05']);
    });

    it('recorrência não pode ser pagamento de fatura (pagamento é avulso, ligado à fatura)', async () => {
      const { finance, cc, card } = await setup(make);
      await expectCode(
        finance.recurrences.create({ type: 'transfer', amount_cents: 100, account_id: cc.id, to_account_id: card.id, frequency: 'monthly', start_date: '2026-12-08' }),
        'validation',
      );
    });

    it('orçamento tem id fixo por categoria e mês (dois aparelhos offline gravam a mesma linha)', async () => {
      const { finance, mercado } = await setup(make);
      const a = await finance.budgets.set(mercado.id, '2027-01', 80000);
      expect(a.id).toBe(budgetId(mercado.id, '2027-01'));
      await finance.budgets.remove(a.id);
      const b = await finance.budgets.set(mercado.id, '2027-01', 70000);
      expect(b.id).toBe(a.id);
      expect((await finance.budgets.list()).map((x) => x.amount_cents)).toEqual([70000]);
    });

    it('campos de ocorrência só entram por upsertOccurrence', async () => {
      const { finance, cc } = await setup(make);
      const rule = await finance.recurrences.create({ type: 'expense', amount_cents: 1, account_id: cc.id, frequency: 'monthly', start_date: '2026-12-05' });
      await expectCode(
        finance.transactions.create({ type: 'expense', amount_cents: 1, date: '2026-12-05', account_id: cc.id, recurrence_id: rule.id, occurrence_date: '2026-12-05' }),
        'validation',
      );
      const t = await finance.transactions.create({ type: 'expense', amount_cents: 1, date: '2026-12-05', account_id: cc.id });
      await expectCode(finance.transactions.update(t.id, { recurrence_id: rule.id, occurrence_date: '2026-12-05' }), 'validation');
    });

    it('ocorrência confirmada em outro mês é achada pela regra', async () => {
      const { finance, cc } = await setup(make);
      const rule = await finance.recurrences.create({ type: 'expense', amount_cents: 1, account_id: cc.id, frequency: 'monthly', start_date: '2026-12-31' });
      await finance.transactions.upsertOccurrence({
        id: occurrenceId(rule.id, '2026-12-31'),
        type: 'expense',
        amount_cents: 1,
        date: '2027-01-02',
        account_id: cc.id,
        status: 'confirmed',
        recurrence_id: rule.id,
        occurrence_date: '2026-12-31',
      });
      expect((await finance.transactions.listForRecurrences([rule.id])).map((t) => t.date)).toEqual(['2027-01-02']);
      expect(await finance.transactions.listForRecurrences([])).toEqual([]);
    });

    it('trocar a conta recalcula o mês da fatura', async () => {
      const { finance, cc, card } = await setup(make);
      const t = await finance.transactions.create({ type: 'expense', amount_cents: 1, date: '2026-11-28', account_id: card.id });
      expect((await finance.transactions.update(t.id, { account_id: cc.id })).invoice_month).toBeNull();
      expect((await finance.transactions.update(t.id, { account_id: card.id })).invoice_month).toBe('2026-12');
    });
  });
}
