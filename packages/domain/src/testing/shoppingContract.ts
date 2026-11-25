// Suíte de contrato de Compras (memória e SQLite local): listas, itens e o "Comprei" com desfazer.
import { describe, expect, it } from 'vitest';

import { isRepositoryError } from '../core/index.ts';
import { planInstallmentPurchase, purchaseDescription, type FinanceRepositories } from '../finance/index.ts';
import type { FinanceContractSubject } from './financeContract.ts';

async function expectCode(p: Promise<unknown>, code: string) {
  const error = await p.then(() => null, (e: unknown) => e);
  expect(isRepositoryError(error, code as never), `esperava erro ${code}, veio ${String(error)}`).toBe(true);
}

/** Itens saem do mais novo ao mais antigo (pelo instante de criação): espera o relógio andar entre um e outro. */
const tick = () => new Promise((r) => setTimeout(r, 3));

async function setup(make: () => Promise<FinanceContractSubject>) {
  const subject = await make();
  const f: FinanceRepositories = subject.finance;
  const cc = await f.accounts.create({ name: 'Itaú', kind: 'checking', initial_balance_cents: 50000 });
  const card = await f.accounts.create({ name: 'Nubank', kind: 'credit_card', closing_day: 3, due_day: 10, payment_account_id: cc.id });
  const mercado = await f.categories.create({ name: 'Mercado', kind: 'expense', color: 'sage', icon: 'shopping-cart' });
  const salario = await f.categories.create({ name: 'Salário', kind: 'income', color: 'steel', icon: 'wallet' });
  const list = await f.shopping.createList({ name: 'Mercado', category_id: mercado.id });
  return { ...subject, f, cc, card, mercado, salario, list };
}

export function shoppingRepositoryContract(name: string, make: () => Promise<FinanceContractSubject>) {
  describe(`Compras (${name})`, () => {
    it('lista com itens: novos primeiro, editar quantidade e preço, marcar no carrinho', async () => {
      const { f, list } = await setup(make);
      const arroz = await f.shopping.addItem(list.id, '  Arroz 5 kg ');
      await tick();
      const cafe = await f.shopping.addItem(list.id, 'Café');
      expect(arroz.name).toBe('Arroz 5 kg');
      await f.shopping.updateItem(arroz.id, { quantity: 2, unit_price_cents: 2790, in_cart: true });
      const snap = await f.shopping.snapshot();
      expect(snap.lists.map((l) => l.id)).toEqual([list.id]);
      expect(snap.items.map((i) => i.id)).toEqual([cafe.id, arroz.id]);
      expect(snap.items[1]).toMatchObject({ quantity: 2, unit_price_cents: 2790, in_cart: true });
    });

    it('recusa nome vazio, quantidade zero, preço zero e categoria de receita', async () => {
      const { f, list, salario } = await setup(make);
      await expectCode(f.shopping.addItem(list.id, '   '), 'validation');
      const item = await f.shopping.addItem(list.id, 'Ovos');
      await expectCode(f.shopping.updateItem(item.id, { quantity: 0 }), 'validation');
      await expectCode(f.shopping.updateItem(item.id, { unit_price_cents: 0 }), 'validation');
      await expectCode(f.shopping.createList({ name: 'X', category_id: salario.id }), 'validation');
      await expectCode(f.shopping.addItem('00000000-0000-4000-8000-00000000dead', 'X'), 'validation');
    });

    it('mover leva o item para outra lista fora do carrinho; excluir lista leva os itens e volta junto', async () => {
      const { f, list } = await setup(make);
      const farmacia = await f.shopping.createList({ name: 'Farmácia' });
      const item = await f.shopping.addItem(list.id, 'Dipirona');
      await f.shopping.updateItem(item.id, { in_cart: true });
      const moved = await f.shopping.moveItem(item.id, farmacia.id);
      expect(moved).toMatchObject({ list_id: farmacia.id, in_cart: false });
      const ids = await f.shopping.removeList(farmacia.id);
      expect(ids).toEqual([item.id]);
      expect((await f.shopping.snapshot()).items).toEqual([]);
      await f.shopping.restoreList(farmacia.id, ids);
      expect((await f.shopping.snapshot()).items.map((i) => i.id)).toEqual([item.id]);
    });

    it('Comprei na conta: grava o gasto, tira os comprados, volta os "sempre" e desfaz tudo junto', async () => {
      const { f, list, cc, mercado } = await setup(make);
      const leite = await f.shopping.addItem(list.id, 'Leite');
      await tick();
      const arroz = await f.shopping.addItem(list.id, 'Arroz');
      await tick();
      const ovos = await f.shopping.addItem(list.id, 'Ovos');
      await f.shopping.updateItem(leite.id, { in_cart: true, always: true });
      await f.shopping.updateItem(arroz.id, { in_cart: true });
      const receipt = await f.shopping.purchase({
        listId: list.id,
        categoryId: mercado.id,
        date: '2026-11-25',
        after: 'remove',
        transactions: [
          {
            type: 'expense',
            amount_cents: 31240,
            date: '2026-11-25',
            account_id: cc.id,
            category_id: mercado.id,
            description: purchaseDescription(list.name, [arroz, leite]),
          },
        ],
      });
      const tx = await f.transactions.get(receipt.transactionIds[0]!);
      expect(tx).toMatchObject({ amount_cents: 31240, category_id: mercado.id, description: 'Mercado: Arroz, Leite' });
      let snap = await f.shopping.snapshot();
      expect(snap.items.map((i) => [i.name, i.in_cart])).toEqual([
        ['Ovos', false],
        ['Leite', false],
      ]);
      expect(snap.lists[0]!.last_purchase_date).toBe('2026-11-25');

      await f.shopping.undoPurchase(receipt);
      expect(await f.transactions.get(receipt.transactionIds[0]!)).toBeNull();
      snap = await f.shopping.snapshot();
      expect(snap.items.map((i) => [i.id, i.in_cart])).toEqual([
        [ovos.id, false],
        [arroz.id, true],
        [leite.id, true],
      ]);
      expect(snap.lists[0]!.last_purchase_date).toBeNull();
    });

    it('Comprei no cartão em 3x: parcelas na fatura e lista lembra a categoria', async () => {
      const { f, card, mercado } = await setup(make);
      const feira = await f.shopping.createList({ name: 'Feira' });
      const item = await f.shopping.addItem(feira.id, 'Tomate');
      await f.shopping.updateItem(item.id, { in_cart: true });
      const rows = planInstallmentPurchase({ card, description: 'Feira', category_id: mercado.id, totalCents: 9000, count: 3, date: '2026-11-25' });
      const receipt = await f.shopping.purchase({ listId: feira.id, categoryId: mercado.id, date: '2026-11-25', after: 'keep', transactions: rows });
      expect(receipt.transactionIds).toHaveLength(3);
      expect((await f.transactions.listByInvoice(card.id, '2026-12')).map((t) => t.amount_cents)).toEqual([3000]);
      const snap = await f.shopping.snapshot();
      expect(snap.items.map((i) => i.in_cart)).toEqual([false]);
      expect(snap.lists.find((l) => l.id === feira.id)!.category_id).toBe(mercado.id);
    });

    it('Comprei é tudo ou nada: carrinho vazio, conta inexistente ou receita são recusados sem mudar a lista', async () => {
      const { f, list, cc, mercado } = await setup(make);
      const base = { listId: list.id, categoryId: mercado.id, date: '2026-11-25', after: 'remove' } as const;
      const line = { type: 'expense', amount_cents: 1000, date: '2026-11-25', account_id: cc.id, category_id: mercado.id } as const;
      await expectCode(f.shopping.purchase({ ...base, transactions: [line] }), 'validation');
      const item = await f.shopping.addItem(list.id, 'Pão');
      await f.shopping.updateItem(item.id, { in_cart: true });
      await expectCode(
        f.shopping.purchase({ ...base, transactions: [{ ...line, account_id: '00000000-0000-4000-8000-00000000dead' }] }),
        'validation',
      );
      await expectCode(f.shopping.purchase({ ...base, transactions: [{ ...line, type: 'income' }] }), 'validation');
      expect((await f.shopping.snapshot()).items.map((i) => i.in_cart)).toEqual([true]);
      expect(await f.transactions.listRange({ from: '2026-01-01', to: '2026-12-31' })).toEqual([]);
    });

    it('watch avisa a cada mudança', async () => {
      const { f, list } = await setup(make);
      const seen: number[] = [];
      const stop = f.shopping.watch((s) => seen.push(s.items.length));
      await new Promise((r) => setTimeout(r, 10));
      await f.shopping.addItem(list.id, 'Sal');
      await new Promise((r) => setTimeout(r, 10));
      stop();
      expect(seen[0]).toBe(0);
      expect(seen.at(-1)).toBe(1);
    });
  });
}
