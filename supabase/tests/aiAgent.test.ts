import { convertArrayToReadableStream, MockLanguageModelV4 } from 'ai/test';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { AI_TOOLS, type AiUsage } from '../../packages/domain/src/ai/index.ts';
import { buildToolSet, createHandler, type AiBudget } from '../functions/ai-agent/handler.ts';

// Vitest não lê o import map do Deno: resolve o alias para a implementação real do domain.
vi.mock('@glife/domain/ai', () => import('../../packages/domain/src/ai/index.ts'));

const claims: Record<string, Record<string, unknown>> = {
  'token-aal2': { sub: 'user-1', aal: 'aal2' },
  'token-aal1': { sub: 'user-1', aal: 'aal1' },
};

function fakeModel() {
  return new MockLanguageModelV4({
    doStream: async () => ({
      stream: convertArrayToReadableStream([
        { type: 'text-start', id: 't1' },
        { type: 'text-delta', id: 't1', delta: 'Feito.' },
        { type: 'text-end', id: 't1' },
        {
          type: 'finish',
          finishReason: { unified: 'stop', raw: 'stop' },
          usage: {
            inputTokens: { total: 1500, noCache: 1000, cacheRead: 500, cacheWrite: undefined },
            outputTokens: { total: 200, text: 200, reasoning: undefined },
          },
        },
      ]),
    }),
  });
}

function setup(over: { spent?: number; usdBrl?: number | null } = {}) {
  const recorded: { userId: string; usage: AiUsage; microUsd: number; cents: number }[] = [];
  const budget: AiBudget = {
    status: async () => ({ capCents: 2000, spentCents: over.spent ?? 0 }),
    record: async (userId, usage, microUsd, cents) => {
      recorded.push({ userId, usage, microUsd, cents });
    },
  };
  const model = fakeModel();
  const handler = createHandler({
    verify: async (jwt) => claims[jwt] ?? null,
    budget,
    model,
    usdBrl: over.usdBrl === undefined ? 5.4 : over.usdBrl,
    now: () => new Date('2026-11-30T05:00:00Z'), // fora do pico
  });
  return { handler, model, recorded };
}

const userMsg = (text: string, id = 'm1') => ({ id, role: 'user', parts: [{ type: 'text', text }] });

const post = (body: unknown, token: string | null = 'token-aal2') =>
  new Request('https://example.test/functions/v1/ai-agent', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });

afterEach(() => vi.restoreAllMocks());

describe('ai-agent: acesso e limites', () => {
  it('sem token responde 401 e não chama o modelo', async () => {
    const { handler, model } = setup();
    expect((await handler(post({ messages: [userMsg('oi')] }, null))).status).toBe(401);
    expect(model.doStreamCalls).toHaveLength(0);
  });

  it('sessão sem MFA responde 403', async () => {
    const { handler, model } = setup();
    expect((await handler(post({ messages: [userMsg('oi')] }, 'token-aal1'))).status).toBe(403);
    expect(model.doStreamCalls).toHaveLength(0);
  });

  it('sem cotação do dólar responde 503', async () => {
    const { handler } = setup({ usdBrl: null });
    const res = await handler(post({ messages: [userMsg('oi')] }));
    expect(res.status).toBe(503);
    expect((await res.json()).error).toMatch(/cotação/);
  });

  it('corpo grande demais responde 413', async () => {
    const { handler } = setup();
    expect((await handler(post({ messages: [userMsg('x'.repeat(200_001))] }))).status).toBe(413);
  });

  it('JSON inválido ou mensagens demais respondem 400', async () => {
    const { handler } = setup();
    expect((await handler(post('{nao e json'))).status).toBe(400);
    const many = Array.from({ length: 61 }, (_, i) => userMsg('oi', `m${i}`));
    expect((await handler(post({ messages: many }))).status).toBe(400);
  });

  it('teto atingido responde 402 sem chamar o modelo', async () => {
    const { handler, model } = setup({ spent: 2000 });
    const res = await handler(post({ messages: [userMsg('oi')] }));
    expect(res.status).toBe(402);
    expect((await res.json()).error).toMatch(/teto/);
    expect(model.doStreamCalls).toHaveLength(0);
  });
});

describe('ai-agent: privacidade', () => {
  it('limpa dados pessoais do texto e dos resultados de ferramenta antes do modelo', async () => {
    const { handler, model } = setup();
    const messages = [
      userMsg('meu email é joao@x.com e o cpf 123.456.789-09', 'm1'),
      {
        id: 'm2',
        role: 'assistant',
        parts: [
          { type: 'tool-notes_search', toolCallId: 'c1', state: 'output-available', input: {}, output: { notes: [{ note: 'n1', snippet: 'ligar 11 98765-4321' }] } },
        ],
      },
      userMsg('e agora?', 'm3'),
    ];
    const res = await handler(post({ messages }));
    expect(res.status).toBe(200);
    await res.text();
    const prompt = JSON.stringify(model.doStreamCalls[0]!.prompt);
    expect(prompt).not.toContain('joao@x.com');
    expect(prompt).not.toContain('123.456.789-09');
    expect(prompt).not.toContain('98765-4321');
  });

  it('não registra o conteúdo da conversa em log', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const { handler } = setup();
    await (await handler(post({ messages: [userMsg('segredo-da-conversa')] }))).text();
    const logged = JSON.stringify([...error.mock.calls, ...warn.mock.calls]);
    expect(logged).not.toContain('segredo-da-conversa');
  });
});

describe('ai-agent: ferramentas e custo', () => {
  it('entrega ao modelo as ferramentas do registro, sem execute', async () => {
    const set = buildToolSet();
    expect(Object.keys(set).sort()).toEqual(AI_TOOLS.map((t) => t.name).sort());
    for (const t of Object.values(set)) expect((t as { execute?: unknown }).execute).toBeUndefined();
    const { handler, model } = setup();
    await (await handler(post({ messages: [userMsg('oi')] }))).text();
    const names = (model.doStreamCalls[0]!.tools ?? []).map((t) => t.name).sort();
    expect(names).toEqual(AI_TOOLS.map((t) => t.name).sort());
  });

  it('grava o custo real ao terminar', async () => {
    const { handler, recorded } = setup();
    await (await handler(post({ messages: [userMsg('oi')] }))).text();
    await vi.waitFor(() => expect(recorded).toHaveLength(1));
    // fora do pico: (500*6000 + 1000*300000 + 200*1200000) / 2e6 = 271,5 → 272 µUSD; 272 * 5,4 → 1 centavo
    expect(recorded[0]).toEqual({ userId: 'user-1', usage: { cacheHitTokens: 500, cacheMissTokens: 1000, outputTokens: 200 }, microUsd: 272, cents: 1 });
  });
});
