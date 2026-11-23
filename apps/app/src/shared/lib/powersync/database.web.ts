// Web: SQLite em WebAssembly dentro de um worker. O Metro não reescreve `new URL(..., import.meta.url)`,
// então o worker pré-compilado é copiado para public/@powersync (script powersync:assets, no postinstall).
import { PowerSyncDatabase, type Schema } from '@powersync/web';

export const LOCAL_DB_FILE = 'glife.db';
const WORKER = '/@powersync/worker.js';

export function createPowerSyncDatabase(schema: Schema) {
  return new PowerSyncDatabase({
    schema,
    database: { dbFilename: LOCAL_DB_FILE, worker: WORKER },
    sync: { worker: WORKER },
  });
}
