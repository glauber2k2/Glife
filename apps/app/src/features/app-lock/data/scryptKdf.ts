// scrypt em JS puro (@noble/hashes): usado no web, onde o JIT do navegador o deixa rápido.
// No Hermes (Android, sem JIT) levaria dezenas de segundos; lá vale scryptKdf.native.ts.
import { scryptAsync } from '@noble/hashes/scrypt.js';

import type { ScryptKdf } from './scryptHasher';

// asyncTick: devolve o controle à interface durante o cálculo.
export const scryptKdf: ScryptKdf = (password, salt, { N, r, p, dkLen }) =>
  scryptAsync(password, salt, { N, r, p, dkLen, asyncTick: 10 });
