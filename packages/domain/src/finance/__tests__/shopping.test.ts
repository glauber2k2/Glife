import { describe, expect, it } from 'vitest';

import { afterPurchase, cartOf, itemTotal, listSummary, newShoppingItem, purchaseDescription } from '../shopping.ts';

const USER = '11110000-0000-4000-8000-000000000001';
const LIST = '22220000-0000-4000-8000-000000000001';
const item = (name: string, extra: Parameters<typeof newShoppingItem>[0] extends infer D ? Partial<D> : never = {}) =>
  newShoppingItem({ list_id: LIST, name, ...extra }, USER);

describe('compras: contas', () => {
  it('total da linha é quantidade × preço; sem preço é null', () => {
    expect(itemTotal(item('Leite', { quantity: 12, unit_price_cents: 540 }))).toBe(6480);
    expect(itemTotal(item('Pão'))).toBeNull();
  });

  it('carrinho soma só os marcados e avisa quando falta preço', () => {
    const items = [
      item('Arroz', { quantity: 2, unit_price_cents: 2790, in_cart: true }),
      item('Tomate', { in_cart: true }),
      item('Café', { unit_price_cents: 2490 }),
    ];
    expect(cartOf(items)).toEqual({ count: 2, totalCents: 5580, approx: true });
    expect(listSummary(items)).toEqual({ count: 3, totalCents: 8070, approx: true, pending: 1, priced: true });
    expect(listSummary([])).toEqual({ count: 0, totalCents: 0, approx: false, pending: 0, priced: false });
  });

  it('depois do Comprei: "sai da lista" tira os comprados, menos os "sempre"; "volta" só desmarca', () => {
    const leite = item('Leite', { in_cart: true, always: true });
    const arroz = item('Arroz', { in_cart: true });
    const ovos = item('Ovos');
    expect(afterPurchase([leite, arroz, ovos], 'remove')).toEqual({ removed: [arroz], reset: [leite] });
    expect(afterPurchase([leite, arroz, ovos], 'keep')).toEqual({ removed: [], reset: [leite, arroz] });
  });

  it('descrição do gasto: lista e itens, cortada no limite da transação', () => {
    expect(purchaseDescription('Mercado', [{ name: 'Arroz' }, { name: 'Café' }])).toBe('Mercado: Arroz, Café');
    const long = purchaseDescription('Mercado', Array.from({ length: 40 }, (_, i) => ({ name: `Item número ${i}` })));
    expect(long.length).toBe(200);
    expect(long.endsWith('…')).toBe(true);
  });

  it('item recusa nome vazio, quebra de linha e quantidade acima de 999', () => {
    expect(() => item('  ')).toThrow();
    expect(() => item('a\nb')).toThrow();
    expect(() => item('x', { quantity: 1000 })).toThrow();
  });
});
