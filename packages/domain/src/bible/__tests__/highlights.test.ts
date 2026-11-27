import { beforeEach, describe, expect, it } from 'vitest';

import { setIdGenerator } from '../../core/index.ts';
import { createMemoryRowStore, type MemoryRowStore } from '../../testing/index.ts';
import { BIBLE_TABLES, createBibleHighlightsRepository, newHighlight, recentHighlights, type BibleRows } from '../index.ts';

const USER = '11110000-0000-4000-8000-000000000001';
let seq = 0;
setIdGenerator(() => `9b1c0000-0000-4000-8000-${String(++seq).padStart(12, '0')}`);
let now = 0;
const clock = () => new Date(Date.UTC(2026, 10, 26, 12, 0, now++));

let store: MemoryRowStore<BibleRows>;
const repo = () => createBibleHighlightsRepository(store, USER, clock);
beforeEach(() => {
  store = createMemoryRowStore<BibleRows>(BIBLE_TABLES, USER);
});

describe('marcações da Bíblia', () => {
  it('grifa vários versículos e trocar a cor atualiza a mesma linha', async () => {
    await repo().set(['JHN.3.16', 'JHN.3.17'], { color: 'yellow', style: 'highlight' });
    const first = await repo().list();
    expect(first).toHaveLength(2);
    await repo().set(['JHN.3.16'], { color: 'blue', style: 'underline' });
    const after = await repo().list();
    expect(after).toHaveLength(2);
    const v16 = after.find((h) => h.ref === 'JHN.3.16')!;
    expect([v16.color, v16.style, v16.id]).toEqual(['blue', 'underline', first.find((h) => h.ref === 'JHN.3.16')!.id]);
  });

  it('cópias de outro aparelho: a leitura mostra a mais recente e a próxima gravação deixa uma só', async () => {
    const older = newHighlight({ ref: 'ROM.8.28', color: 'green', style: 'highlight' }, USER, clock);
    const newer = newHighlight({ ref: 'ROM.8.28', color: 'pink', style: 'highlight' }, USER, clock);
    await store.put('bible_highlights', newer);
    await store.put('bible_highlights', older);
    const list = await repo().list();
    expect(list.map((h) => h.color)).toEqual(['pink']);
    await repo().set(['ROM.8.28'], { color: 'yellow', style: 'highlight' });
    expect((await store.listAlive('bible_highlights')).map((h) => h.color)).toEqual(['yellow']);
  });

  it('referência que não é um versículo só é recusada e nada é gravado', async () => {
    for (const bad of ['JHN.3', 'JHN.3.16-18', 'XXX.1.1', 'JHN.30.1']) {
      await expect(repo().set(['JHN.3.16', bad], { color: 'yellow', style: 'highlight' })).rejects.toMatchObject({ code: 'validation' });
    }
    expect(await repo().list()).toEqual([]);
  });

  it('falha no meio: nada fica gravado (tudo ou nada)', async () => {
    store.failNextPut();
    await expect(repo().set(['JHN.1.1', 'JHN.1.2'], { color: 'yellow', style: 'highlight' })).rejects.toBeTruthy();
    expect(await repo().list()).toEqual([]);
  });

  it('remover apaga a marcação (inclusive cópias)', async () => {
    await repo().set(['GEN.1.1', 'GEN.1.2'], { color: 'yellow', style: 'highlight' });
    await store.put('bible_highlights', newHighlight({ ref: 'GEN.1.1', color: 'blue', style: 'highlight' }, USER, clock));
    await repo().clear(['GEN.1.1']);
    expect((await repo().list()).map((h) => h.ref)).toEqual(['GEN.1.2']);
  });

  it('marcações recentes: mais nova primeiro, no máximo o limite', async () => {
    await repo().set(['GEN.1.1'], { color: 'yellow', style: 'highlight' });
    await repo().set(['GEN.1.2'], { color: 'green', style: 'highlight' });
    await repo().set(['GEN.1.1'], { color: 'pink', style: 'highlight' });
    expect(recentHighlights(await repo().list(), 1).map((h) => h.ref)).toEqual(['GEN.1.1']);
  });
});
