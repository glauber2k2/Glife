import { describe, expect, it } from 'vitest';

import { createRecentSearches } from '../src/features/bible/data/recentSearches';
import type { KeyValueStorage } from '../src/shared/ui/theme/preferenceStore';

const memory = (data: Record<string, string> = {}): KeyValueStorage => ({
  getItem: async (k) => data[k] ?? null,
  setItem: async (k, v) => void (data[k] = v),
});

describe('buscas recentes da Bíblia', () => {
  it('mais recente primeiro, sem repetir (ignora maiúsculas e espaços) e no máximo 6', async () => {
    const r = createRecentSearches(memory());
    for (const q of ['pastor', 'paz', 'Jo 3:16', 'amor', 'força', 'luz', ' Pastor ', 'graça']) await r.add(q);
    expect(await r.list()).toEqual(['graça', 'Pastor', 'luz', 'força', 'amor', 'Jo 3:16']);
  });

  it('consulta vazia não entra; lixo guardado vira lista vazia', async () => {
    const r = createRecentSearches(memory({ 'glife.bible.searches': '{"x":1}' }));
    expect(await r.list()).toEqual([]);
    await r.add('   ');
    expect(await r.list()).toEqual([]);
  });

  it('armazenamento falhando não quebra', async () => {
    const r = createRecentSearches({ getItem: () => Promise.reject(new Error('x')), setItem: () => Promise.reject(new Error('x')) });
    await expect(r.add('paz')).resolves.toBeUndefined();
    expect(await r.list()).toEqual([]);
  });
});
