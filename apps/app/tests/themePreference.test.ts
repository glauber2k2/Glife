import { describe, expect, it } from 'vitest';

import {
  createThemePreferenceStore,
  parseThemePreference,
  type KeyValueStorage,
} from '../src/shared/ui/theme/preferenceStore';

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

describe('parseThemePreference', () => {
  it.each(['system', 'light', 'dark'] as const)('aceita %s', (v) => {
    expect(parseThemePreference(v)).toBe(v);
  });

  it.each([null, '', 'escuro', 'DARK', '{"x":1}'])('rejeita %s', (v) => {
    expect(parseThemePreference(v)).toBeNull();
  });
});

describe('createThemePreferenceStore', () => {
  it('sem nada salvo, devolve null', async () => {
    expect(await createThemePreferenceStore(memoryStorage()).load()).toBeNull();
  });

  it('guarda e lê de volta', async () => {
    const kv = memoryStorage();
    const store = createThemePreferenceStore(kv);
    await store.save('dark');
    expect(await store.load()).toBe('dark');
    expect(kv.data['glife.theme.preference']).toBe('dark');
    expect(await createThemePreferenceStore(kv).load()).toBe('dark');
  });

  it('preserva a preferência salva antes da mudança de nome para Glife', async () => {
    const kv = memoryStorage({ 'vida.theme.preference': 'dark' });
    expect(await createThemePreferenceStore(kv).load()).toBe('dark');
  });

  it('a preferência Glife prevalece sobre a preferência antiga', async () => {
    const kv = memoryStorage({ 'vida.theme.preference': 'dark', 'glife.theme.preference': 'light' });
    expect(await createThemePreferenceStore(kv).load()).toBe('light');
  });

  it('valor corrompido no armazenamento vira null', async () => {
    const kv = memoryStorage();
    await createThemePreferenceStore(kv).save('light');
    for (const key of Object.keys(kv.data)) kv.data[key] = 'roxo';
    expect(await createThemePreferenceStore(kv).load()).toBeNull();
  });

  it('erro do armazenamento não derruba o app', async () => {
    const broken: KeyValueStorage = {
      getItem: async () => {
        throw new Error('disco cheio');
      },
      setItem: async () => {
        throw new Error('disco cheio');
      },
    };
    const store = createThemePreferenceStore(broken);
    expect(await store.load()).toBeNull();
    await expect(store.save('dark')).resolves.toBeUndefined();
  });
});
