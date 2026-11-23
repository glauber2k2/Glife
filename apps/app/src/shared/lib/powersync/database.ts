// Android/iOS: SQLite nativo (op-sqlite). Precisa de dev build; não roda no Expo Go.
// A versão web fica em database.web.ts (o Metro escolhe pela extensão da plataforma).
import { PowerSyncDatabase, type Schema } from '@powersync/react-native';

export const LOCAL_DB_FILE = 'glife.db';

export function createPowerSyncDatabase(schema: Schema) {
  return new PowerSyncDatabase({ schema, database: { dbFilename: LOCAL_DB_FILE } });
}
