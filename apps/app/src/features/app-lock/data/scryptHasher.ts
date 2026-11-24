// Hash lento com sal para a senha do app. O scrypt em si vem de fora (`scryptKdf`): nativo no Android,
// JS no web. Os parâmetros vão junto no registro, então subir o custo depois não invalida senhas antigas.
import type { PasswordDigest, PasswordHasher } from '@glife/domain/applock';

export interface ScryptParams {
  N: number;
  r: number;
  p: number;
  dkLen: number;
}

/** 2^15 × 8 ≈ 32 MB de memória: caro para força bruta e ainda aceitável no celular. */
export const DEFAULT_SCRYPT_PARAMS: ScryptParams = { N: 2 ** 15, r: 8, p: 1, dkLen: 32 };
const SALT_BYTES = 16;

/** Deriva `dkLen` bytes da senha (já em bytes) e do sal. Implementações devem seguir o RFC 7914. */
export type ScryptKdf = (password: Uint8Array, salt: Uint8Array, params: ScryptParams) => Promise<Uint8Array>;

/**
 * Teto de memória para o scrypt nativo (OpenSSL). Ele precisa de um pouco mais que 128 × r × N, e o padrão
 * de 32 MB recusa N = 2^15; o dobro sobra.
 */
export function scryptMaxmem({ N, r }: ScryptParams) {
  return 2 * 128 * r * N;
}

const toBase64 = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes));
const fromBase64 = (b64: string) => Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
/** NFC: "é" digitado como um caractere ou como "e" + acento gera os mesmos bytes. */
const passwordBytes = (password: string) => new TextEncoder().encode(password.normalize('NFC'));

/** Compara sem sair cedo (o tempo não revela onde a diferença está). */
function equalBytes(a: Uint8Array, b: Uint8Array): boolean {
  let diff = a.length ^ b.length;
  for (let i = 0; i < Math.max(a.length, b.length); i++) diff |= (a[i] ?? 0) ^ (b[i] ?? 0);
  return diff === 0;
}

export function createScryptHasher({
  params = DEFAULT_SCRYPT_PARAMS,
  kdf,
  randomBytes,
}: {
  params?: ScryptParams;
  kdf: ScryptKdf;
  /** gerador criptográfico (expo-crypto no app) */
  randomBytes: (n: number) => Uint8Array;
}): PasswordHasher {
  const derive = (password: string, salt: Uint8Array, p: ScryptParams) => kdf(passwordBytes(password), salt, p);

  return {
    async hash(password): Promise<PasswordDigest> {
      const salt = randomBytes(SALT_BYTES);
      const hash = await derive(password, salt, params);
      return { kdf: { algo: 'scrypt', ...params }, salt: toBase64(salt), hash: toBase64(hash) };
    },
    async verify(password, digest) {
      const { N, r, p, dkLen } = digest.kdf;
      const hash = await derive(password, fromBase64(digest.salt), { N, r, p, dkLen });
      return equalBytes(hash, fromBase64(digest.hash));
    },
  };
}
