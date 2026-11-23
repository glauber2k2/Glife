// Ponto único que monta a sincronização: banco local + conector Supabase + ciclo de vida.
import { Schema, type PowerSyncBackendConnector, type Table } from '@powersync/common';

import { getSupabase } from '../supabase';
import { createSyncController, type SyncStage } from './lifecycle';
import { createSupabaseConnector, type UploadClient } from './connector';
import { createPowerSyncDatabase } from './database';

// Acesso estático: o Expo só embute variáveis escritas literalmente.
const endpoint = process.env.EXPO_PUBLIC_POWERSYNC_URL;

export interface LocalSync {
  /** banco local (SQLite); as tabelas vêm dos schemas das features */
  db: ReturnType<typeof createPowerSyncDatabase>;
  /** acompanhe o estado de acesso: conecta em `ready`, pausa na verificação, apaga ao sair */
  apply: (stage: SyncStage) => Promise<void>;
}

/**
 * Cria a sincronização com as tabelas informadas (composição na raiz do app).
 * Sem EXPO_PUBLIC_POWERSYNC_URL, devolve null: o app funciona, só não sincroniza.
 */
export function createLocalSync(tables: Record<string, Table>): LocalSync | null {
  if (!endpoint?.startsWith('https://')) {
    console.warn('Sincronização desligada: configure EXPO_PUBLIC_POWERSYNC_URL em apps/app/.env.local.');
    return null;
  }
  const supabase = getSupabase();
  const db = createPowerSyncDatabase(new Schema(tables));
  const connector = createSupabaseConnector({
    supabase,
    endpoint,
    client: supabase as unknown as UploadClient,
    // Só metadados no log: nunca o conteúdo da linha.
    onDiscard: (info) => console.warn('Alteração recusada pelo servidor e descartada', info),
  });
  // O conector usa um subconjunto estrutural dos tipos do SDK (op em string, sem enum).
  const backend = connector as unknown as PowerSyncBackendConnector;
  const controller = createSyncController(
    {
      connect: (c: PowerSyncBackendConnector) => db.connect(c),
      disconnect: () => db.disconnect(),
      disconnectAndClear: () => db.disconnectAndClear(),
    },
    backend,
    (e) => console.warn('Falha na sincronização', e),
  );
  return { db, apply: controller.apply };
}
