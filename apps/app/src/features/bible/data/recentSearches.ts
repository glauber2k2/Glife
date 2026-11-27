// Buscas recentes da Bíblia, só neste aparelho: até 6, mais recente primeiro, sem repetir.
import type { KeyValueStorage } from '@/shared/ui/theme/preferenceStore';

const KEY = 'glife.bible.searches';
const MAX = 6;
const MAX_LEN = 80;

export interface RecentSearches {
  list(): Promise<string[]>;
  add(query: string): Promise<void>;
}

const parse = (raw: string | null): string[] => {
  try {
    const v = JSON.parse(raw ?? '[]') as unknown;
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string' && x.length > 0 && x.length <= MAX_LEN).slice(0, MAX) : [];
  } catch {
    return [];
  }
};

export function createRecentSearches(storage: KeyValueStorage): RecentSearches {
  const list = async () => {
    try {
      return parse(await storage.getItem(KEY));
    } catch {
      return [];
    }
  };
  return {
    list,
    async add(query) {
      const q = query.trim().replace(/\s+/g, ' ').slice(0, MAX_LEN);
      if (!q) return;
      const same = (x: string) => x.toLocaleLowerCase('pt-BR') === q.toLocaleLowerCase('pt-BR');
      const next = [q, ...(await list()).filter((x) => !same(x))].slice(0, MAX);
      try {
        await storage.setItem(KEY, JSON.stringify(next));
      } catch {
        // sem lembrar desta vez
      }
    },
  };
}
