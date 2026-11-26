import { describe, expect, it } from 'vitest';

import { credentialsOutcome, createSupabaseConnector, type UploadClient } from '../src/shared/lib/powersync/connector';
import { createSyncController, type SyncDatabase } from '../src/shared/lib/powersync/lifecycle';
import {
  INITIAL_SYNC,
  firstSyncState,
  stepFirstSyncLatch,
  syncScreenState,
  type SyncSnapshot,
} from '../src/shared/lib/powersync/syncState';
import { notFoundView } from '../src/features/links/data/targets';

const snap = (over: Partial<SyncSnapshot> = {}): SyncSnapshot => ({ ...INITIAL_SYNC, enabled: true, ...over });
const jwt = (payload: object) => `x.${btoa(JSON.stringify(payload)).replace(/=+$/, '')}.y`;

describe('credenciais: recusadas × sem rede', () => {
  it('token aal2 é ok', () => {
    expect(credentialsOutcome({ token: jwt({ aal: 'aal2' }), error: null })).toBe('ok');
  });

  it('falha de rede ao renovar não é sessão expirada', () => {
    const retryable = Object.assign(new Error('Failed to fetch'), { name: 'AuthRetryableFetchError', status: 0 });
    expect(credentialsOutcome({ token: null, error: retryable })).toBe('offline');
    expect(credentialsOutcome({ token: null, error: Object.assign(new Error('x'), { status: 0 }) })).toBe('offline');
    expect(credentialsOutcome({ token: null, error: new TypeError('Network request failed') })).toBe('offline');
    expect(credentialsOutcome({ token: null, error: Object.assign(new Error('Bad gateway'), { name: 'AuthRetryableFetchError', status: 502 }) })).toBe('offline');
  });

  it('sem sessão válida e sem erro de rede: recusada', () => {
    expect(credentialsOutcome({ token: null, error: null })).toBe('refused');
    expect(credentialsOutcome({ token: jwt({ aal: 'aal1' }), error: null })).toBe('refused');
    expect(credentialsOutcome({ token: null, error: Object.assign(new Error('Invalid Refresh Token'), { name: 'AuthApiError', status: 400 }) })).toBe('refused');
  });

  it('o conector avisa o resultado, inclusive quando getSession lança', async () => {
    const seen: string[] = [];
    const client = {} as UploadClient;
    const throwing = createSupabaseConnector({
      supabase: { auth: { getSession: async () => Promise.reject(new TypeError('fetch failed')) } },
      endpoint: 'https://x',
      client,
      onCredentials: (o) => seen.push(o),
    });
    await expect(throwing.fetchCredentials()).resolves.toBeNull();
    const offline = createSupabaseConnector({
      supabase: { auth: { getSession: async () => ({ data: { session: null }, error: Object.assign(new Error('x'), { name: 'AuthRetryableFetchError', status: 0 }) }) } },
      endpoint: 'https://x',
      client,
      onCredentials: (o) => seen.push(o),
    });
    await offline.fetchCredentials();
    expect(seen).toEqual(['offline', 'offline']);
  });
});

describe('tela de sincronização: sem internet vence sessão', () => {
  it('desconectado por rede é "sem internet", mesmo com credencial antes recusada', () => {
    expect(syncScreenState(snap({ connected: false, networkError: true, sessionExpired: true }))).toBe('offline');
    expect(syncScreenState(snap({ connected: false, sessionExpired: true }))).toBe('sessao');
  });
});

describe('primeira sincronização sem piscar', () => {
  it('trava em "sem internet" depois de uma falha, mesmo com o SDK tentando de novo (connecting)', () => {
    let latch = { offline: false, progress: 0 };
    latch = stepFirstSyncLatch(latch, snap({ hasSynced: false, failed: true }));
    expect(latch.offline).toBe(true);
    latch = stepFirstSyncLatch(latch, snap({ hasSynced: false, failed: true, connecting: true }));
    expect(latch.offline).toBe(true);
    latch = stepFirstSyncLatch(latch, snap({ hasSynced: false, connecting: true }));
    expect(latch.offline).toBe(true);
    latch = stepFirstSyncLatch(latch, snap({ hasSynced: false, connected: true, downloading: true }));
    expect(latch.offline).toBe(true);
    expect(firstSyncState(snap({ hasSynced: false, connecting: true }), false, latch.offline)).toBe('offline');
  });

  it('destrava quando chega progresso de verdade', () => {
    let latch = { offline: true, progress: 0 };
    latch = stepFirstSyncLatch(latch, snap({ hasSynced: false, connected: true, downloading: true, progress: 0.1 }));
    expect(latch).toEqual({ offline: false, progress: 0.1 });
    latch = stepFirstSyncLatch({ offline: true, progress: 0.1 }, snap({ hasSynced: false, progress: 0.3 }));
    expect(latch.offline).toBe(false);
  });

  it('sessão recusada tem estado próprio (não fica em 0% para sempre)', () => {
    expect(firstSyncState(snap({ hasSynced: false, sessionExpired: true }), false, false)).toBe('sessao');
    expect(firstSyncState(snap({ hasSynced: false, sessionExpired: true, networkError: true }), false, true)).toBe('offline');
    expect(firstSyncState(snap({ hasSynced: false, sessionExpired: true }), false, true)).toBe('sessao');
  });

  it('sincronização concluída limpa a trava para um próximo primeiro acesso', () => {
    expect(stepFirstSyncLatch({ offline: true, progress: 0.5 }, snap({ hasSynced: true }))).toEqual({ offline: false, progress: 0 });
  });
});

describe('sincronizar agora depois de falhar ao conectar', () => {
  it('com acesso completo, tenta conectar de novo mesmo que a última conexão tenha falhado', async () => {
    const log: string[] = [];
    let fail = true;
    const db: SyncDatabase = {
      connect: async () => {
        log.push('connect');
        if (fail) throw new Error('rede');
      },
      disconnect: async () => void log.push('disconnect'),
      disconnectAndClear: async () => void log.push('clear'),
    };
    const sync = createSyncController(db, {});
    await sync.apply('ready');
    fail = false;
    await sync.reconnect();
    expect(log).toEqual(['connect', 'connect']);
  });
});

describe('alvo vivo sem tela', () => {
  it('não diz que foi excluído', () => {
    expect(notFoundView('alive', { hasSynced: true, downloading: false })).toBe('semtela');
  });
});
