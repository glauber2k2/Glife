// Ponto único que monta o banco local e a sincronização: SQLite + conector Supabase + ciclo de vida.
import type { LocalDb } from '@glife/domain/core';
import { Schema, type PowerSyncBackendConnector, type Table } from '@powersync/common';

import { getSupabase } from '../supabase';
import { createSupabaseConnector, type UploadClient } from './connector';
import { createPowerSyncDatabase } from './database';
import { createSyncController, type SyncStage } from './lifecycle';
import { toLocalDb, type PowerSyncLike } from './localDb';

// Acesso estático: o Expo só embute variáveis escritas literalmente.
const endpoint = process.env.EXPO_PUBLIC_POWERSYNC_URL;

export interface LocalSync {
  /** banco local usado pelos repositórios das features */
  db: LocalDb;
  /** acompanhe o estado de acesso: conecta em `ready`, pausa na verificação, apaga ao sair */
  apply: (stage: SyncStage) => Promise<void>;
}

/**
 * Cria o banco local com as tabelas das features (composição na raiz do app).
 * Sem EXPO_PUBLIC_POWERSYNC_URL o banco funciona só neste aparelho (não sincroniza).
 */
export function createLocalSync(tables: Record<string, Table>): LocalSync {
  const ps = createPowerSyncDatabase(new Schema(tables));
  const online = !!endpoint?.startsWith('https://');
  if (!online) console.warn('Sincronização desligada: configure EXPO_PUBLIC_POWERSYNC_URL em apps/app/.env.local.');

  const supabase = getSupabase();
  const connector = createSupabaseConnector({
    supabase,
    endpoint: endpoint ?? '',
    client: supabase as unknown as UploadClient,
    // Só metadados no log: nunca o conteúdo da linha.
    onDiscard: (info) => console.warn('Alteração recusada pelo servidor e descartada', info),
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
  return { db: toLocalDb(ps as unknown as PowerSyncLike), apply: controller.apply };
}
