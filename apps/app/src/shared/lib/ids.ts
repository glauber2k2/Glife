import { setIdGenerator } from '@glife/domain/core';
import * as Crypto from 'expo-crypto';

/** Hermes não tem crypto.randomUUID em todas as versões: usa o gerador nativo do Expo. */
export function installIdGenerator() {
  setIdGenerator(() => Crypto.randomUUID());
}
