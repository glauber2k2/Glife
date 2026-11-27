import { describe, expect, it } from 'vitest';

import { combineSources, type BibleTextSource, type Translation } from '../text.ts';

const tr = (id: string, source: Translation['source']): Translation => ({ id, abbr: id.toUpperCase(), name: id, credit: null, source });
const fake = (t: Translation, text: string[] | null): BibleTextSource => ({
  translations: async () => [t],
  chapter: async (id) => (id === t.id ? text : null),
});

describe('fontes do texto bíblico', () => {
  it('junta as traduções das fontes (embutidas antes das importadas) e lê o capítulo da fonte certa', async () => {
    const all = combineSources(fake(tr('blivre', 'bundled'), ['a']), fake(tr('nvi', 'imported'), ['b']));
    expect((await all.translations()).map((t) => t.id)).toEqual(['blivre', 'nvi']);
    expect(await all.chapter('nvi', 'JHN', 3)).toEqual(['b']);
    expect(await all.chapter('xyz', 'JHN', 3)).toBeNull();
  });

  it('uma fonte que falha não derruba a lista das outras', async () => {
    const broken: BibleTextSource = { translations: async () => Promise.reject(new Error('x')), chapter: async () => null };
    expect((await combineSources(fake(tr('blivre', 'bundled'), []), broken).translations()).map((t) => t.id)).toEqual(['blivre']);
  });
});
