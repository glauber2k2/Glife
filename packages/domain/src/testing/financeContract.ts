// Suíte de contrato dos repositórios de finanças: memória e SQLite local passam pelos mesmos testes.
// Uso: `financeRepositoryContract('SQLite local', async () => ({ finance, userId }))`.
import { describe, expect, it } from 'vitest';

import { isRepositoryError } from '../core/index.ts';
import {
  occurrenceId,
  planInstallmentPurchase,
  type Account,
  type Category,
  type FinanceRepositories,
  type Transaction,
} from '../finance/index.ts';

export interface FinanceContractSubject {
  finance: FinanceRepositories;
  userId: string;
}

const MISSING = '00000000-0000-4000-8000-00000000dead';

async function expectCode(p: Promise<unknown>, code: string) {
  const error = await p.then(() => null, (e: unknown) => e);
  expect(isRepositoryError(error, code as never), `esperava erro ${code}, veio ${String(error)}`).toBe(true);
}

async function setup(make: () => Promise<FinanceContractSubject>) {
  const subject = await make();
  const { accounts, categories } = subject.finance;
  const cc: Account = await accounts.create({ name: 'Itaú', kind: 'checking', initial_balance_cents: 210000 });
  const card: Account = await accounts.create({
    name: 'Nubank',
    kind: 'credit_card',
    closing_day: 3,
    due_day: 10,
    payment_account_id: cc.id,
  });
  const mercado: Category = await categories.create({ name: 'Mercado', kind: 'expense', color: 'sage', icon: 'shopping-cart' });
  const salario: Category = await categories.create({ name: 'Salário', kind: 'income', color: 'steel', icon: 'wallet' });
  return { ...subject, cc, card, mercado, salario };
}

export function financeRepositoryContract(name: string, make: () => Promise<FinanceContractSubject>) {
  describe(`Finanças — contas e categorias (${name})`, () => {
    it('cria, lê e carimba o dono da sessão', async () => {
      const { finance, cc, userId } = await setup(make);
      expect(cc.user_id).toBe(userId);
      expect(await finance.accounts.get(cc.id)).toEqual(cc);
      expect(await finance.accounts.get(MISSING)).toBeNull();
    });

    it('cartão precisa de conta pagadora existente que não seja cartão', async () => {
      const { finance, card } = await setup(make);
      const base = { name: 'Outro', kind: 'credit_card', closing_day: 1, due_day: 8 } as const;
      await expectCode(finance.accounts.create({ ...base, payment_account_id: MISSING }), 'validation');
      await expectCode(finance.accounts.create({ ...base, payment_account_id: card.id }), 'validation');
    });

    it('arquivar esconde da lista padrão; excluir some de vez da leitura', async () => {
      const { finance, cc, card } = await setup(make);
      await finance.accounts.archive(card.id);
      expect((await finance.accounts.list()).map((a) => a.id)).toEqual([cc.id]);
      expect((await finance.accounts.list({ includeArchived: true })).length).toBe(2);
      await finance.accounts.remove(card.id);
      expect(await finance.accounts.get(card.id)).toBeNull();
      await expectCode(finance.accounts.update(MISSING, { name: 'x' }), 'not_found');
    });

    it('categorias filtradas por tipo', async () => {
      const { finance, mercado } = await setup(make);
      expect((await finance.categories.list({ kind: 'expense' })).map((c) => c.id)).toEqual([mercado.id]);
      await finance.categories.archive(mercado.id);
      expect(await finance.categories.list({ kind: 'expense' })).toEqual([]);
    });
  });

  describe(`Finanças — transações (${name})`, () => {
    it('compra no cartão ganha o mês da fatura na criação', async () => {
      const { finance, card, mercado } = await setup(make);
      const t = await finance.transactions.create({
        type: 'expense',
        amount_cents: 30000,
        date: '2026-11-28',
        account_id: card.id,
        category_id: mercado.id,
      });
      expect(t.invoice_month).toBe('2026-12');
      expect((await finance.transactions.listByInvoice(card.id, '2026-12')).map((x) => x.id)).toEqual([t.id]);
    });

    it('recusa categoria que não combina e referência inexistente', async () => {
      const { finance, cc, card, mercado, salario } = await setup(make);
      const base = { amount_cents: 100, date: '2026-11-24' } as const;
      await expectCode(finance.transactions.create({ ...base, type: 'expense', account_id: cc.id, category_id: salario.id }), 'validation');
      await expectCode(finance.transactions.create({ ...base, type: 'expense', account_id: MISSING }), 'validation');
      await expectCode(finance.transactions.create({ ...base, type: 'expense', account_id: cc.id, category_id: MISSING }), 'validation');
      // estorno: receita no cartão com categoria de despesa
      const refund = await finance.transactions.create({ ...base, type: 'income', account_id: card.id, category_id: mercado.id });
      expect(refund.category_id).toBe(mercado.id);
    });

    it('pagamento de fatura exige o mês da fatura', async () => {
      const { finance, cc, card } = await setup(make);
      const pay = { type: 'transfer', amount_cents: 100, date: '2026-12-08', account_id: cc.id, to_account_id: card.id } as const;
      await expectCode(finance.transactions.create(pay), 'validation');
      expect((await finance.transactions.create({ ...pay, invoice_month: '2026-12' })).invoice_month).toBe('2026-12');
    });

    it('createMany grava tudo ou nada, mantendo os ids planejados', async () => {
      const { finance, card } = await setup(make);
      const rows = planInstallmentPurchase({ card, description: 'TV', category_id: null, totalCents: 100000, count: 3, date: '2026-11-28' });
      const saved = await finance.transactions.createMany(rows);
      expect(saved.map((t) => t.id)).toEqual(rows.map((r) => r.id));
      const bad = planInstallmentPurchase({ card, description: 'X', category_id: MISSING, totalCents: 100, count: 2, date: '2026-11-28' });
      await expectCode(finance.transactions.createMany(bad), 'validation');
      expect((await finance.transactions.listRange({ from: '2026-01-01', to: '2027-12-31' })).length).toBe(3);
    });

    it('listRange por período e conta, em ordem de data', async () => {
      const { finance, cc, card } = await setup(make);
      const mk = (date: string, account_id: string) =>
        finance.transactions.create({ type: 'expense', amount_cents: 1, date, account_id });
      await mk('2026-12-02', cc.id);
      await mk('2026-11-30', cc.id);
      await mk('2026-12-01', card.id);
      await mk('2027-01-01', cc.id);
      const range = await finance.transactions.listRange({ from: '2026-11-30', to: '2026-12-31', accountId: cc.id });
      expect(range.map((t) => t.date)).toEqual(['2026-11-30', '2026-12-02']);
    });

    it('confirmar corrige valor; pular; excluir e restaurar', async () => {
      const { finance, cc } = await setup(make);
      const t = await finance.transactions.create({ type: 'expense', amount_cents: 45000, date: '2026-12-15', account_id: cc.id, status: 'planned' });
      expect(await finance.transactions.confirm(t.id, { amount_cents: 46000 })).toMatchObject({ status: 'confirmed', amount_cents: 46000 });
      expect((await finance.transactions.skip(t.id)).status).toBe('skipped');
      await finance.transactions.remove(t.id);
      expect(await finance.transactions.get(t.id)).toBeNull();
      expect((await finance.transactions.restore(t.id)).deleted_at).toBeNull();
    });

    it('watchRange emite agora e a cada mudança', async () => {
      const { finance, cc } = await setup(make);
      const seen: Transaction[][] = [];
      const stop = finance.transactions.watchRange({ from: '2026-12-01', to: '2026-12-31' }, (rows) => seen.push(rows));
      await new Promise((r) => setTimeout(r, 20));
      await finance.transactions.create({ type: 'expense', amount_cents: 1, date: '2026-12-05', account_id: cc.id });
      await new Promise((r) => setTimeout(r, 50));
      stop();
      expect(seen[0]).toEqual([]);
      expect(seen.at(-1)!.length).toBe(1);
    });
  });

  describe(`Finanças — recorrências e ocorrências (${name})`, () => {
    it('ocorrência gravada duas vezes (dois aparelhos) vira uma linha', async () => {
      const { finance, cc, salario } = await setup(make);
      const rule = await finance.recurrences.create({
        type: 'income', amount_cents: 500000, account_id: cc.id, category_id: salario.id, frequency: 'monthly', start_date: '2026-12-10',
      });
      const id = occurrenceId(rule.id, '2026-12-10');
      const row = {
        id, type: 'income', amount_cents: 500000, date: '2026-12-10', account_id: cc.id, category_id: salario.id,
        status: 'confirmed', recurrence_id: rule.id, occurrence_date: '2026-12-10',
      } as const;
      await finance.transactions.upsertOccurrence(row);
      await finance.transactions.upsertOccurrence({ ...row, amount_cents: 520000 });
      const rows = await finance.transactions.listRange({ from: '2026-12-01', to: '2026-12-31' });
      expect(rows.map((t) => [t.id, t.amount_cents])).toEqual([[id, 520000]]);
      await finance.transactions.remove(id);
      expect((await finance.transactions.upsertOccurrence({ ...row, status: 'skipped' })).deleted_at).toBeNull();
      await expectCode(finance.transactions.upsertOccurrence({ ...row, id: MISSING }), 'validation');
    });

    it('dividir a regra encerra a antiga e cria a nova juntas', async () => {
      const { finance, cc } = await setup(make);
      const rule = await finance.recurrences.create({ type: 'expense', amount_cents: 180000, account_id: cc.id, frequency: 'monthly', start_date: '2026-12-05' });
      const { ended, next } = await finance.recurrences.split(rule.id, '2027-03-05', { amount_cents: 190000 });
      expect(ended.end_date).toBe('2027-03-04');
      expect(next).toMatchObject({ start_date: '2027-03-05', amount_cents: 190000 });
      expect((await finance.recurrences.listActive('2027-04-01')).map((r) => r.id)).toEqual([next.id]);
      expect((await finance.recurrences.listActive('2027-01-01')).length).toBe(2);
    });
  });

  describe(`Finanças — orçamentos (${name})`, () => {
    it('um orçamento por categoria e mês; só categoria de despesa', async () => {
      const { finance, mercado, salario } = await setup(make);
      await finance.budgets.set(mercado.id, '2026-12', 80000);
      const b = await finance.budgets.set(mercado.id, '2026-12', 90000);
      expect((await finance.budgets.list()).map((x) => [x.id, x.amount_cents])).toEqual([[b.id, 90000]]);
      await expectCode(finance.budgets.set(salario.id, '2026-12', 1), 'validation');
      await finance.budgets.remove(b.id);
      expect(await finance.budgets.list()).toEqual([]);
    });
  });
}
