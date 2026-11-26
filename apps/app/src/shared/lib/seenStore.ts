// "Visto até" da central de notificações: o instante em que a pessoa marcou tudo como lido (preferência do
// aparelho, não sincroniza). TS puro: o armazenamento concreto (AsyncStorage) é injetado pela raiz do app.
import type { KeyValueStorage } from '../ui/theme/preferenceStore';

export interface SeenStore {
  /** null = nunca marcou (tudo o que já aconteceu é novo) */
  load(): Promise<Date | null>;
  save(at: Date): Promise<void>;
}

const KEY = 'glife.notifications.seenUntil';
const ISO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,3})?Z$/;

/** Valida o que veio do armazenamento: só instante ISO em UTC; o resto é ignorado. */
export function parseSeenUntil(raw: string | null): Date | null {
  if (!raw || !ISO.test(raw)) return null;
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) || d.toISOString().slice(0, 19) !== raw.slice(0, 19) ? null : d;
}

/** Falhas de armazenamento nunca derrubam o app: o "visto até" só deixa de ser lembrado. */
export function createSeenStore(storage: KeyValueStorage): SeenStore {
  return {
    async load() {
      try {
        return parseSeenUntil(await storage.getItem(KEY));
      } catch {
        return null;
      }
    },
    async save(at) {
      try {
        await storage.setItem(KEY, at.toISOString());
      } catch {
        // vale só nesta sessão
      }
    },
  };
}
