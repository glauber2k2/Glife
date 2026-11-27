// RowStore em memória (testes): mesmo contrato do SQLite do app, com transação de verdade (cópia que só vale se
// tudo der certo). `failNextPut` simula falha no meio de uma gravação.
import type { RowMap, RowStore, RowStoreTx } from '../core/index.ts';

export interface MemoryRowStore<R extends RowMap> extends RowStore<R> {
  /** A próxima gravação falha (para testar o tudo ou nada). */
  failNextPut(): void;
}

export function createMemoryRowStore<R extends RowMap>(tables: readonly (keyof R & string)[], userId: string): MemoryRowStore<R> {
  let data = new Map<string, Map<string, R[keyof R]>>(tables.map((t) => [t, new Map()]));
  const listeners = new Set<() => void>();
  let failNext = false;
  const clone = (m: typeof data) => new Map([...m].map(([t, rows]) => [t, new Map(rows)]));
  const emit = () => listeners.forEach((l) => l());

  const on = (state: () => typeof data): RowStoreTx<R> => ({
    get: async (table, id) => {
      const row = state().get(table)?.get(id) as R[typeof table] | undefined;
      return row && row.user_id === userId ? structuredClone(row) : null;
    },
    listAlive: async (table) =>
      [...(state().get(table)?.values() ?? [])]
        .filter((r) => r.user_id === userId && r.deleted_at === null)
        .map((r) => structuredClone(r) as R[typeof table]),
    put: async (table, row) => {
      if (failNext) {
        failNext = false;
        throw new Error('falha simulada');
      }
      state().get(table)!.set(row.id, structuredClone(row));
    },
  });

  const direct = on(() => data);
  return {
    ...direct,
    put: async (table, row) => {
      await direct.put(table, row);
      emit();
    },
    transaction: async (fn) => {
      const draft = clone(data);
      const result = await fn(on(() => draft));
      data = draft;
      emit();
      return result;
    },
    watch: (onChange) => {
      listeners.add(onChange);
      onChange();
      return () => listeners.delete(onChange);
    },
    failNextPut: () => {
      failNext = true;
    },
  };
}
