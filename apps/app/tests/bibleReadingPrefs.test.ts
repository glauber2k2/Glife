import { describe, expect, it } from 'vitest';

import { createReadingPrefsStore, parseReadingPrefs } from '../src/features/bible/data/readingPrefs';
import type { KeyValueStorage } from '../src/shared/ui/theme/preferenceStore';

const memory = (data: Record<string, string> = {}): KeyValueStorage => ({
  getItem: async (k) => data[k] ?? null,
  setItem: async (k, v) => void (data[k] = v),
});

describe('preferências de leitura da Bíblia', () => {
  it('sem nada guardado ou com lixo: Bíblia Livre e sem último capítulo', () => {
    for (const raw of [null, '', '{', '[]', '{"translationId":3}']) expect(parseReadingPrefs(raw)).toEqual({ translationId: 'blivre', last: null });
  });

  it('último capítulo fora dos livros ou dos capítulos é descartado', () => {
    expect(parseReadingPrefs('{"translationId":"bpm","last":{"book":"JHN","chapter":3}}')).toEqual({ translationId: 'bpm', last: { book: 'JHN', chapter: 3 } });
    expect(parseReadingPrefs('{"translationId":"bpm","last":{"book":"JHN","chapter":22}}').last).toBeNull();
    expect(parseReadingPrefs('{"translationId":"bpm","last":{"book":"XYZ","chapter":1}}').last).toBeNull();
  });

  it('grava e lê de volta; falha do armazenamento não derruba', async () => {
    const store = createReadingPrefsStore(memory());
    await store.save({ translationId: 'bpm', last: { book: 'PSA', chapter: 23 } });
    expect(await store.load()).toEqual({ translationId: 'bpm', last: { book: 'PSA', chapter: 23 } });
    const broken = createReadingPrefsStore({ getItem: () => Promise.reject(new Error('x')), setItem: () => Promise.reject(new Error('x')) });
    expect(await broken.load()).toEqual({ translationId: 'blivre', last: null });
    await expect(broken.save({ translationId: 'bpm', last: null })).resolves.toBeUndefined();
  });
});
