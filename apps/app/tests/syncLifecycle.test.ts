import { describe, expect, it } from 'vitest';

import { createSyncController, type SyncDatabase } from '../src/shared/lib/powersync/lifecycle';

function fakeDb() {
  const log: string[] = [];
  const db: SyncDatabase = {
    connect: async () => void log.push('connect'),
    disconnect: async () => void log.push('disconnect'),
    disconnectAndClear: async () => void log.push('clear'),
  };
  return { db, log };
}

const connector = { fetchCredentials: async () => null, uploadData: async () => {} };

describe('ciclo de vida da sincronização', () => {
  it('conecta só quando o acesso está completo (ready)', async () => {
    const { db, log } = fakeDb();
    const sync = createSyncController(db, connector);
    await sync.apply('verify_mfa');
    await sync.apply('ready');
    expect(log).toEqual(['disconnect', 'connect']);
  });

  it('ao sair, desconecta e apaga o banco local', async () => {
    const { db, log } = fakeDb();
    const sync = createSyncController(db, connector);
    await sync.apply('ready');
    await sync.apply('signed_out');
    expect(log).toEqual(['connect', 'clear']);
  });

  it('não repete a mesma ação para o mesmo estado', async () => {
    const { db, log } = fakeDb();
    const sync = createSyncController(db, connector);
    await sync.apply('ready');
    await sync.apply('ready');
    expect(log).toEqual(['connect']);
  });

  it('executa as mudanças em ordem, mesmo chamadas sem esperar', async () => {
    const { db, log } = fakeDb();
    const sync = createSyncController(db, connector);
    void sync.apply('ready');
    void sync.apply('signed_out');
    await sync.apply('ready');
    expect(log).toEqual(['connect', 'clear', 'connect']);
  });

  it('uma falha não trava as próximas mudanças', async () => {
    const { db, log } = fakeDb();
    let fail = true;
    db.connect = async () => {
      if (fail) {
        fail = false;
        throw new Error('offline');
      }
      log.push('connect');
    };
    const errors: unknown[] = [];
    const sync = createSyncController(db, connector, (e) => errors.push(e));
    await sync.apply('ready');
    await sync.apply('signed_out');
    await sync.apply('ready');
    expect(errors).toHaveLength(1);
    expect(log).toEqual(['clear', 'connect']);
  });
});
