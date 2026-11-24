// Biometria do aparelho sem dependência nativa (testável): uma sentinela no armazenamento seguro presa à
// biometria. Ler a sentinela abre o diálogo do sistema; digital nova invalida a chave e a leitura volta null.
import type { BiometricOutcome, DeviceBiometrics } from '@glife/domain/applock';

export const BIOMETRIC_SENTINEL_KEY = 'glife.applock.bio.v1';

export interface BiometricBackend {
  /** Biometria forte (classe 3) cadastrada e aceita pelo armazenamento seguro. */
  hasStrongBiometrics(): Promise<boolean>;
  /** Gravações e leituras pedem biometria (requireAuthentication). */
  setItem(key: string, value: string): Promise<void>;
  getItem(key: string): Promise<string | null>;
  deleteItem(key: string): Promise<void>;
  randomToken(): string;
}

/** Os diálogos rejeitam com a mensagem nativa; só "cancelou" importa para a tela. */
export function biometricErrorOutcome(e: unknown): BiometricOutcome {
  const msg = e instanceof Error ? e.message : '';
  return /cancel/i.test(msg) ? 'cancel' : 'error';
}

export function createDeviceBiometrics(backend: BiometricBackend): DeviceBiometrics {
  const available = async () => {
    try {
      return await backend.hasStrongBiometrics();
    } catch {
      return false;
    }
  };

  return {
    available,
    async arm() {
      if (!(await available())) return 'unavailable';
      try {
        await backend.setItem(BIOMETRIC_SENTINEL_KEY, backend.randomToken());
        return 'ok';
      } catch (e) {
        return biometricErrorOutcome(e);
      }
    },
    async verify() {
      if (!(await available())) return 'unavailable';
      try {
        return (await backend.getItem(BIOMETRIC_SENTINEL_KEY)) === null ? 'changed' : 'ok';
      } catch (e) {
        return biometricErrorOutcome(e);
      }
    },
    async disarm() {
      try {
        await backend.deleteItem(BIOMETRIC_SENTINEL_KEY);
      } catch {
        // a biometria já está desligada no registro; sentinela órfã não libera nada
      }
    },
  };
}
