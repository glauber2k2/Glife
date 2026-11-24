// scrypt nativo (OpenSSL em C++, via react-native-quick-crypto), fora da thread de JS.
// Mesmo resultado do scryptKdf.ts (RFC 7914), então senhas criadas com um conferem no outro.
import { scrypt } from 'react-native-quick-crypto';

import { scryptMaxmem, type ScryptKdf } from './scryptHasher';

export const scryptKdf: ScryptKdf = (password, salt, params) =>
  new Promise((resolve, reject) => {
    const { N, r, p, dkLen } = params;
    scrypt(password, salt, dkLen, { N, r, p, maxmem: scryptMaxmem(params) }, (error, key) => {
      if (error || !key) reject(error ?? new Error('scrypt não devolveu a chave'));
      else resolve(new Uint8Array(key.buffer, key.byteOffset, key.byteLength));
    });
  });
