import { describe, expect, it, vi } from 'vitest';

import { createExtractHandler } from '../functions/extract-text/handler.ts';

vi.mock('@glife/domain/ai', () => import('../../packages/domain/src/ai/index.ts'));

const claims: Record<string, Record<string, unknown>> = {
  'token-aal2': { sub: 'user-1', aal: 'aal2' },
  'token-aal1': { sub: 'user-1', aal: 'aal1' },
};

function setup(text = 'Olá, PDF.') {
  const extract = vi.fn(async (_bytes: Uint8Array) => ({ text, pages: 2 }));
  const handler = createExtractHandler({ verify: async (jwt) => claims[jwt] ?? null, extract });
  return { handler, extract };
}

const pdf = (body: BodyInit = new Uint8Array([37, 80, 68, 70]), over: { token?: string | null; type?: string; length?: string } = {}) => {
  const headers: Record<string, string> = { 'Content-Type': over.type ?? 'application/pdf' };
  if (over.token !== null) headers.Authorization = `Bearer ${over.token ?? 'token-aal2'}`;
  if (over.length) headers['Content-Length'] = over.length;
  return new Request('https://example.test/functions/v1/extract-text', { method: 'POST', headers, body });
};

describe('extract-text', () => {
  it('só POST', async () => {
    const { handler } = setup();
    expect((await handler(new Request('https://example.test/x', { method: 'GET' }))).status).toBe(405);
  });

  it('exige sessão com segundo fator', async () => {
    const { handler, extract } = setup();
    expect((await handler(pdf(undefined, { token: null }))).status).toBe(401);
    expect((await handler(pdf(undefined, { token: 'token-aal1' }))).status).toBe(403);
    expect(extract).not.toHaveBeenCalled();
  });

  it('só PDF', async () => {
    const { handler } = setup();
    expect((await handler(pdf(undefined, { type: 'image/png' }))).status).toBe(415);
  });

  it('recusa acima de 10 MB', async () => {
    const { handler, extract } = setup();
    expect((await handler(pdf(undefined, { length: String(10_000_001) }))).status).toBe(413);
    expect((await handler(pdf(new Uint8Array(10_000_001)))).status).toBe(413);
    expect(extract).not.toHaveBeenCalled();
  });

  it('devolve o texto e as páginas', async () => {
    const { handler } = setup();
    const res = await handler(pdf());
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ text: 'Olá, PDF.', pages: 2, truncated: false });
  });

  it('texto acima de 60 mil volta cortado', async () => {
    const { handler } = setup('z'.repeat(70_000));
    const body = (await (await handler(pdf())).json()) as { text: string; truncated: boolean };
    expect(body.text).toHaveLength(60_000);
    expect(body.truncated).toBe(true);
  });

  it('PDF sem texto (digitalizado) explica', async () => {
    const { handler } = setup('   ');
    const res = await handler(pdf());
    expect(res.status).toBe(422);
    expect(((await res.json()) as { error: string }).error).toMatch(/imagem/);
  });

  it('PDF que não abre: 422 sem detalhes internos', async () => {
    const extract = vi.fn(async () => {
      throw new Error('Invalid PDF structure at /secret/path');
    });
    const handler = createExtractHandler({ verify: async (jwt) => claims[jwt] ?? null, extract });
    const res = await handler(pdf());
    expect(res.status).toBe(422);
    expect(JSON.stringify(await res.json())).not.toContain('secret');
  });
});

describe('ai-agent: tamanho do pedido com anexos', () => {
  it('aceita até 400 mil caracteres (histórico + 120 mil de anexos)', async () => {
    const { MAX_BODY } = await import('../functions/ai-agent/request.ts');
    expect(MAX_BODY).toBe(400_000);
  });
});
