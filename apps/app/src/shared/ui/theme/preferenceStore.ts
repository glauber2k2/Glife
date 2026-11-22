// Persistência da preferência de tema. TS puro: o armazenamento concreto (AsyncStorage)
// é injetado pela raiz do app, então dá para testar e trocar sem mexer no ThemeProvider.

export type ThemePreference = 'system' | 'light' | 'dark';

/** O mínimo que precisamos de um armazenamento chave-valor (AsyncStorage satisfaz). */
export interface KeyValueStorage {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
}

export interface ThemePreferenceStore {
  load(): Promise<ThemePreference | null>;
  save(preference: ThemePreference): Promise<void>;
}

const KEY = 'glife.theme.preference';
const LEGACY_KEY = 'vida.theme.preference';
const VALID: readonly ThemePreference[] = ['system', 'light', 'dark'];

/** Valida o que veio do armazenamento: qualquer coisa fora do esperado é ignorada. */
export function parseThemePreference(raw: string | null): ThemePreference | null {
  return VALID.includes(raw as ThemePreference) ? (raw as ThemePreference) : null;
}

/** Falhas de armazenamento nunca derrubam o app: o tema só deixa de ser lembrado. */
export function createThemePreferenceStore(storage: KeyValueStorage): ThemePreferenceStore {
  return {
    async load() {
      try {
        const saved = parseThemePreference(await storage.getItem(KEY));
        return saved ?? parseThemePreference(await storage.getItem(LEGACY_KEY));
      } catch {
        return null;
      }
    },
    async save(preference) {
      try {
        await storage.setItem(KEY, preference);
      } catch {
        // sem persistência nesta sessão; a escolha continua valendo em memória
      }
    },
  };
}
