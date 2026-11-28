import { QTY_SCALE } from '@glife/domain/finance';
import { describe, expect, it } from 'vitest';

import { highlightParts, kindForMarketType, moveActive, totalAtPrice, typedSymbol, typesForKind } from '../src/features/finance/components/symbolSearch';

describe('destaque do trecho digitado', () => {
  it('acha sem acento e sem caixa, mantendo o texto original', () => {
    expect(highlightParts('CSHG Logística', 'logis')).toEqual([
      { text: 'CSHG ', hit: false },
      { text: 'Logís', hit: true },
      { text: 'tica', hit: false },
    ]);
    expect(highlightParts('Itaú Unibanco', 'ITAU')).toEqual([
      { text: 'Itaú', hit: true },
      { text: ' Unibanco', hit: false },
    ]);
  });

  it('sem casamento, um pedaço só', () => {
    expect(highlightParts('Bitcoin', 'eth')).toEqual([{ text: 'Bitcoin', hit: false }]);
  });
});

describe('setas do teclado', () => {
  it('desce e sobe dando a volta', () => {
    expect(moveActive(0, 3, 'down')).toBe(1);
    expect(moveActive(2, 3, 'down')).toBe(0);
    expect(moveActive(0, 3, 'up')).toBe(2);
    expect(moveActive(-1, 3, 'down')).toBe(0);
    expect(moveActive(0, 0, 'down')).toBe(-1);
  });
});

describe('tipo do ativo e da busca', () => {
  it('ação e FII buscam na B3 inteira (código exato não diz o tipo); cripto busca cripto', () => {
    expect(typesForKind('stocks')).toEqual(['stock', 'reit']);
    expect(typesForKind('reits')).toEqual(['reit', 'stock']);
    expect(typesForKind('crypto')).toEqual(['crypto']);
    expect(typesForKind('treasury')).toEqual([]);
  });

  it('item do ranking abre o formulário no tipo certo', () => {
    expect(kindForMarketType('stock')).toBe('stocks');
    expect(kindForMarketType('reit')).toBe('reits');
    expect(kindForMarketType('crypto')).toBe('crypto');
  });
});

describe('aporte pelo preço de hoje', () => {
  it('cotas × preço, em centavos', () => {
    expect(totalAtPrice(10 * QTY_SCALE, 1085 * 1_000_000)).toBe(10850);
    expect(totalAtPrice(Math.round(0.0123 * QTY_SCALE), 48_991_300 * 1_000_000)).toBe(602593);
    expect(totalAtPrice(null, 1)).toBeNull();
    expect(totalAtPrice(10, null)).toBeNull();
  });
});

describe('código digitado sem escolher sugestão', () => {
  it('B3: vale se tiver o formato do código (ETF, BDR, offline)', () => {
    expect(typedSymbol(' bova11 ', 'brapi')).toBe('BOVA11');
    expect(typedSymbol('AAPL34', 'brapi')).toBe('AAPL34');
    expect(typedSymbol('it', 'brapi')).toBeNull();
    expect(typedSymbol('Itaú Unibanco', 'brapi')).toBeNull();
  });

  it('cripto precisa escolher na lista (o id da CoinGecko não é o que se digita)', () => {
    expect(typedSymbol('bitcoin', 'coingecko')).toBeNull();
  });
});
