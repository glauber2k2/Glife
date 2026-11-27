import { describe, expect, it } from 'vitest';

import { createSyncController, type SyncDatabase } from '../src/shared/lib/powersync/lifecycle';
import {
  INITIAL_SYNC,
  canStartUsing,
  changeLabel,
  firstSyncState,
  lastSyncText,
  syncScreenState,
  type SyncSnapshot,
} from '../src/shared/lib/powersync/syncState';

const snap = (over: Partial<SyncSnapshot> = {}): SyncSnapshot => ({ ...INITIAL_SYNC, enabled: true, ...over });

describe('estado da tela de sincronização', () => {
  it('em dia quando conectado (ou conectando)', () => {
    expect(syncScreenState(snap({ connected: true, hasSynced: true }))).toBe('emdia');
    expect(syncScreenState(snap({ connecting: true, hasSynced: true }))).toBe('emdia');
  });

  it('sem internet quando desconectado ou com a sincronização desligada', () => {
    expect(syncScreenState(snap({ connected: false, hasSynced: true }))).toBe('offline');
    expect(syncScreenState(snap({ enabled: false, connected: false }))).toBe('offline');
  });

  it('sessão expirada vence os outros estados', () => {
    expect(syncScreenState(snap({ connected: false, sessionExpired: true }))).toBe('sessao');
    expect(syncScreenState(snap({ connected: true, sessionExpired: true }))).toBe('sessao');
  });
});

describe('abertura e primeira sincronização', () => {
  it('não aparece quando já sincronizou, quando ainda não se sabe, sem sync configurado ou depois de dispensar', () => {
    expect(firstSyncState(snap({ hasSynced: true }), false, false)).toBe('none');
    expect(firstSyncState(snap({ hasSynced: undefined }), false, false)).toBe('none');
    expect(firstSyncState(snap({ enabled: false, hasSynced: false }), false, false)).toBe('none');
    expect(firstSyncState(snap({ hasSynced: false, connected: true }), true, false)).toBe('none');
  });

  it('trazendo os dados enquanto conecta ou baixa', () => {
    expect(firstSyncState(snap({ hasSynced: false, connected: true, downloading: true }), false, false)).toBe('sincronizando');
    expect(firstSyncState(snap({ hasSynced: false, connecting: true }), false, false)).toBe('sincronizando');
    // Logo ao abrir, antes da primeira tentativa: ainda não é "sem internet".
    expect(firstSyncState(snap({ hasSynced: false }), false, false)).toBe('sincronizando');
  });

  it('precisa de internet enquanto a falha estiver travada', () => {
    expect(firstSyncState(snap({ hasSynced: false, failed: true }), false, true)).toBe('offline');
    expect(firstSyncState(snap({ hasSynced: false, failed: true, connecting: true }), false, true)).toBe('offline');
  });

  it('"Começar a usar" liberado quando as notas chegaram ou a sincronização terminou', () => {
    expect(canStartUsing(snap({ hasSynced: false }), 0)).toBe(false);
    expect(canStartUsing(snap({ hasSynced: false }), 3)).toBe(true);
    expect(canStartUsing(snap({ hasSynced: true }), 0)).toBe(true);
  });
});

describe('fila de envio', () => {
  it('rótulo da alteração com o nome e o gênero do item, sem dados', () => {
    expect(changeLabel('PATCH', { noun: 'Nota', gender: 'f' })).toBe('Nota editada');
    expect(changeLabel('PUT', { noun: 'Lançamento', gender: 'm' })).toBe('Lançamento criado');
    expect(changeLabel('DELETE', { noun: 'Lembrete', gender: 'm' })).toBe('Lembrete excluído');
    expect(changeLabel('PUT', undefined)).toBe('Alteração');
  });
});

describe('hora da última troca', () => {
  const now = new Date('2026-11-26T12:00:00Z');
  it('em segundos, minutos e horas', () => {
    expect(lastSyncText(new Date('2026-11-26T11:59:48Z'), now)).toBe('Última troca há 12 s com a nuvem.');
    expect(lastSyncText(new Date('2026-11-26T11:55:00Z'), now)).toBe('Última troca há 5 min com a nuvem.');
    expect(lastSyncText(new Date('2026-11-26T09:00:00Z'), now)).toBe('Última troca há 3 h com a nuvem.');
    expect(lastSyncText(null, now)).toBe('Ainda não houve troca com a nuvem.');
  });
});

describe('sincronizar agora', () => {
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

  it('reconecta só com acesso completo', async () => {
    const { db, log } = fakeDb();
    const sync = createSyncController(db, connector);
    await sync.reconnect();
    expect(log).toEqual([]);
    await sync.apply('ready');
    await sync.reconnect();
    expect(log).toEqual(['connect', 'connect']);
    await sync.apply('verify_mfa');
    await sync.reconnect();
    expect(log).toEqual(['connect', 'connect', 'disconnect']);
  });
});
