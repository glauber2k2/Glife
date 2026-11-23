import { isAuthError } from '@glife/domain/auth';
import { describe, expect, it } from 'vitest';

import { toAuthError } from '../src/features/auth/data/errors';
import { svgFromDataUrl } from '../src/features/auth/data/qr';
import { CHUNK_SIZE, createChunkedStorage, type AsyncKeyValue } from '../src/shared/lib/chunkedStorage';

function memory(): AsyncKeyValue & { data: Map<string, string> } {
  const data = new Map<string, string>();
  return {
    data,
    getItem: async (k) => data.get(k) ?? null,
    setItem: async (k, v) => void data.set(k, v),
    removeItem: async (k) => void data.delete(k),
  };
}

describe('armazenamento em pedaços (SecureStore guarda até ~2 KB por chave)', () => {
  it('guarda e lê valores grandes em pedaços menores que o limite', async () => {
    const backend = memory();
    const store = createChunkedStorage(backend);
    const big = 'x'.repeat(CHUNK_SIZE * 2 + 10);
    await store.setItem('sb-ref-auth-token', big);
    expect([...backend.data.values()].every((v) => v.length <= CHUNK_SIZE)).toBe(true);
    expect(await store.getItem('sb-ref-auth-token')).toBe(big);
  });

  it('regravar menor apaga os pedaços que sobraram', async () => {
    const backend = memory();
    const store = createChunkedStorage(backend);
    await store.setItem('k', 'a'.repeat(CHUNK_SIZE * 3));
    await store.setItem('k', 'curto');
    expect(await store.getItem('k')).toBe('curto');
    expect(backend.data.size).toBe(2); // contador + 1 pedaço
  });

  it('remove tudo e devolve null para chave ausente ou corrompida', async () => {
    const backend = memory();
    const store = createChunkedStorage(backend);
    await store.setItem('k', 'a'.repeat(CHUNK_SIZE + 1));
    await store.removeItem('k');
    expect(backend.data.size).toBe(0);
    expect(await store.getItem('k')).toBeNull();
    backend.data.set('k.n', '2');
    backend.data.set('k.0', 'só um');
    expect(await store.getItem('k')).toBeNull();
    backend.data.set('k.n', 'lixo');
    expect(await store.getItem('k')).toBeNull();
  });

  it('só usa caracteres aceitos pelo SecureStore nas chaves', async () => {
    const backend = memory();
    await createChunkedStorage(backend).setItem('sb-abc-auth-token', 'v');
    expect([...backend.data.keys()].every((k) => /^[\w.-]+$/.test(k))).toBe(true);
  });
});

describe('QR code do Supabase', () => {
  it('extrai o SVG do data URL', () => {
    expect(svgFromDataUrl('data:image/svg+xml;utf-8,<svg a="1"></svg>')).toBe('<svg a="1"></svg>');
    expect(svgFromDataUrl('data:image/svg+xml;utf-8,%3Csvg%3E%3C%2Fsvg%3E')).toBe('<svg></svg>');
    expect(svgFromDataUrl('<svg></svg>')).toBe('<svg></svg>');
  });

  it('recusa conteúdo que não é SVG', () => {
    expect(svgFromDataUrl('data:text/html,<script></script>')).toBeNull();
    expect(svgFromDataUrl('')).toBeNull();
  });
});

describe('tradução de erros do Supabase', () => {
  it.each([
    [{ code: 'invalid_credentials', status: 400 }, 'invalid_credentials'],
    [{ code: 'mfa_verification_failed', status: 422 }, 'invalid_code'],
    [{ code: 'mfa_challenge_expired', status: 422 }, 'invalid_code'],
    [{ code: 'over_request_rate_limit', status: 429 }, 'rate_limited'],
    [{ status: 429 }, 'rate_limited'],
    [{ name: 'AuthRetryableFetchError', status: 0 }, 'network'],
    [new TypeError('Network request failed'), 'network'],
    [{ code: 'qualquer_outro', status: 500 }, 'unknown'],
    ['texto', 'unknown'],
  ])('%o → %s', (raw, code) => {
    const e = toAuthError(raw);
    expect(isAuthError(e, code as never)).toBe(true);
    expect(e.cause).toBe(raw);
  });
});
