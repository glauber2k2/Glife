import { describe, expect, it } from 'vitest';

import { READING_DEFAULTS, createReadingPrefsStore, mergeLoadedPrefs, parseReadingPrefs } from '../src/features/bible/data/readingPrefs';
import type { KeyValueStorage } from '../src/shared/ui/theme/preferenceStore';

const memory = (data: Record<string, string> = {}): KeyValueStorage => ({
  getItem: async (k) => data[k] ?? null,
  setItem: async (k, v) => void (data[k] = v),
});

const DEFAULTS = { translationId: 'blivre', last: null, ...READING_DEFAULTS };

describe('preferências de leitura da Bíblia', () => {
  it('padrões da leitura: 19 px, entrelinhas 1,9, letras 0 e números ligados', () => {
    expect(READING_DEFAULTS).toEqual({ fontSize: 19, lineHeight: 1.9, letterSpacing: 0, verseNumbers: true });
  });

  it('sem nada guardado ou com lixo: Bíblia Livre, sem último capítulo e ajustes padrão', () => {
    for (const raw of [null, '', '{', '[]', '{"translationId":3}']) expect(parseReadingPrefs(raw)).toEqual(DEFAULTS);
  });

  it('último capítulo fora dos livros ou dos capítulos é descartado; versículo inválido vira null', () => {
    expect(parseReadingPrefs('{"translationId":"bpm","last":{"book":"JHN","chapter":3,"verse":16}}').last).toEqual({ book: 'JHN', chapter: 3, verse: 16 });
    expect(parseReadingPrefs('{"translationId":"bpm","last":{"book":"JHN","chapter":3}}').last).toEqual({ book: 'JHN', chapter: 3, verse: null });
    expect(parseReadingPrefs('{"last":{"book":"JHN","chapter":3,"verse":0}}').last).toEqual({ book: 'JHN', chapter: 3, verse: null });
    expect(parseReadingPrefs('{"translationId":"bpm","last":{"book":"JHN","chapter":22}}').last).toBeNull();
    expect(parseReadingPrefs('{"translationId":"bpm","last":{"book":"XYZ","chapter":1}}').last).toBeNull();
  });

  it('ajuste fora da faixa ou do tipo volta ao padrão sem derrubar o leitor', () => {
    const p = parseReadingPrefs('{"fontSize":40,"lineHeight":0.5,"letterSpacing":"x","verseNumbers":1}');
    expect(p).toMatchObject(READING_DEFAULTS);
  });

  it('ajustes válidos passam; entrelinhas arredonda ao passo de 0,05', () => {
    expect(parseReadingPrefs('{"fontSize":22,"lineHeight":2.05,"letterSpacing":-2,"verseNumbers":false}')).toMatchObject({
      fontSize: 22,
      lineHeight: 2.05,
      letterSpacing: -2,
      verseNumbers: false,
    });
    expect(parseReadingPrefs('{"lineHeight":1.93}').lineHeight).toBe(1.95);
    expect(parseReadingPrefs('{"fontSize":22.5}').fontSize).toBe(19);
  });

  it('o que foi lido no arranque não desfaz o que a pessoa já mudou nesta sessão', () => {
    const loaded = { ...DEFAULTS, translationId: 'bpm', fontSize: 24 };
    const current = { ...DEFAULTS, lineHeight: 2.2 };
    expect(mergeLoadedPrefs(current, loaded, new Set(['lineHeight']))).toEqual({ ...loaded, lineHeight: 2.2 });
    expect(mergeLoadedPrefs(current, loaded, new Set())).toEqual(loaded);
  });

  it('grava e lê de volta; falha do armazenamento não derruba', async () => {
    const store = createReadingPrefsStore(memory());
    const saved = { ...DEFAULTS, translationId: 'bpm', last: { book: 'PSA', chapter: 23, verse: 4 }, fontSize: 21 };
    await store.save(saved);
    expect(await store.load()).toEqual(saved);
    const broken = createReadingPrefsStore({ getItem: () => Promise.reject(new Error('x')), setItem: () => Promise.reject(new Error('x')) });
    expect(await broken.load()).toEqual(DEFAULTS);
    await expect(broken.save(DEFAULTS)).resolves.toBeUndefined();
  });
});
