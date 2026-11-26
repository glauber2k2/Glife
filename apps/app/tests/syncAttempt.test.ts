import { afterEach, describe, expect, it, vi } from 'vitest';

import { runSyncAttempt, type SyncAttemptSource } from '../src/shared/lib/powersync/syncAttempt';
import { INITIAL_SYNC, type SyncSnapshot } from '../src/shared/lib/powersync/syncState';

function source(over: Partial<SyncSnapshot> = {}) {
  let state: SyncSnapshot = { ...INITIAL_SYNC, enabled: true, hasSynced: false, ...over };
  let round = 0;
  const listeners = new Set<(s: SyncSnapshot) => void>();
  const emit = (patch: Partial<SyncSnapshot>, newCredentials = false) => {
    state = { ...state, ...patch };
    if (newCredentials) round++;
    listeners.forEach((l) => l(state));
  };
  const port: SyncAttemptSource = {
    snapshot: () => state,
    credentialsRound: () => round,
    subscribe: (l) => { listeners.add(l); l(state); return () => { listeners.delete(l); }; },
    reconnect: vi.fn(async () => 'started' as const),
  };
  return { port, emit, listeners };
}

afterEach(() => vi.useRealTimers());

describe('tentativa manual de sincronização', () => {
  it('não confirma uma troca antiga nem uma nova enquanto ainda envia dados', async () => {
    vi.useFakeTimers();
    const s = source({ connected: true, hasSynced: true, lastSyncedAt: new Date(1000) });
    const result = runSyncAttempt(s.port, 15000);
    s.emit({ uploading: true, lastSyncedAt: new Date(2000) });
    expect(s.listeners.size).toBe(1);
    s.emit({ uploading: false });
    await expect(result).resolves.toBe('ok');
    expect(s.listeners.size).toBe(0);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('ignora falhas e credenciais antigas, mas encerra na nova falha de rede', async () => {
    const s = source({ failed: true, networkError: true });
    const result = runSyncAttempt(s.port, 15000);
    expect(s.listeners.size).toBe(1);
    s.emit({ networkError: true }, true);
    await expect(result).resolves.toBe('failed');
    expect(s.listeners.size).toBe(0);
  });

  it('recusa nova de sessão tem resultado próprio', async () => {
    const s = source();
    const result = runSyncAttempt(s.port, 15000);
    s.emit({ sessionExpired: true }, true);
    await expect(result).resolves.toBe('expired');
  });

  it('não confirma sucesso se a troca nova tem erro de envio', async () => {
    vi.useFakeTimers();
    const s = source();
    const result = runSyncAttempt(s.port, 15000);
    s.emit({ connecting: true });
    s.emit({ connecting: false, connected: true, hasSynced: true, failed: true, lastSyncedAt: new Date(2000) });
    await expect(result).resolves.toBe('failed');
  });

  it('encerra e libera listener e timer quando a conexão falha ou está desabilitada', async () => {
    vi.useFakeTimers();
    for (const outcome of ['failed', 'disabled'] as const) {
      const s = source();
      s.port.reconnect = async () => outcome;
      await expect(runSyncAttempt(s.port, 15000)).resolves.toBe(outcome);
      expect(s.listeners.size).toBe(0);
      expect(vi.getTimerCount()).toBe(0);
    }
    const s = source({ enabled: false });
    await expect(runSyncAttempt(s.port, 15000)).resolves.toBe('disabled');
    expect(s.port.reconnect).not.toHaveBeenCalled();
  });

  it('timeout é distinto de sucesso e também libera o listener', async () => {
    vi.useFakeTimers();
    const s = source({ sessionExpired: true });
    const result = runSyncAttempt(s.port, 15000);
    await vi.advanceTimersByTimeAsync(15000);
    await expect(result).resolves.toBe('timeout');
    expect(s.listeners.size).toBe(0);
  });

  it('libera o listener mesmo se a fonte concluir durante a inscrição', async () => {
    vi.useFakeTimers();
    const s = source();
    const subscribe = s.port.subscribe;
    s.port.subscribe = (l) => {
      const off = subscribe(l);
      s.emit({ networkError: true }, true);
      return off;
    };
    await expect(runSyncAttempt(s.port, 15000)).resolves.toBe('failed');
    expect(s.listeners.size).toBe(0);
    expect(s.port.reconnect).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
  });
});
