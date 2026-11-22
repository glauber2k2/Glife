import { describe, expect, it, vi } from 'vitest';

import { handler } from '../functions/hello/handler.ts';

// Vitest não lê o import map do Deno: resolve o alias para a implementação real do domain.
vi.mock('@glife/domain/bible', () => import('../../packages/domain/src/bible/index.ts'));

function request(ref?: string) {
  const url = new URL('https://example.test/functions/v1/hello');
  if (ref !== undefined) url.searchParams.set('ref', ref);
  return new Request(url);
}

describe('hello: validação de referências bíblicas pelo domain', () => {
  it.each([
    ['Jo 3:16', 'JHN.3.16'],
    [' Sl 23 ', 'PSA.23'],
    ['1 Co 13:4-7', '1CO.13.4-7'],
  ])('converte %s em %s', async (ref, osis) => {
    const response = await handler(request(ref));
    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toContain('application/json');
    expect(await response.json()).toEqual({ osis });
  });

  it.each(['referência inexistente', 'Jo 99:16', 'Jo 0:16'])('rejeita referência inválida: %s', async (ref) => {
    const response = await handler(request(ref));
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body).toEqual({ error: 'Referência bíblica inválida.' });
    expect(JSON.stringify(body)).not.toContain(ref);
  });

  it.each([undefined, '', '   '])('informa quando a referência está ausente ou vazia (%s)', async (ref) => {
    const response = await handler(request(ref));
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: 'Informe uma referência bíblica no parâmetro ref.' });
  });
});
