// Persistência da escolha "ocultar valores" (preferência do aparelho, não sincroniza). TS puro: o armazenamento
// concreto (AsyncStorage) é injetado pela raiz do app, como no tema.
import type { KeyValueStorage } from '../ui/theme/preferenceStore';

export type { KeyValueStorage };

export interface MoneyVisibilityStore {
  /** true = valores ocultos; null = nada salvo (padrão: visíveis). */
  load(): Promise<boolean | null>;
  save(hidden: boolean): Promise<void>;
}

const KEY = 'glife.money.hidden';

/** Valida o que veio do armazenamento: qualquer coisa fora do esperado é ignorada. */
export function parseMoneyHidden(raw: string | null): boolean | null {
  return raw === '1' ? true : raw === '0' ? false : null;
}

/** Falhas de armazenamento nunca derrubam o app: a escolha só deixa de ser lembrada. */
export function createMoneyVisibilityStore(storage: KeyValueStorage): MoneyVisibilityStore {
  return {
    async load() {
      try {
        return parseMoneyHidden(await storage.getItem(KEY));
      } catch {
        return null;
      }
    },
    async save(hidden) {
      try {
        await storage.setItem(KEY, hidden ? '1' : '0');
      } catch {
        // sem persistência nesta sessão; a escolha continua valendo em memória
      }
    },
  };
}
