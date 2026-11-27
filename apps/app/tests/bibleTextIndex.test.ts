import type { BibleTextSource } from '@glife/domain/bible';
import { describe, expect, it } from 'vitest';

import { createTextIndex } from '../src/features/bible/data/textIndex';

function fakeSource(): BibleTextSource & { calls: number } {
  const src = {
    calls: 0,
    translations: async () => [],
    chapter: async (_id: string, book: string, chapter: number) => {
      src.calls++;
      if (book === 'GEN' && chapter === 1) return ['No princípio criou Deus os céus e a terra.'];
      if (book === 'PSA' && chapter === 2) return null; // tradução importada sem este capítulo
      return [`${book} ${chapter}`];
    },
  };
  return src;
}

describe('índice do texto para a busca', () => {
  it('carrega os 66 livros, pula capítulo que falta sem erro e avisa o progresso até 66/66', async () => {
    const src = fakeSource();
    const progress: [number, number][] = [];
    const idx = await createTextIndex(src).load('blivre', (done, total) => progress.push([done, total]));
    expect(idx.find((v) => v.ref === 'GEN.1.1')?.text).toContain('princípio');
    expect(idx.some((v) => v.ref.startsWith('PSA.2.'))).toBe(false);
    expect(idx).toHaveLength(1189 - 1);
    expect(progress.at(-1)).toEqual([66, 66]);
  });

  it('segunda carga da mesma tradução não relê a fonte; descartar força reler', async () => {
    const src = fakeSource();
    const index = createTextIndex(src);
    await index.load('blivre');
    const after = src.calls;
    await index.load('blivre');
    expect(src.calls).toBe(after);
    index.drop('blivre');
    await index.load('blivre');
    expect(src.calls).toBe(after * 2);
  });

  it('erro ao ler um capítulo conta como capítulo ausente', async () => {
    const src: BibleTextSource = { translations: async () => [], chapter: async () => Promise.reject(new Error('disco')) };
    await expect(createTextIndex(src).load('x')).resolves.toEqual([]);
  });
});
