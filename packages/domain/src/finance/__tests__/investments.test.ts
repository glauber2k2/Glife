import { describe, expect, it } from 'vitest';

import {
  QTY_SCALE,
  accountFlows,
  applyInvestmentAssetPatch,
  assetPosition,
  canChangeKind,
  chronological,
  isAutoQuoted,
  newInvestmentAsset,
  newInvestmentMovement,
  parseTimestamp,
  portfolio,
  quoteSourceOf,
  unitsValue,
  type InvestmentAsset,
  type InvestmentMovement,
  type InvestmentMovementDraft,
} from '../investments.ts';

const USER = '11110000-0000-4000-8000-000000000001';
const ACC = '33330000-0000-4000-8000-000000000001';
const TODAY = '2026-11-25';
const R = (reais: number) => Math.round(reais * 100);
const Q = (units: number) => Math.round(units * QTY_SCALE);

let tick = 0;
const clock = () => new Date(Date.UTC(2026, 10, 25, 12, 0, tick++));
const asset = (name: string, kind: InvestmentAsset['kind'], extra: Partial<InvestmentAsset> = {}) =>
  ({ ...newInvestmentAsset({ name, kind, quote_symbol: extra.quote_symbol ?? null }, USER, clock), ...extra }) as InvestmentAsset;
const mov = (a: InvestmentAsset, kind: InvestmentMovement['kind'], amount: number, date: string, extra: Partial<InvestmentMovementDraft> = {}) =>
  newInvestmentMovement({ asset_id: a.id, kind, amount_cents: amount, date, ...extra }, USER, clock);

describe('investimentos: modelo', () => {
  it('fonte da cotação vem do tipo', () => {
    expect(quoteSourceOf('stocks')).toBe('brapi');
    expect(quoteSourceOf('reits')).toBe('brapi');
    expect(quoteSourceOf('crypto')).toBe('coingecko');
    expect(quoteSourceOf('treasury')).toBeNull();
    expect(isAutoQuoted('fixed_income')).toBe(false);
  });

  it('código é obrigatório e no formato da fonte só nos tipos automáticos', () => {
    expect(() => newInvestmentAsset({ name: 'Itaúsa', kind: 'stocks' }, USER)).toThrow();
    expect(() => newInvestmentAsset({ name: 'Itaúsa', kind: 'stocks', quote_symbol: 'itsa4' }, USER)).toThrow();
    expect(newInvestmentAsset({ name: 'Itaúsa', kind: 'stocks', quote_symbol: 'ITSA4' }, USER).quote_symbol).toBe('ITSA4');
    expect(newInvestmentAsset({ name: 'Bitcoin', kind: 'crypto', quote_symbol: 'bitcoin' }, USER).quote_symbol).toBe('bitcoin');
    expect(() => newInvestmentAsset({ name: 'CDB', kind: 'fixed_income', quote_symbol: 'ITSA4' }, USER)).toThrow();
    expect(() => newInvestmentAsset({ name: '   ', kind: 'other' }, USER)).toThrow();
  });

  it('preço sincronizado no formato do Postgres não impede editar o ativo', () => {
    const a = { ...newInvestmentAsset({ name: 'Itaúsa', kind: 'stocks', quote_symbol: 'ITSA4' }, USER), last_price_e8: 1, last_price_at: '2026-11-25 13:07:00+00' };
    expect(applyInvestmentAssetPatch(a, { name: 'Itaúsa PN' }).name).toBe('Itaúsa PN');
  });

  it('valor > 0, exceto rendimento (≠ 0); conta só em aporte e resgate', () => {
    const a = asset('X', 'other');
    expect(() => mov(a, 'contribution', 0, TODAY)).toThrow();
    expect(() => mov(a, 'income', 0, TODAY)).toThrow();
    expect(mov(a, 'income', -12000, TODAY).amount_cents).toBe(-12000);
    expect(() => mov(a, 'income', 100, TODAY, { account_id: ACC })).toThrow();
    expect(() => mov(a, 'quote', 100, TODAY, { quantity: Q(1) })).toThrow();
    expect(() => mov(a, 'contribution', 100, TODAY, { quantity: 0 })).toThrow();
  });

  it('troca de tipo: livre sem movimentos; com movimentos, só na mesma fonte', () => {
    expect(canChangeKind('stocks', 'reits', true)).toBe(true);
    expect(canChangeKind('treasury', 'fixed_income', true)).toBe(true);
    expect(canChangeKind('stocks', 'crypto', true)).toBe(false);
    expect(canChangeKind('treasury', 'stocks', true)).toBe(false);
    expect(canChangeKind('stocks', 'crypto', false)).toBe(true);
  });
});

describe('investimentos: posição do ativo', () => {
  it('manual (Tesouro IPCA+ do protótipo): investido, atual pela última cotação e resultado', () => {
    const a = asset('Tesouro IPCA+ 2045 com Juros Semestrais', 'treasury');
    const ms = [
      mov(a, 'contribution', R(1_100_000), '2025-03-10'),
      mov(a, 'income', R(18_420.55), '2025-07-15'),
      mov(a, 'contribution', R(50_000), '2026-02-05', { account_id: ACC }),
      mov(a, 'income', R(21_380.12), '2026-07-15'),
      mov(a, 'withdrawal', R(20_000), '2026-09-02', { account_id: ACC }),
      mov(a, 'quote', R(1_231_357.89), '2026-10-31'),
      mov(a, 'contribution', R(1_000), '2026-11-10'),
      mov(a, 'quote', R(1_234_567.89), '2026-11-22'),
    ];
    const p = assetPosition(a, ms, TODAY);
    expect(p.invested).toBe(R(1_131_000));
    expect(p.current).toBe(R(1_234_567.89));
    expect(p.result).toBe(R(103_567.89));
    expect(p.pct).toBeCloseTo(103_567.89 / 1_131_000, 10);
    expect(p.lastQuoteDate).toBe('2026-11-22');
    expect(p.firstDate).toBe('2025-03-10');
    expect(p.closed).toBe(false);
    expect(p.series.at(-1)).toEqual({ date: TODAY, value: R(1_234_567.89) });
  });

  it('sem a cotação excluída (prévia da folha de edição)', () => {
    const a = asset('LCI', 'fixed_income');
    const cot = mov(a, 'quote', R(8_391.72), '2026-11-20');
    const p = assetPosition(a, [mov(a, 'contribution', R(8_000), '2026-05-12'), cot], TODAY, cot.id);
    expect(p.current).toBe(R(8_000));
  });

  it('resgate total encerra; o % passa a ser sobre os aportes', () => {
    const a = asset('CDB Nubank 2025', 'fixed_income');
    const p = assetPosition(
      a,
      [mov(a, 'contribution', R(10_000), '2024-06-03'), mov(a, 'income', R(1_220.5), '2025-06-02'), mov(a, 'withdrawal', R(11_220.5), '2025-06-02')],
      TODAY,
    );
    expect(p.closed).toBe(true);
    expect(p.current).toBe(0);
    expect(p.result).toBe(R(1_220.5));
    expect(p.pct).toBeCloseTo(0.12205, 10);
  });

  it('automático: valor = cotas × preço; dividendo entra no resultado, não no valor', () => {
    const a = asset('Itaúsa', 'stocks', { quote_symbol: 'ITSA4', last_price_e8: 13 * 1e8, last_price_at: '2026-11-25T13:00:00.000Z' });
    const p = assetPosition(
      a,
      [
        mov(a, 'contribution', R(1_000), '2026-01-10', { quantity: Q(100) }),
        mov(a, 'contribution', R(600), '2026-03-10', { quantity: Q(50) }),
        mov(a, 'income', R(30), '2026-08-20'),
      ],
      TODAY,
    );
    expect(p.units).toBe(Q(150));
    expect(p.current).toBe(R(1_950));
    expect(p.invested).toBe(R(1_600));
    expect(p.income).toBe(R(30));
    expect(p.result).toBe(R(380));
    expect(p.hasPrice).toBe(true);
    // Pontos passados pelo preço do próprio aporte: 100 cotas a 10,00; depois 150 a 12,00.
    expect(p.series.map((s) => s.value)).toEqual([R(1_000), R(1_800), R(1_800), R(1_950)]);
  });

  it('automático sem cotação ainda: vale o investido', () => {
    const a = asset('HGLG11', 'reits', { quote_symbol: 'HGLG11' });
    const p = assetPosition(a, [mov(a, 'contribution', R(15_000), '2025-04-01', { quantity: Q(100) })], TODAY);
    expect(p.hasPrice).toBe(false);
    expect(p.current).toBe(R(15_000));
    expect(p.result).toBe(0);
  });

  it('fração de bitcoin sem perder precisão', () => {
    expect(unitsValue(Q(0.00012345), 500_000 * 1e8)).toBe(R(61.73));
    expect(unitsValue(Q(1_000_000), 1_234_567.89 * 1e8)).toBe(R(1_234_567.89) * 1_000_000);
  });

  it('automático com todas as cotas resgatadas está encerrado', () => {
    const a = asset('Bitcoin', 'crypto', { quote_symbol: 'bitcoin', last_price_e8: 1 });
    const p = assetPosition(
      a,
      [mov(a, 'contribution', R(4_000), '2025-12-01', { quantity: Q(0.01) }), mov(a, 'withdrawal', R(3_212.55), '2026-11-24', { quantity: Q(0.01) })],
      TODAY,
    );
    expect(p.closed).toBe(true);
    expect(p.current).toBe(0);
  });
});

describe('investimentos: carteira e contas', () => {
  it('soma os abertos, agrupa por tipo do maior para o menor e separa os encerrados', () => {
    const t = asset('Tesouro Selic', 'treasury');
    const f = asset('HGLG11', 'reits', { quote_symbol: 'HGLG11', last_price_e8: 160 * 1e8 });
    const c = asset('CDB antigo', 'fixed_income');
    const ms = [
      mov(t, 'contribution', R(12_000), '2025-06-02'),
      mov(t, 'quote', R(13_842.1), '2026-11-22'),
      mov(f, 'contribution', R(15_000), '2025-04-01', { quantity: Q(100) }),
      mov(c, 'contribution', R(1_000), '2024-01-01'),
      mov(c, 'withdrawal', R(1_100), '2025-01-01'),
    ];
    const p = portfolio([t, f, c], ms, TODAY);
    expect(p.total).toBe(R(13_842.1 + 16_000));
    expect(p.invested).toBe(R(27_000));
    expect(p.result).toBe(R(2_842.1));
    expect(p.groups.map((g) => g.kind)).toEqual(['reits', 'treasury']);
    expect(p.groups[0]!.share).toBeCloseTo(16_000 / 29_842.1, 10);
    expect(p.closed.map((x) => x.asset.id)).toEqual([c.id]);
    expect(p.updated).toBe('2026-11-22');
  });

  it('aporte com conta sai da conta, resgate volta; excluídos não contam', () => {
    const a = asset('HGLG11', 'reits', { quote_symbol: 'HGLG11' });
    const gone = { ...asset('Apagado', 'other'), deleted_at: '2026-11-01T00:00:00.000Z' };
    const ap = mov(a, 'contribution', R(500), '2026-11-10', { account_id: ACC, quantity: Q(3) });
    const rs = mov(a, 'withdrawal', R(200), '2026-11-20', { account_id: ACC, quantity: Q(1) });
    const del = { ...mov(a, 'contribution', R(999), '2026-11-21', { account_id: ACC, quantity: Q(1) }), deleted_at: '2026-11-22T00:00:00.000Z' };
    const ofGone = mov(gone, 'contribution', R(50), '2026-11-21', { account_id: ACC });
    expect(accountFlows([a, gone], [ap, rs, del, ofGone])).toEqual([
      { key: ap.id, account_id: ACC, amount_cents: -R(500), date: '2026-11-10', description: 'Aporte · HGLG11' },
      { key: rs.id, account_id: ACC, amount_cents: R(200), date: '2026-11-20', description: 'Resgate · HGLG11' },
    ]);
  });
});

describe('investimentos: datas e casos de borda', () => {
  it('lê horário do Postgres com microssegundos', () => {
    expect(parseTimestamp('2026-11-25 13:07:00.123456+00')).toBe(Date.UTC(2026, 10, 25, 13, 7, 0, 123));
    expect(parseTimestamp('2026-11-25T13:07:00.5Z')).toBe(Date.UTC(2026, 10, 25, 13, 7, 0, 500));
  });

  it('ordena pelo instante mesmo misturando o formato local (ISO) e o do Postgres', () => {
    const a = asset('X', 'other');
    const m1 = { ...mov(a, 'contribution', 100, TODAY), created_at: '2026-11-25 13:07:00+00' };
    const m2 = { ...mov(a, 'quote', 500, TODAY), created_at: '2026-11-25T13:06:00.000Z' };
    expect([m1, m2].sort(chronological).map((m) => m.kind)).toEqual(['quote', 'contribution']);
  });

  it('automático só com rendimentos não aparece como encerrado', () => {
    const a = asset('ITSA4', 'stocks', { quote_symbol: 'ITSA4' });
    expect(assetPosition(a, [mov(a, 'income', R(30), TODAY)], TODAY).closed).toBe(false);
  });
});
