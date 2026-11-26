// Suíte de contrato dos repositórios de finanças: memória e SQLite local passam pelos mesmos testes.
// Uso: `financeRepositoryContract('SQLite local', async () => ({ finance, userId }))`.
import { describe, expect, it } from 'vitest';

import { isRepositoryError } from '../core/index.ts';
import {
  defaultCategoryId,
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

    it('categorias padrão: id fixo, criadas uma vez e nunca recriadas', async () => {
      const { finance, userId } = await make();
      const defaults = [
        { key: 'moradia', name: 'Moradia', kind: 'expense' as const, color: 'slate' as const, icon: 'house' },
        { key: 'salario', name: 'Salário', kind: 'income' as const, color: 'sage' as const, icon: 'briefcase' },
      ];
      const first = await finance.categories.ensureDefaults(defaults);
      expect(first.map((c) => c.id)).toEqual([defaultCategoryId(userId, 'moradia'), defaultCategoryId(userId, 'salario')]);
      await finance.categories.update(first[0]!.id, { name: 'Casa e contas' });
      await finance.categories.archive(first[1]!.id);
      expect(await finance.categories.ensureDefaults(defaults)).toEqual([]);
      expect((await finance.categories.list({ includeArchived: true })).map((c) => c.name)).toEqual(['Casa e contas', 'Salário']);
    });
  });

  describe(`Finanças — exclusão (${name})`, () => {
    it('excluir conta leva junto lançamentos e recorrências; conta pagadora de cartão é recusada', async () => {
      const { finance, cc, card, mercado } = await setup(make);
      const other = await finance.accounts.create({ name: 'Poupança', kind: 'savings' });
      await finance.transactions.create({ type: 'expense', amount_cents: 1000, date: '2026-11-20', account_id: other.id, category_id: mercado.id });
      await finance.transactions.create({ type: 'transfer', amount_cents: 500, date: '2026-11-21', account_id: cc.id, to_account_id: other.id });
      await finance.recurrences.create({ type: 'expense', amount_cents: 300, account_id: other.id, frequency: 'monthly', start_date: '2026-11-01' });
      const kept = await finance.transactions.create({ type: 'expense', amount_cents: 700, date: '2026-11-22', account_id: cc.id });

      expect(await finance.accounts.removalImpact(other.id)).toEqual({ transactions: 2, recurrences: 1, paysCards: [] });
      expect((await finance.accounts.removalImpact(cc.id)).paysCards.map((a) => a.id)).toEqual([card.id]);
      await expectCode(finance.accounts.remove(cc.id), 'conflict');

      await finance.accounts.remove(other.id);
      expect(await finance.accounts.get(other.id)).toBeNull();
      const left = await finance.transactions.listRange({ from: '2026-11-01', to: '2026-11-30' });
      expect(left.map((t) => t.id)).toEqual([kept.id]);
      expect(await finance.recurrences.listActive('2026-11-01')).toEqual([]);

      await finance.accounts.remove(card.id);
      await finance.accounts.remove(cc.id);
      expect(await finance.accounts.list()).toEqual([]);
    });

    it('excluir e restaurar várias de uma vez (parcelas)', async () => {
      const { finance, card } = await setup(make);
      const rows = planInstallmentPurchase({ card, description: 'Sofá', category_id: null, totalCents: 30000, count: 3, date: '2026-11-20' });
      await finance.transactions.createMany(rows);
      const ids = rows.map((r) => r.id);
      await finance.transactions.removeMany(ids);
      expect(await finance.transactions.listByInvoice(card.id, rows[0]!.invoice_month!)).toEqual([]);
      await finance.transactions.restoreMany(ids);
      expect((await finance.transactions.listRange({ from: '2026-11-01', to: '2027-12-31' })).length).toBe(3);
      await expectCode(finance.transactions.removeMany([ids[0]!, MISSING]), 'not_found');
      expect((await finance.transactions.listRange({ from: '2026-11-01', to: '2027-12-31' })).length).toBe(3);
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

    it('restaurar recusa (conflict) lançamento de conta excluída e nada volta', async () => {
      const { finance, cc } = await setup(make);
      const other = await finance.accounts.create({ name: 'Poupança', kind: 'savings', initial_balance_cents: 0 });
      const spent = await finance.transactions.create({ type: 'expense', amount_cents: 500, date: '2026-12-01', account_id: other.id });
      const moved = await finance.transactions.create({ type: 'transfer', amount_cents: 700, date: '2026-12-02', account_id: cc.id, to_account_id: other.id });
      await finance.accounts.remove(other.id);
      await expectCode(finance.transactions.restore(spent.id), 'conflict');
      await expectCode(finance.transactions.restore(moved.id), 'conflict');
      expect(await finance.transactions.listRange({ from: '2026-12-01', to: '2026-12-31' })).toEqual([]);
      const refused: unknown = await finance.transactions.restore(moved.id).catch((e: unknown) => e);
      expect((refused as { cause?: unknown }).cause).toBeInstanceOf(RangeError);
    });

    it('restaurar uma parcela sozinha é recusado quando outras da compra seguem excluídas', async () => {
      const { finance, card } = await setup(make);
      const rows = planInstallmentPurchase({ card, description: 'Sofá', category_id: null, totalCents: 30000, count: 3, date: '2026-11-20' });
      await finance.transactions.createMany(rows);
      const ids = rows.map((r) => r.id);
      await finance.transactions.removeMany(ids);
      await expectCode(finance.transactions.restore(ids[1]!), 'conflict');
      await expectCode(finance.transactions.restore(ids[0]!), 'conflict');
      expect(await finance.transactions.listRange({ from: '2026-11-01', to: '2027-12-31' })).toEqual([]);
      // Só uma parcela excluída (as outras vivas): restaurar essa parcela vale.
      await finance.transactions.restoreMany(ids);
      await finance.transactions.remove(ids[2]!);
      expect((await finance.transactions.restore(ids[2]!)).deleted_at).toBeNull();
      expect((await finance.transactions.listRange({ from: '2026-11-01', to: '2027-12-31' })).length).toBe(3);
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

  describe(`Finanças — ordem, arquivar e ajuste (${name})`, () => {
    it('contas ordenadas por sort_order e depois nome; reorder grava o índice', async () => {
      const { finance, cc, card } = await setup(make);
      expect((await finance.accounts.list()).map((a) => a.id)).toEqual([cc.id, card.id]); // Itaú, Nubank
      await finance.accounts.reorder([card.id, cc.id]);
      expect((await finance.accounts.list()).map((a) => [a.id, a.sort_order])).toEqual([[card.id, 0], [cc.id, 1]]);
      const third = await finance.accounts.create({ name: 'Alfa', kind: 'savings' });
      expect((await finance.accounts.list()).map((a) => a.id)).toEqual([third.id, card.id, cc.id]); // 0 por nome, depois 1
    });

    it('reorder recusa id inexistente e não grava nada', async () => {
      const { finance, cc, card } = await setup(make);
      await expectCode(finance.accounts.reorder([card.id, MISSING]), 'not_found');
      expect((await finance.accounts.get(card.id))!.sort_order).toBe(0);
      await expectCode(finance.accounts.reorder([cc.id, cc.id]), 'validation');
    });

    it('categorias: ordem e reorder', async () => {
      const { finance, mercado } = await setup(make);
      const lazer = await finance.categories.create({ name: 'Lazer', kind: 'expense', color: 'sage', icon: 'ticket' });
      expect((await finance.categories.list({ kind: 'expense' })).map((c) => c.id)).toEqual([lazer.id, mercado.id]);
      await finance.categories.reorder([mercado.id, lazer.id]);
      expect((await finance.categories.list({ kind: 'expense' })).map((c) => c.id)).toEqual([mercado.id, lazer.id]);
      await expectCode(finance.categories.reorder([MISSING]), 'not_found');
    });

    it('desarquivar devolve à lista', async () => {
      const { finance, cc, mercado } = await setup(make);
      await finance.accounts.archive(cc.id);
      expect((await finance.accounts.list()).map((a) => a.id)).not.toContain(cc.id);
      expect((await finance.accounts.unarchive(cc.id)).archived).toBe(false);
      expect((await finance.accounts.list()).map((a) => a.id)).toContain(cc.id);
      await finance.categories.archive(mercado.id);
      expect((await finance.categories.unarchive(mercado.id)).archived).toBe(false);
      expect((await finance.categories.list({ kind: 'expense' })).map((c) => c.id)).toEqual([mercado.id]);
    });

    it('adjustBalance cria o ajuste e leva o saldo ao valor do banco; zero devolve null', async () => {
      const { finance, cc } = await setup(make);
      expect(await finance.transactions.adjustBalance(cc.id, 210000, '2026-12-02')).toBeNull();
      const down = (await finance.transactions.adjustBalance(cc.id, 209763, '2026-12-02'))!;
      expect(down).toMatchObject({ type: 'expense', amount_cents: 237, is_adjustment: true, category_id: null, status: 'confirmed', description: 'Ajuste de saldo', account_id: cc.id });
      const up = (await finance.transactions.adjustBalance(cc.id, 210000, '2026-12-03'))!;
      expect(up).toMatchObject({ type: 'income', amount_cents: 237, is_adjustment: true });
      expect(await finance.transactions.get(down.id)).toEqual(down);
    });

    it('adjustBalance recusa cartão e conta inexistente', async () => {
      const { finance, card } = await setup(make);
      await expectCode(finance.transactions.adjustBalance(card.id, 100, '2026-12-02'), 'validation');
      await expectCode(finance.transactions.adjustBalance(MISSING, 100, '2026-12-02'), 'not_found');
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

    it('orçamento 0 é aceito (encerra); negativo é recusado', async () => {
      const { finance, mercado } = await setup(make);
      const zero = await finance.budgets.set(mercado.id, '2027-01', 0);
      expect(zero.amount_cents).toBe(0);
      await expectCode(finance.budgets.set(mercado.id, '2027-02', -1), 'validation');
    });

    it('createWithBudget grava categoria e orçamento juntos', async () => {
      const { finance } = await setup(make);
      const c = await finance.categories.createWithBudget(
        { name: 'Viagens', kind: 'expense', color: 'teal', icon: 'plane', sort_order: 9 },
        { month: '2026-12', amount_cents: 50000 },
      );
      expect(await finance.categories.get(c.id)).toMatchObject({ name: 'Viagens', sort_order: 9 });
      expect((await finance.budgets.list()).map((b) => [b.category_id, b.starts_month, b.amount_cents])).toEqual([[c.id, '2026-12', 50000]]);
      const bare = await finance.categories.createWithBudget({ name: 'Bico', kind: 'income', color: 'sage', icon: 'gift' }, null);
      expect(await finance.categories.get(bare.id)).not.toBeNull();
      expect(await finance.budgets.list()).toHaveLength(1);
    });

    it('createWithBudget é tudo ou nada: orçamento recusado não deixa a categoria', async () => {
      const { finance } = await setup(make);
      const before = (await finance.categories.list({ includeArchived: true })).length;
      await expectCode(
        finance.categories.createWithBudget({ name: 'Extra', kind: 'income', color: 'sage', icon: 'gift' }, { month: '2026-12', amount_cents: 100 }),
        'validation',
      );
      await expectCode(
        finance.categories.createWithBudget({ name: 'Viagens', kind: 'expense', color: 'teal', icon: 'plane' }, { month: '2026-12', amount_cents: -5 }),
        'validation',
      );
      expect(await finance.categories.list({ includeArchived: true })).toHaveLength(before);
      expect(await finance.budgets.list()).toEqual([]);
    });
  });
}
