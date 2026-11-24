// Android/iOS: biometria forte via expo-local-authentication (disponibilidade) e sentinela no SecureStore
// (requireAuthentication = setUserAuthenticationRequired no Android; a chave morre com digital nova).
import * as Crypto from 'expo-crypto';
import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';

import { createDeviceBiometrics } from './deviceBiometricsCore';

const OPTIONS: SecureStore.SecureStoreOptions = {
  requireAuthentication: true,
  authenticationPrompt: 'Desbloquear o Glife',
};

const toHex = (bytes: Uint8Array) => Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');

export const deviceBiometrics = createDeviceBiometrics({
  async hasStrongBiometrics() {
    if (!SecureStore.canUseBiometricAuthentication()) return false;
    const level = await LocalAuthentication.getEnrolledLevelAsync();
    return level >= LocalAuthentication.SecurityLevel.BIOMETRIC_STRONG;
  },
  setItem: (k, v) => SecureStore.setItemAsync(k, v, OPTIONS),
  getItem: (k) => SecureStore.getItemAsync(k, OPTIONS),
  deleteItem: (k) => SecureStore.deleteItemAsync(k, OPTIONS),
  randomToken: () => toHex(Crypto.getRandomBytes(16)),
});
