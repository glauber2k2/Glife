// Web: sem biometria nesta versão; o desbloqueio é pela senha do app.
import type { DeviceBiometrics } from '@glife/domain/applock';

export const deviceBiometrics: DeviceBiometrics = {
  available: async () => false,
  arm: async () => 'unavailable',
  verify: async () => 'unavailable',
  disarm: async () => {},
};
