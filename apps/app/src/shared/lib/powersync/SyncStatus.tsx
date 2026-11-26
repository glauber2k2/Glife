import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';

import type { LocalSync, PendingChange } from './localSync';
import {
  INITIAL_LATCH,
  INITIAL_SYNC,
  countGroupsOf,
  stepFirstSyncLatch,
  type CountGroup,
  type SyncResult,
  type SyncSnapshot,
  type SyncTableLabel,
} from './syncState';

type SyncSource = Pick<LocalSync, 'onStatusChange' | 'syncNow' | 'watchPending' | 'watchCounts'>;

interface SyncContextValue {
  snapshot: SyncSnapshot;
  source: SyncSource | null;
  labels: Record<string, SyncTableLabel>;
  /** primeira sincronização travada em "sem internet" até tentar de novo ou chegar progresso */
  firstSyncOffline: boolean;
  retryFirstSync: () => Promise<SyncResult>;
}

const SyncContext = createContext<SyncContextValue>({
  snapshot: INITIAL_SYNC,
  source: null,
  labels: {},
  firstSyncOffline: false,
  retryFirstSync: async () => 'disabled',
});

/**
 * Estado da sincronização para as telas ("Salvo" × "Salvo no aparelho", Sincronização, Abertura).
 * `labels`: nome de cada tabela, entregue pelos módulos na raiz (a fila mostra "Nota editada", nunca o conteúdo).
 */
export function SyncStatusProvider({ sync, labels, children }: { sync: SyncSource; labels: Record<string, SyncTableLabel>; children: ReactNode }) {
  const [snapshot, setSnapshot] = useState<SyncSnapshot>(INITIAL_SYNC);
  const [latch, setLatch] = useState(INITIAL_LATCH);
  // Durante "Tentar de novo" a falha antiga do SDK não trava de novo; quem decide é o resultado da tentativa.
  const retrying = useRef(false);
  const latest = useRef(INITIAL_SYNC);
  useEffect(
    () =>
      sync.onStatusChange((s) => {
        latest.current = s;
        setSnapshot(s);
        if (!retrying.current) setLatch((l) => stepFirstSyncLatch(l, s));
      }),
    [sync],
  );
  const retryFirstSync = useCallback(async () => {
    retrying.current = true;
    setLatch((l) => ({ ...l, offline: false }));
    try {
      const result = await sync.syncNow();
      setLatch((l) => result === 'failed' || result === 'timeout'
        ? { ...l, offline: true }
        : result === 'expired' ? { ...l, offline: false } : stepFirstSyncLatch({ ...l, offline: false }, latest.current));
      return result;
    } catch {
      setLatch((l) => ({ ...l, offline: true }));
      return 'failed' as const;
    } finally {
      retrying.current = false;
    }
  }, [sync]);
  const value = useMemo(
    () => ({ snapshot, source: sync, labels, firstSyncOffline: latch.offline, retryFirstSync }),
    [snapshot, sync, labels, latch.offline, retryFirstSync],
  );
  return <SyncContext.Provider value={value}>{children}</SyncContext.Provider>;
}

export function useSyncOnline(): boolean {
  return useContext(SyncContext).snapshot.connected;
}

export function useSyncState(): SyncSnapshot {
  return useContext(SyncContext).snapshot;
}

export function useSyncNow(): () => Promise<SyncResult> {
  const { source } = useContext(SyncContext);
  return useMemo(() => () => source?.syncNow() ?? Promise.resolve('disabled' as const), [source]);
}

/** Trava de "sem internet" da primeira sincronização e o "Tentar de novo" dela. */
export function useFirstSyncLatch(): { offline: boolean; retry: () => Promise<SyncResult> } {
  const { firstSyncOffline, retryFirstSync } = useContext(SyncContext);
  return useMemo(() => ({ offline: firstSyncOffline, retry: retryFirstSync }), [firstSyncOffline, retryFirstSync]);
}

export function useSyncLabels(): Record<string, SyncTableLabel> {
  return useContext(SyncContext).labels;
}

/** Fila do que espera para subir (agrupada por tabela e tipo de alteração). */
export function usePendingChanges(): PendingChange[] {
  const { source } = useContext(SyncContext);
  const [changes, setChanges] = useState<PendingChange[]>([]);
  useEffect(() => source?.watchPending(setChanges), [source]);
  return changes;
}

/** Linhas vivas por grupo neste aparelho; null enquanto lê. */
export function useLocalCounts(): Record<CountGroup, number> | null {
  const { source, labels } = useContext(SyncContext);
  const groups = useMemo(() => countGroupsOf(labels), [labels]);
  const [counts, setCounts] = useState<Record<CountGroup, number> | null>(null);
  useEffect(
    () => source?.watchCounts(groups, (c) => setCounts({ notes: c.notes ?? 0, transactions: c.transactions ?? 0, agenda: c.agenda ?? 0, diet: c.diet ?? 0 })),
    [source, groups],
  );
  return counts;
}
