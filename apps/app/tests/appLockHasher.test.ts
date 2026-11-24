import { randomBytes } from 'node:crypto';
import { describe, expect, it } from 'vitest';

import { createScryptHasher } from '../src/features/app-lock/data/scryptHasher';

// Parâmetros baixos só para o teste ser rápido; o app usa os padrões (N = 2^15).
const hasher = createScryptHasher({ params: { N: 1024, r: 8, p: 1, dkLen: 32 }, randomBytes: (n) => randomBytes(n) });

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
    const newer = createScryptHasher({ params: { N: 2048, r: 8, p: 1, dkLen: 32 }, randomBytes: (n) => randomBytes(n) });
    expect(await newer.verify('segredo1', digest)).toBe(true);
  });

  it('acentos: a mesma senha digitada de formas Unicode diferentes confere', async () => {
    const digest = await hasher.hash('café123');
    expect(await hasher.verify('café123', digest)).toBe(true);
  });
});
