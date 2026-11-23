import { describe, expect, it, vi } from 'vitest';

import { toLocalDb, type PowerSyncLike } from '../src/shared/lib/powersync/localDb';

function fake() {
  const handlers: { onResult: (r: { rows?: { _array: unknown[] } }) => void; signal?: AbortSignal }[] = [];
  const tx = { getAll: vi.fn(async () => [{ a: 1 }]), getOptional: vi.fn(async () => null), execute: vi.fn(async () => ({})) };
  const ps = {
    getAll: vi.fn(async () => [{ id: 'x' }]),
    getOptional: vi.fn(async () => ({ id: 'x' })),
    execute: vi.fn(async () => ({})),
    writeTransaction: vi.fn(async (fn: (t: typeof tx) => Promise<unknown>) => fn(tx)),
    watch: vi.fn((_sql: string, _params: unknown, handler: { onResult: (r: { rows?: { _array: unknown[] } }) => void }, options?: { signal?: AbortSignal }) => {
      handlers.push({ onResult: handler.onResult, signal: options?.signal });
    }),
  } as unknown as PowerSyncLike;
  return { ps, tx, handlers };
}

describe('LocalDb sobre o PowerSync', () => {
  it('repassa consultas com parâmetros', async () => {
    const { ps } = fake();
    const db = toLocalDb(ps);
    expect(await db.getAll('SELECT ?', [1])).toEqual([{ id: 'x' }]);
    expect(await db.getOptional('SELECT ?', ['a'])).toEqual({ id: 'x' });
    await db.execute('DELETE FROM notes WHERE id = ?', ['n1']);
    expect(ps.execute).toHaveBeenCalledWith('DELETE FROM notes WHERE id = ?', ['n1']);
  });

  it('usa a transação do PowerSync dentro de writeTransaction', async () => {
    const { ps, tx } = fake();
    const result = await toLocalDb(ps).writeTransaction(async (t) => {
      await t.execute('UPDATE notes SET title = ?', ['a']);
      return t.getAll('SELECT 1');
    });
    expect(tx.execute).toHaveBeenCalledWith('UPDATE notes SET title = ?', ['a']);
    expect(result).toEqual([{ a: 1 }]);
  });

  it('observa linhas e para de emitir ao cancelar', () => {
    const { ps, handlers } = fake();
    const seen: unknown[][] = [];
    const stop = toLocalDb(ps).watch('SELECT * FROM notes', [], (rows) => seen.push(rows));
    handlers[0]!.onResult({ rows: { _array: [{ id: 'n1' }] } });
    handlers[0]!.onResult({});
    expect(seen).toEqual([[{ id: 'n1' }], []]);
    stop();
    expect(handlers[0]!.signal?.aborted).toBe(true);
  });
});
