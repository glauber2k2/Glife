import { newInvestmentAsset, type InvestmentAsset, type InvestmentsSnapshot } from '@glife/domain/finance';
import type { Quote, QuoteKey } from '@glife/domain/quotes';
import { describe, expect, it } from 'vitest';

import { createQuoteRefresher, type QuoteClient } from '../src/features/finance/data/quoteRefresher';

const USER = '11110000-0000-4000-8000-000000000001';
const NOW = new Date('2026-11-25T15:00:00.000Z');
const ago = (m: number) => new Date(NOW.getTime() - m * 60_000).toISOString();

const stock = (symbol: string, pricedAgo: number | null): InvestmentAsset => ({
  ...newInvestmentAsset({ name: symbol, kind: 'stocks', quote_symbol: symbol }, USER),
  last_price_e8: pricedAgo === null ? null : 1,
  last_price_at: pricedAgo === null ? null : ago(pricedAgo),
});
const snap = (...assets: InvestmentAsset[]): InvestmentsSnapshot => ({ assets, movements: [] });

function setup(fail = false, missing: string[] = []) {
  const asked: QuoteKey[][] = [];
  const applied: Quote[][] = [];
  const client: QuoteClient = {
    async quotes(keys) {
      asked.push([...keys]);
      if (fail) throw new Error('offline');
      return {
        quotes: keys.filter((k) => !missing.includes(k.symbol)).map((k) => ({ ...k, priceE8: 2, name: k.symbol, quotedAt: NOW.toISOString() })),
        errors: keys.filter((k) => missing.includes(k.symbol)).map((k) => ({ ...k, reason: 'not_found' as const })),
      };
    },
    async lookup() {
      return [];
    },
  };
  const refresher = createQuoteRefresher({
    client,
    apply: async (q) => {
      applied.push([...q]);
      return q.length;
    },
    now: () => NOW,
  });
  return { refresher, asked, applied };
}

describe('atualização automática das cotações', () => {
  it('não pede cotação com menos de 30 min; pede a vencida e a que nunca teve preço', async () => {
    const { refresher, asked, applied } = setup();
    await refresher.refresh(snap(stock('ITSA4', 10), stock('HGLG11', 31), stock('PETR4', null)));
    expect(asked).toEqual([
      [
        { source: 'brapi', symbol: 'HGLG11' },
        { source: 'brapi', symbol: 'PETR4' },
      ],
    ]);
    expect(applied[0]).toHaveLength(2);
  });

  it('ativos manuais e códigos repetidos não geram pedido duplicado', async () => {
    const { refresher, asked } = setup();
    const manual = newInvestmentAsset({ name: 'CDB', kind: 'fixed_income' }, USER);
    await refresher.refresh(snap(manual, stock('ITSA4', null), stock('ITSA4', null)));
    expect(asked).toEqual([[{ source: 'brapi', symbol: 'ITSA4' }]]);
  });

  it('nada vencido = nenhuma chamada; force ignora o limite do app', async () => {
    const { refresher, asked } = setup();
    await refresher.refresh(snap(stock('ITSA4', 10)));
    expect(asked).toEqual([]);
    await refresher.refresh(snap(stock('ITSA4', 10)), true);
    expect(asked).toHaveLength(1);
  });

  it('falha da rede não lança e não grava nada', async () => {
    const { refresher, applied } = setup(true);
    await expect(refresher.refresh(snap(stock('ITSA4', null)))).resolves.toBe(false);
    expect(applied).toEqual([]);
  });

  it('duas telas abrindo juntas não duplicam o pedido', async () => {
    const { refresher, asked } = setup();
    const s = snap(stock('ITSA4', null));
    await Promise.all([refresher.refresh(s), refresher.refresh(s)]);
    expect(asked).toHaveLength(1);
  });

  it('código não encontrado fica marcado e não é pedido de novo até forçar', async () => {
    const { refresher, asked } = setup(false, ['XXXX9']);
    await refresher.refresh(snap(stock('XXXX9', null), stock('ITSA4', null)));
    expect(refresher.notFound().has('brapi:XXXX9')).toBe(true);
    expect(refresher.notFound().has('brapi:ITSA4')).toBe(false);
    await refresher.refresh(snap(stock('XXXX9', null)));
    expect(asked).toHaveLength(1);
    await refresher.refresh(snap(stock('XXXX9', null)), true);
    expect(asked).toHaveLength(2);
  });
});
