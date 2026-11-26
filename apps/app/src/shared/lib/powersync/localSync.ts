// Ponto único que monta o banco local e a sincronização: SQLite + conector Supabase + ciclo de vida.
import type { LocalDb } from '@glife/domain/core';
import { Schema, type PowerSyncBackendConnector, type Table } from '@powersync/common';

import { getSupabase } from '../supabase';
import { createSupabaseConnector, type UploadClient } from './connector';
import { createPowerSyncDatabase } from './database';
import { createSyncController, type SyncStage } from './lifecycle';
import { toLocalDb, type PowerSyncLike } from './localDb';
import { dropSearchIndexes, ensureSearchIndexes, type FtsIndexSpec } from './searchIndex';
import { INITIAL_SYNC, type CrudOpName, type SyncSnapshot } from './syncState';

// Acesso estático: o Expo só embute variáveis escritas literalmente.
const endpoint = process.env.EXPO_PUBLIC_POWERSYNC_URL;

export interface LocalSync {
  /** banco local usado pelos repositórios das features */
  db: LocalDb;
  /** acompanhe o estado de acesso: conecta em `ready`, pausa na verificação, apaga ao sair */
  apply: (stage: SyncStage) => Promise<void>;
  /** avisa quando a conexão com o servidor de sincronização muda */
  onConnectedChange: (listener: (connected: boolean) => void) => () => void;
  /** estado da sincronização agora e a cada mudança */
  onStatusChange: (listener: (snapshot: SyncSnapshot) => void) => () => void;
  /** "Sincronizar agora": reconecta e resolve quando a troca termina (ou falha, ou demora demais) */
  syncNow: () => Promise<void>;
  /** fila de envio agrupada por tabela e tipo de alteração (só metadados, nunca o conteúdo) */
  watchPending: (listener: (changes: PendingChange[]) => void) => () => void;
  /** linhas vivas por grupo de tabelas (contagens "Neste aparelho") */
  watchCounts: (groups: Record<string, readonly string[]>, listener: (counts: Record<string, number>) => void) => () => void;
}

export interface PendingChange {
  table: string;
  op: CrudOpName;
  count: number;
}

const TABLE_RE = /^[a-z_]+$/;
const OPS = new Set<string>(['PUT', 'PATCH', 'DELETE']);
/** Só o tipo e a tabela de cada alteração da fila; o conteúdo fica no SQLite. */
const PENDING_SQL = `SELECT json_extract(data, '$.op') AS op, json_extract(data, '$.type') AS tbl, count(*) AS n, max(id) AS last
  FROM ps_crud GROUP BY op, tbl ORDER BY last DESC`;
const SYNC_NOW_TIMEOUT_MS = 15000;

/**
 * Cria o banco local com as tabelas das features (composição na raiz do app).
 * Sem EXPO_PUBLIC_POWERSYNC_URL o banco funciona só neste aparelho (não sincroniza).
 */
export function createLocalSync(tables: Record<string, Table>, searchIndexes: FtsIndexSpec[] = []): LocalSync {
  const ps = createPowerSyncDatabase(new Schema(tables));
  const online = !!endpoint?.startsWith('https://');
  if (!online) console.warn('Sincronização desligada: configure EXPO_PUBLIC_POWERSYNC_URL em apps/app/.env.local.');

  const supabase = getSupabase();
  let credentialsRefused = false;
  const credentialListeners = new Set<() => void>();
  const connector = createSupabaseConnector({
    supabase,
    endpoint: endpoint ?? '',
    client: supabase as unknown as UploadClient,
    // Só metadados no log: nunca o conteúdo da linha.
    onDiscard: (info) => console.warn('Alteração recusada pelo servidor e descartada', info),
    onCredentials: (ok) => {
      if (credentialsRefused === !ok) return;
      credentialsRefused = !ok;
      credentialListeners.forEach((l) => l());
    },
  });
  // O conector usa um subconjunto estrutural dos tipos do SDK (op em string, sem enum).
  const backend = connector as unknown as PowerSyncBackendConnector;
  const controller = createSyncController(
    {
      connect: (c: PowerSyncBackendConnector) => (online ? ps.connect(c) : Promise.resolve()),
      disconnect: () => ps.disconnect(),
      disconnectAndClear: () => ps.disconnectAndClear(),
    },
    backend,
    (e) => console.warn('Falha na sincronização', e),
  );
  const db = toLocalDb(ps as unknown as PowerSyncLike);

  const snapshot = (): SyncSnapshot => {
    const st = ps.currentStatus;
    if (!st) return { ...INITIAL_SYNC, enabled: online };
    return {
      enabled: online,
      connected: st.connected,
      connecting: st.connecting,
      hasSynced: st.hasSynced,
      lastSyncedAt: st.lastSyncedAt ?? null,
      uploading: st.dataFlowStatus.uploading ?? false,
      downloading: st.dataFlowStatus.downloading ?? false,
      failed: !!st.dataFlowStatus.downloadError,
      progress: st.downloadProgress?.downloadedFraction ?? null,
      sessionExpired: credentialsRefused,
    };
  };
  const onStatusChange = (listener: (s: SyncSnapshot) => void) => {
    const emit = () => listener(snapshot());
    emit();
    credentialListeners.add(emit);
    const off = ps.registerListener({ statusChanged: emit });
    return () => {
      credentialListeners.delete(emit);
      off();
    };
  };

  return {
    db,
    apply: async (stage) => {
      await controller.apply(stage);
      // Índice de busca só com acesso completo; ao sair, apagado junto com o banco local.
      if (stage === 'ready') await ensureSearchIndexes(db, searchIndexes);
      else if (stage === 'signed_out') await dropSearchIndexes(db, searchIndexes).catch((e) => console.warn(e));
    },
    onConnectedChange: (listener) => {
      listener(ps.currentStatus.connected);
      return ps.registerListener({ statusChanged: (status) => listener(status.connected) });
    },
    onStatusChange,
    syncNow: () =>
      new Promise<void>((resolve) => {
        const before = ps.currentStatus.lastSyncedAt?.getTime() ?? 0;
        let started = false;
        let off = () => {};
        const timer = setTimeout(() => finish(), SYNC_NOW_TIMEOUT_MS);
        function finish() {
          clearTimeout(timer);
          off();
          resolve();
        }
        off = onStatusChange((s) => {
          if (!started) return;
          const fresh = (s.lastSyncedAt?.getTime() ?? 0) > before;
          if (s.sessionExpired || (s.failed && !s.connecting) || (fresh && !s.uploading && !s.downloading)) finish();
        });
        started = true;
        if (!online) return finish();
        void controller.reconnect();
      }),
    watchPending: (listener) => {
      let active = true;
      const read = () =>
        db
          .getAll<{ op: string; tbl: string; n: number }>(PENDING_SQL)
          .then((rows) => {
            if (!active) return;
            listener(rows.filter((r) => OPS.has(r.op) && typeof r.tbl === 'string').map((r) => ({ table: r.tbl, op: r.op as CrudOpName, count: Number(r.n) })));
          })
          .catch((e) => console.warn('Falha ao ler a fila de envio', e));
      void read();
      // A fila muda ao gravar (watch) e ao enviar (estado de upload).
      const offWatch = db.watch(PENDING_SQL, [], () => void read(), () => {});
      const offStatus = ps.registerListener({ statusChanged: () => void read() });
      return () => {
        active = false;
        offWatch();
        offStatus();
      };
    },
    watchCounts: (groups, listener) => {
      const parts = Object.entries(groups).flatMap(([key, tables]) =>
        tables.filter((t) => TABLE_RE.test(t)).map((t) => ({ key, sql: `SELECT ? AS k, count(*) AS n FROM ${t} WHERE deleted_at IS NULL` })),
      );
      if (!parts.length) {
        listener({});
        return () => {};
      }
      return db.watch<{ k: string; n: number }>(
        parts.map((p) => p.sql).join(' UNION ALL '),
        parts.map((p) => p.key),
        (rows) => {
          const counts: Record<string, number> = {};
          for (const r of rows) counts[r.k] = (counts[r.k] ?? 0) + Number(r.n);
          listener(counts);
        },
        (e) => console.warn('Falha ao contar os dados do aparelho', e),
      );
    },
  };
}
