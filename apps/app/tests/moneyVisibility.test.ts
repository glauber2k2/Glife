import { describe, expect, it } from 'vitest';

import { createMoneyFormat } from '../src/features/finance/components/format';
import {
  createMoneyVisibilityStore,
  parseMoneyHidden,
  resolveHidden,
  type KeyValueStorage,
} from '../src/shared/lib/moneyVisibilityStore';

function memoryStorage(initial: Record<string, string> = {}): KeyValueStorage & { data: Record<string, string> } {
  const data = { ...initial };
  return {
    data,
    getItem: async (k) => data[k] ?? null,
    setItem: async (k, v) => {
      data[k] = v;
    },
  };
}

describe('parseMoneyHidden', () => {
  it('lê só "1" e "0"', () => {
    expect(parseMoneyHidden('1')).toBe(true);
    expect(parseMoneyHidden('0')).toBe(false);
    for (const bad of [null, '', 'true', '2']) expect(parseMoneyHidden(bad)).toBeNull();
  });
});

describe('resolveHidden', () => {
  it('antes de ler o armazenamento (null), os valores ficam ocultos: nada pisca na abertura', () => {
    expect(resolveHidden(null)).toBe(true);
    expect(resolveHidden(true)).toBe(true);
    expect(resolveHidden(false)).toBe(false);
  });
});

describe('createMoneyVisibilityStore', () => {
  it('sem nada salvo, devolve null (padrão: visível)', async () => {
    expect(await createMoneyVisibilityStore(memoryStorage()).load()).toBeNull();
  });

  it('grava e relê (sobrevive a reabrir o app)', async () => {
    const kv = memoryStorage();
    await createMoneyVisibilityStore(kv).save(true);
    expect(await createMoneyVisibilityStore(kv).load()).toBe(true);
    await createMoneyVisibilityStore(kv).save(false);
    expect(await createMoneyVisibilityStore(kv).load()).toBe(false);
  });

  it('falha de armazenamento não derruba', async () => {
    const broken: KeyValueStorage = {
      getItem: async () => {
        throw new Error('x');
      },
      setItem: async () => {
        throw new Error('x');
      },
    };
    const store = createMoneyVisibilityStore(broken);
    expect(await store.load()).toBeNull();
    await expect(store.save(true)).resolves.toBeUndefined();
  });
});

describe('createMoneyFormat', () => {
  it('visível: igual ao formato normal', () => {
    const f = createMoneyFormat(false);
    expect(f.money(123456)).toBe('R$ 1.234,56');
    expect(f.signed(-1999)).toBe('− R$ 19,99');
    expect(f.balance(-1000)).toBe('− R$ 10,00');
  });

  it('oculto: máscara neutra de largura fixa, sem revelar o sinal', () => {
    const f = createMoneyFormat(true);
    expect(f.money(123456)).toBe('R$ ••••');
    expect(f.money(5)).toBe('R$ ••••');
    expect(f.signed(-1999)).toBe('R$ ••••');
    expect(f.signed(500000)).toBe('R$ ••••');
    expect(f.signed(0)).toBe('R$ ••••');
    expect(f.balance(-1000)).toBe('R$ ••••');
    expect(f.balance(1000)).toBe('R$ ••••');
  });
});
