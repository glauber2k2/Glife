import { describe, expect, it } from 'vitest';

import { BrapiProvider, CoinGeckoProvider, MARKET_LIMIT, rankMarket, searchCatalog, type FetchFn, type MarketItem } from '../index.ts';

type Reply = { status: number; body?: unknown };

function fakeFetch(replies: Record<string, Reply>) {
  const calls: { url: string; headers?: Record<string, string> }[] = [];
  const fetch: FetchFn = async (url, init) => {
    calls.push({ url, headers: init?.headers });
    const r = replies[new URL(url).pathname];
    if (!r) return { ok: false, status: 404, json: async () => ({}) };
    return { ok: r.status < 300, status: r.status, json: async () => r.body };
  };
  return { fetch, calls };
}

// 25/11/2026 13:00 em Brasília = 16:00 UTC
const sec = (iso: string) => Date.parse(iso) / 1000;

describe('brapi: histórico', () => {
  it('pede 3 meses diários com o token e devolve um ponto por dia em ordem, sem fechamento nulo', async () => {
    const { fetch, calls } = fakeFetch({
      '/api/quote/ITSA4': {
        status: 200,
        body: {
          results: [
            {
              historicalDataPrice: [
                { date: sec('2026-11-25T16:00:00Z'), close: 10.85 },
                { date: sec('2026-11-24T16:00:00Z'), close: null },
                { date: sec('2026-11-21T16:00:00Z'), close: 10.5 },
              ],
            },
          ],
        },
      },
    });
    const points = await new BrapiProvider({ fetch, token: 'T' }).history('ITSA4');
    expect(calls[0]!.url).toBe('https://brapi.dev/api/quote/ITSA4?range=3mo&interval=1d&token=T');
    expect(points).toEqual([
      { date: '2026-11-21', closeE8: 1_050_000_000 },
      { date: '2026-11-25', closeE8: 1_085_000_000 },
    ]);
  });

  it('pregão às 00:30 UTC conta no dia anterior (horário de Brasília)', async () => {
    const { fetch } = fakeFetch({
      '/api/quote/ITSA4': { status: 200, body: { results: [{ historicalDataPrice: [{ date: sec('2026-11-26T00:30:00Z'), close: 11 }] }] } },
    });
    expect(await new BrapiProvider({ fetch, token: null }).history('ITSA4')).toEqual([{ date: '2026-11-25', closeE8: 1_100_000_000 }]);
  });

  it('plano sem histórico (403) devolve lista vazia', async () => {
    const { fetch } = fakeFetch({ '/api/quote/ITSA4': { status: 403, body: { error: true } } });
    expect(await new BrapiProvider({ fetch, token: 'T' }).history('ITSA4')).toEqual([]);
  });
});

describe('brapi: lista do mercado', () => {
  it('lê a lista sem token, separa ações e FIIs e descarta BDR e outros fundos', async () => {
    const { fetch, calls } = fakeFetch({
      '/api/quote/list': {
        status: 200,
        body: {
          stocks: [
            { stock: 'ITSA4', name: 'ITAUSA PN', close: 10.85, change: 0.5, volume: 9_000_000, type: 'stock', subType: 'stock' },
            { stock: 'HGLG11', name: 'CSHG LOGISTICA FII', close: 158.4, change: 0.3, volume: 200_000, type: 'fund', subType: 'fii' },
            { stock: 'HGAG11', name: 'HIGH AGRO FIAGRO', close: 16.5, change: 26.9, volume: 58, type: 'fund', subType: 'fi-agro' },
            { stock: 'Q1UE34', name: 'Q1UE34', close: 767.6, change: 32.4, volume: 3, type: 'bdr', subType: 'bdr' },
          ],
        },
      },
    });
    const items = await new BrapiProvider({ fetch, token: 'T' }).market();
    expect(calls[0]!.url).toBe('https://brapi.dev/api/quote/list?limit=2000');
    expect(items).toEqual([
      { source: 'brapi', symbol: 'ITSA4', ticker: 'ITSA4', name: 'ITAUSA PN', type: 'stock', priceE8: 1_085_000_000, changeDay: 0.5, change30d: null, change1y: null, volume: 9_000_000 },
      { source: 'brapi', symbol: 'HGLG11', ticker: 'HGLG11', name: 'CSHG LOGISTICA FII', type: 'reit', priceE8: 15_840_000_000, changeDay: 0.3, change30d: null, change1y: null, volume: 200_000 },
    ]);
  });

  it('lista fora do ar devolve vazio', async () => {
    const { fetch } = fakeFetch({});
    expect(await new BrapiProvider({ fetch, token: null }).market()).toEqual([]);
  });
});

describe('CoinGecko: histórico e mercado', () => {
  it('pede 365 dias diários com a chave e guarda o último preço de cada dia', async () => {
    const { fetch, calls } = fakeFetch({
      '/api/v3/coins/bitcoin/market_chart': {
        status: 200,
        body: { prices: [[Date.parse('2026-11-24T00:00:00Z'), 480000], [Date.parse('2026-11-25T00:00:00Z'), 485000], [Date.parse('2026-11-25T14:00:00Z'), 489913]] },
      },
    });
    const points = await new CoinGeckoProvider({ fetch, demoKey: 'K' }).history('bitcoin');
    expect(calls[0]!.url).toBe('https://api.coingecko.com/api/v3/coins/bitcoin/market_chart?vs_currency=brl&days=365&interval=daily');
    expect(calls[0]!.headers).toEqual({ 'x-cg-demo-api-key': 'K' });
    expect(points).toEqual([
      { date: '2026-11-24', closeE8: 48_000_000_000_000 },
      { date: '2026-11-25', closeE8: 48_991_300_000_000 },
    ]);
  });

  it('mercado traz variação de 24 h, 30 dias e 1 ano', async () => {
    const { fetch, calls } = fakeFetch({
      '/api/v3/coins/markets': {
        status: 200,
        body: [
          { id: 'bitcoin', symbol: 'btc', name: 'Bitcoin', current_price: 489913, total_volume: 1e9, price_change_percentage_24h_in_currency: 1.9, price_change_percentage_30d_in_currency: 5, price_change_percentage_1y_in_currency: 38.2 },
          { id: 'sem-preco', symbol: 'x', name: 'X', current_price: null },
        ],
      },
    });
    const items = await new CoinGeckoProvider({ fetch, demoKey: null }).market();
    expect(calls[0]!.url).toBe('https://api.coingecko.com/api/v3/coins/markets?vs_currency=brl&order=market_cap_desc&per_page=100&price_change_percentage=24h,30d,1y');
    expect(items).toEqual([
      { source: 'coingecko', symbol: 'bitcoin', ticker: 'BTC', name: 'Bitcoin', type: 'crypto', priceE8: 48_991_300_000_000, changeDay: 1.9, change30d: 5, change1y: 38.2, volume: 1e9 },
    ]);
  });
});

const item = (ticker: string, name: string, type: MarketItem['type'], extra: Partial<MarketItem> = {}): MarketItem => ({
  source: type === 'crypto' ? 'coingecko' : 'brapi',
  symbol: type === 'crypto' ? name.toLowerCase() : ticker,
  ticker,
  name,
  type,
  priceE8: 100_000_000,
  changeDay: 0,
  change30d: null,
  change1y: null,
  volume: 1_000_000,
  ...extra,
});

const CATALOG = [
  item('ECOR3', 'Ecorodovias Infraestrutura e Logística', 'stock'),
  item('HGLG11', 'CSHG Logística', 'reit'),
  item('BTLG11', 'BTG Logística', 'reit'),
  item('LOGG3', 'LOG Commercial Properties', 'stock'),
  item('ITUB4', 'Itaú Unibanco PN', 'stock'),
  item('BTC', 'Bitcoin', 'crypto'),
];

describe('busca no catálogo', () => {
  it('acha por parte do nome, sem acento e sem diferenciar maiúsculas', () => {
    const r = searchCatalog(CATALOG, 'logis').map((x) => x.ticker);
    expect(r).toContain('HGLG11');
    expect(r).toContain('BTLG11');
    expect(searchCatalog(CATALOG, 'LOGIS').map((x) => x.ticker)).toEqual(r);
    expect(searchCatalog(CATALOG, 'itau').map((x) => x.ticker)).toEqual(['ITUB4']);
    expect(searchCatalog(CATALOG, 'btc').map((x) => x.ticker)).toEqual(['BTC']);
  });

  it('ordena: código começa com, nome começa com, palavra começa com, contém; empate mantém a ordem do catálogo', () => {
    expect(searchCatalog(CATALOG, 'log').map((x) => x.ticker)).toEqual(['LOGG3', 'ECOR3', 'HGLG11', 'BTLG11']);
    expect(searchCatalog([item('ABCD3', 'Zeta', 'stock'), item('XPTO3', 'Mabc', 'stock'), item('BC11', 'Abc Renda', 'reit')], 'abc').map((x) => x.ticker)).toEqual([
      'ABCD3',
      'BC11',
      'XPTO3',
    ]);
  });

  it('uma letra não busca e o limite é 8', () => {
    expect(searchCatalog(CATALOG, 'l')).toEqual([]);
    const many = Array.from({ length: 12 }, (_, i) => item(`AAA${i}`, 'Ativo', 'stock'));
    expect(searchCatalog(many, 'aaa')).toHaveLength(8);
  });
});

describe('ranking do mercado', () => {
  const list = [
    item('A1', 'A', 'stock', { changeDay: 5, volume: 99_999 }),
    item('B1', 'B', 'stock', { changeDay: 4 }),
    item('C1', 'C', 'stock', { changeDay: -3 }),
    item('F1', 'F', 'reit', { changeDay: 9 }),
    item('BTC', 'Bitcoin', 'crypto', { changeDay: 1, change30d: 5, change1y: 38, volume: null }),
    item('ETH', 'Ethereum', 'crypto', { changeDay: -1, change30d: -2, change1y: -10, volume: null }),
  ];

  it('altas do dia de ações ignoram volume abaixo de 100.000', () => {
    expect(rankMarket(list, 'up_day', 'stock').map((x) => x.ticker)).toEqual(['B1', 'C1']);
  });

  it('quedas do dia vêm da menor para a maior', () => {
    expect(rankMarket(list, 'down_day', 'stock').map((x) => x.ticker)).toEqual(['C1', 'B1']);
  });

  it('cripto sem volume informado entra; 1 ano ordena por change1y', () => {
    expect(rankMarket(list, 'up_1y', 'crypto').map((x) => x.ticker)).toEqual(['BTC', 'ETH']);
  });

  it('devolve no máximo 10', () => {
    const many = Array.from({ length: 15 }, (_, i) => item(`X${i}`, 'X', 'stock', { changeDay: i }));
    expect(rankMarket(many, 'up_day')).toHaveLength(MARKET_LIMIT);
  });
});
