// Bloqueio do app (protótipo "Glife Bloqueio"): portão, telas e núcleo do aparelho.
export { AppLockGate } from './components/AppLockGate';
export { SecurityLink } from './components/SecurityLink';
export { createDeviceAppLock } from './data/createDeviceAppLock';
export { deviceBiometrics } from './data/deviceBiometrics';
export { AppLockProvider, useAppLock } from './hooks/AppLockProvider';
export { ChangePasswordScreen } from './screens/ChangePasswordScreen';
export { SecurityScreen } from './screens/SecurityScreen';
