// Divide valores grandes em pedaços: o SecureStore avisa/falha acima de ~2 KB por chave,
// e a sessão do Supabase (JWT + refresh + usuário) passa disso.

export interface AsyncKeyValue {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}

/** Abaixo de 2048 bytes com folga (o conteúdo da sessão é ASCII). */
export const CHUNK_SIZE = 1800;

const countKey = (key: string) => `${key}.n`;
const partKey = (key: string, i: number) => `${key}.${i}`;

export function createChunkedStorage(backend: AsyncKeyValue): AsyncKeyValue {
  async function readCount(key: string): Promise<number> {
    const n = Number(await backend.getItem(countKey(key)));
    return Number.isInteger(n) && n > 0 ? n : 0;
  }

  async function removeParts(key: string, from: number, to: number) {
    for (let i = from; i < to; i++) await backend.removeItem(partKey(key, i));
  }

  return {
    async getItem(key) {
      const n = await readCount(key);
      if (n === 0) return null;
      const parts: string[] = [];
      for (let i = 0; i < n; i++) {
        const part = await backend.getItem(partKey(key, i));
        if (part === null) return null; // gravação interrompida: trata como ausente
        parts.push(part);
      }
      return parts.join('');
    },

    async setItem(key, value) {
      const previous = await readCount(key);
      const n = Math.max(1, Math.ceil(value.length / CHUNK_SIZE));
      for (let i = 0; i < n; i++) {
        await backend.setItem(partKey(key, i), value.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE));
      }
      await backend.setItem(countKey(key), String(n));
      await removeParts(key, n, previous);
    },

    async removeItem(key) {
      const n = await readCount(key);
      await removeParts(key, 0, n);
      await backend.removeItem(countKey(key));
    },
  };
}
