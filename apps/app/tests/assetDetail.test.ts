import { QTY_SCALE, newInvestmentAsset, newInvestmentMovement, type InsightBlock, type InvestmentAsset } from '@glife/domain/finance';
import { describe, expect, it } from 'vitest';

import { assetChartData, insightNote } from '../src/features/finance/components/assetDetail';

const USER = '11110000-0000-4000-8000-000000000001';
const E8 = (r: number) => Math.round(r * 1e8);

describe('gráfico do ativo', () => {
  const itsa: InvestmentAsset = { ...newInvestmentAsset({ name: 'Itaúsa', kind: 'stocks', quote_symbol: 'ITSA4' }, USER), last_price_e8: E8(11) };
  const ms = [
    newInvestmentMovement({ asset_id: itsa.id, kind: 'contribution', amount_cents: 10000, quantity: 10 * QTY_SCALE, date: '2026-11-20' }, USER),
    newInvestmentMovement({ asset_id: itsa.id, kind: 'contribution', amount_cents: 21000, quantity: 20 * QTY_SCALE, date: '2026-11-25' }, USER),
  ];
  const prices = [
    { date: '2026-11-19', closeE8: E8(9.5) },
    { date: '2026-11-20', closeE8: E8(10) },
    { date: '2026-11-25', closeE8: E8(10.5) },
    { date: '2026-11-27', closeE8: E8(11) },
  ];

  it('automático: preço em centavos, linha do preço médio e marcas nos dias de aporte', () => {
    const d = assetChartData(itsa, ms, prices, '2026-11-27', 'Tudo');
    expect(d.kind).toBe('price');
    expect(d.values).toEqual([950, 1000, 1050, 1100]);
    expect(d.reference).toEqual({ value: 1033, label: 'seu preço médio' });
    expect(d.marks).toEqual([1, 2]);
  });

  it('manual: valor dia a dia, sem preço médio', () => {
    const cdb = newInvestmentAsset({ name: 'CDB', kind: 'fixed_income', quote_symbol: null }, USER);
    const m = [newInvestmentMovement({ asset_id: cdb.id, kind: 'contribution', amount_cents: 100000, date: '2026-11-25' }, USER)];
    const d = assetChartData(cdb, m, [], '2026-11-27', 'Tudo');
    expect(d.kind).toBe('value');
    expect(d.values).toEqual([100000, 100000, 100000]);
    expect(d.reference).toBeNull();
    expect(d.marks).toEqual([0]);
  });

  it('automático sem histórico cai no valor dia a dia', () => {
    expect(assetChartData(itsa, ms, [], '2026-11-27', 'Tudo').kind).toBe('value');
  });
});

describe('leitura salva como nota', () => {
  it('título com ativo e pergunta; corpo em texto, sem o aviso perder', () => {
    const blocks: InsightBlock[] = [
      { kind: 'text', text: 'Você começou em 06/10/2026.' },
      { kind: 'heading', text: 'A favor' },
      { kind: 'list', tone: 'ok', items: ['Pagou R$ 2,10.'] },
      { kind: 'numbers', items: [{ label: 'Investido', value: 'R$ 627,00' }] },
      { kind: 'disclaimer', text: 'Não é recomendação de compra ou venda.' },
    ];
    expect(insightNote('WEG', 'Vale a pena aportar mais?', blocks, '27/11/2026')).toEqual({
      title: 'Leitura: WEG · Vale a pena aportar mais?',
      body: 'Você começou em 06/10/2026.\n\n## A favor\n\n- Pagou R$ 2,10.\n\n- Investido: R$ 627,00\n\n_Não é recomendação de compra ou venda._\n\n_Gerada pelo Glife em 27/11/2026._',
    });
  });
});
