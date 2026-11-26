import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import type { LocalSync, PendingChange } from './localSync';
import { INITIAL_SYNC, countGroupsOf, type CountGroup, type SyncSnapshot, type SyncTableLabel } from './syncState';

type SyncSource = Pick<LocalSync, 'onStatusChange' | 'syncNow' | 'watchPending' | 'watchCounts'>;

interface SyncContextValue {
  snapshot: SyncSnapshot;
  source: SyncSource | null;
  labels: Record<string, SyncTableLabel>;
}

const SyncContext = createContext<SyncContextValue>({ snapshot: INITIAL_SYNC, source: null, labels: {} });

/**
 * Estado da sincronização para as telas ("Salvo" × "Salvo no aparelho", Sincronização, Abertura).
 * `labels`: nome de cada tabela, entregue pelos módulos na raiz (a fila mostra "Nota editada", nunca o conteúdo).
 */
export function SyncStatusProvider({ sync, labels, children }: { sync: SyncSource; labels: Record<string, SyncTableLabel>; children: ReactNode }) {
  const [snapshot, setSnapshot] = useState<SyncSnapshot>(INITIAL_SYNC);
  useEffect(() => sync.onStatusChange(setSnapshot), [sync]);
  const value = useMemo(() => ({ snapshot, source: sync, labels }), [snapshot, sync, labels]);
  return <SyncContext.Provider value={value}>{children}</SyncContext.Provider>;
}

export function useSyncOnline(): boolean {
  return useContext(SyncContext).snapshot.connected;
}

export function useSyncState(): SyncSnapshot {
  return useContext(SyncContext).snapshot;
}

export function useSyncNow(): () => Promise<void> {
  const { source } = useContext(SyncContext);
  return useMemo(() => () => source?.syncNow() ?? Promise.resolve(), [source]);
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
