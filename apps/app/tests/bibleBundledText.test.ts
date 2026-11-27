import { describe, expect, it, vi } from 'vitest';

vi.mock('expo-asset', () => ({ Asset: { fromModule: vi.fn() } }));
vi.mock('expo-file-system', () => ({ File: vi.fn() }));
vi.mock('react-native', () => ({ Platform: { OS: 'web' } }));

import { createBundledText, type BundledTranslation } from '../src/features/bible/data/bundledText';

const T: BundledTranslation = { id: 'blivre', abbr: 'BLIVRE', name: 'Bíblia Livre', credit: 'CC BY 4.0', books: { JHN: 1, GEN: 2 } };
const FILES: Record<number, string> = {
  1: JSON.stringify({ book: 'JHN', chapters: [['v1'], [], ['a', 'b']] }),
  2: '{ quebrado',
};

describe('texto embutido', () => {
  it('lê o capítulo do livro sob demanda e guarda o livro aberto', async () => {
    const read = vi.fn(async (m: number) => FILES[m]!);
    const src = createBundledText([T], read);
    expect(await src.chapter('blivre', 'JHN', 3)).toEqual(['a', 'b']);
    expect(await src.chapter('blivre', 'JHN', 1)).toEqual(['v1']);
    expect(read).toHaveBeenCalledTimes(1);
  });

  it('capítulo, livro ou tradução inexistente: null; arquivo quebrado: erro', async () => {
    const src = createBundledText([T], async (m) => FILES[m]!);
    expect(await src.chapter('blivre', 'JHN', 9)).toBeNull();
    expect(await src.chapter('blivre', 'ROM', 1)).toBeNull();
    expect(await src.chapter('nvi', 'JHN', 1)).toBeNull();
    await expect(src.chapter('blivre', 'GEN', 1)).rejects.toThrow();
  });
});
