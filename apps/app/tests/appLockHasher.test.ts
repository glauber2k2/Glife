import { randomBytes, scryptSync } from 'node:crypto';
import { describe, expect, it, vi } from 'vitest';

import { DEFAULT_SCRYPT_PARAMS, createScryptHasher, scryptMaxmem } from '../src/features/app-lock/data/scryptHasher';
import { scryptKdf } from '../src/features/app-lock/data/scryptKdf';

// Parâmetros baixos só para o teste ser rápido; o app usa os padrões (N = 2^15).
const hasher = createScryptHasher({
  params: { N: 1024, r: 8, p: 1, dkLen: 32 },
  kdf: scryptKdf,
  randomBytes: (n) => randomBytes(n),
});

describe('hash scrypt da senha do app', () => {
  it('verifica a senha certa e recusa a errada', async () => {
    const digest = await hasher.hash('segredo1');
    expect(await hasher.verify('segredo1', digest)).toBe(true);
    expect(await hasher.verify('segredo2', digest)).toBe(false);
  });

  it('guarda os parâmetros e um sal de 16 bytes; nunca a senha', async () => {
    const digest = await hasher.hash('segredo1');
    expect(digest.kdf).toEqual({ algo: 'scrypt', N: 1024, r: 8, p: 1, dkLen: 32 });
    expect(atob(digest.salt)).toHaveLength(16);
    expect(atob(digest.hash)).toHaveLength(32);
    expect(JSON.stringify(digest)).not.toContain('segredo1');
  });

  it('sais diferentes geram hashes diferentes para a mesma senha', async () => {
    const a = await hasher.hash('segredo1');
    const b = await hasher.hash('segredo1');
    expect(a.salt).not.toBe(b.salt);
    expect(a.hash).not.toBe(b.hash);
  });

  it('verifica com os parâmetros guardados, mesmo que o padrão mude depois', async () => {
    const digest = await hasher.hash('segredo1');
    const newer = createScryptHasher({
      params: { N: 2048, r: 8, p: 1, dkLen: 32 },
      kdf: scryptKdf,
      randomBytes: (n) => randomBytes(n),
    });
    expect(await newer.verify('segredo1', digest)).toBe(true);
  });

  it('acentos: a mesma senha digitada de formas Unicode diferentes confere', async () => {
    const digest = await hasher.hash('café123');
    expect(await hasher.verify('café123', digest)).toBe(true);
  });
});

describe('scrypt nativo (Android) e JS (web) dão o mesmo resultado', () => {
  it('usa a função de derivação recebida, com a senha normalizada e os parâmetros guardados', async () => {
    const kdf = vi.fn(async () => new Uint8Array(32));
    const custom = createScryptHasher({ params: DEFAULT_SCRYPT_PARAMS, kdf, randomBytes: (n) => new Uint8Array(n) });
    await custom.hash('café');
    expect(kdf).toHaveBeenCalledWith(new TextEncoder().encode('café'), new Uint8Array(16), DEFAULT_SCRYPT_PARAMS);
  });

  it('o limite de memória cabe os parâmetros padrão (o padrão de 32 MB do OpenSSL não cabe)', () => {
    const { N, r, p, dkLen } = DEFAULT_SCRYPT_PARAMS;
    const salt = new Uint8Array(16);
    expect(() => scryptSync('x', salt, dkLen, { N, r, p })).toThrow();
    expect(() => scryptSync('x', salt, dkLen, { N, r, p, maxmem: scryptMaxmem(DEFAULT_SCRYPT_PARAMS) })).not.toThrow();
  });

  it('o scrypt JS confere byte a byte com o do OpenSSL (o mesmo do nativo): senhas antigas continuam valendo', async () => {
    const { N, r, p, dkLen } = DEFAULT_SCRYPT_PARAMS;
    const password = new TextEncoder().encode('senha-do-app');
    const salt = new Uint8Array(16).fill(7);
    const js = await scryptKdf(password, salt, DEFAULT_SCRYPT_PARAMS);
    const openssl = scryptSync(password, salt, dkLen, { N, r, p, maxmem: scryptMaxmem(DEFAULT_SCRYPT_PARAMS) });
    expect(Buffer.from(js).equals(openssl)).toBe(true);
  });
});
