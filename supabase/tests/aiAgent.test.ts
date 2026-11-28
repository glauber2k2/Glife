import { convertArrayToReadableStream, MockLanguageModelV4 } from 'ai/test';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { AI_TOOLS, type AiUsage } from '../../packages/domain/src/ai/index.ts';
import { buildToolSet, createHandler, createUsageMeter, type AiBudget } from '../functions/ai-agent/handler.ts';
import { MAX_BODY } from '../functions/ai-agent/request.ts';

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

function setup(over: { full?: boolean } = {}) {
  const recorded: { id: string; userId: string; usage: AiUsage; microUsd: number }[] = [];
  const reserved: { userId: string; microUsd: number }[] = [];
  const budget: AiBudget = {
    reserve: async (userId, microUsd) => {
      reserved.push({ userId, microUsd });
      return over.full ? null : 'res-1';
    },
    settle: async (id, userId, usage, microUsd) => {
      recorded.push({ id, userId, usage, microUsd });
    },
  };
  const model = fakeModel();
  const handler = createHandler({
    verify: async (jwt) => claims[jwt] ?? null,
    budget,
    model,
    now: () => new Date('2026-11-30T05:00:00Z'), // fora do pico
  });
  return { handler, model, recorded, reserved };
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

  it('corpo grande demais responde 413', async () => {
    const { handler } = setup();
    expect((await handler(post({ messages: [userMsg('x'.repeat(MAX_BODY + 1))] }))).status).toBe(413);
  });

  it('JSON inválido ou mensagens demais respondem 400', async () => {
    const { handler } = setup();
    expect((await handler(post('{nao e json'))).status).toBe(400);
    const many = Array.from({ length: 61 }, (_, i) => userMsg('oi', `m${i}`));
    expect((await handler(post({ messages: many }))).status).toBe(400);
  });

  it('teto atingido responde 402 sem chamar o modelo', async () => {
    const { handler, model } = setup({ full: true });
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
    // fora do pico: (500*6000 + 1000*300000 + 200*1200000) / 2e6 = 271,5 → 272 µUSD
    expect(recorded[0]).toEqual({ id: 'res-1', userId: 'user-1', usage: { cacheHitTokens: 500, cacheMissTokens: 1000, outputTokens: 200 }, microUsd: 272 });
  });
});

describe('ai-agent: reserva e acerto do teto', () => {
  it('reserva uma estimativa em dólar antes de chamar o modelo', async () => {
    const { handler, reserved } = setup();
    await (await handler(post({ messages: [userMsg('oi')] }))).text();
    expect(reserved).toHaveLength(1);
    expect(reserved[0]!.microUsd).toBeGreaterThanOrEqual(2_400); // ao menos a saída máxima no pico
  });

  it('pedido abortado depois de um passo acerta com o uso já gasto', async () => {
    const settled: unknown[] = [];
    const meter = createUsageMeter({ settle: async (...a) => void settled.push(a), reserve: async () => 'x' }, 'user-1', 'res-9', () => new Date('2026-11-30T05:00:00Z'));
    meter.step({ inputTokens: 1000, inputTokenDetails: { noCacheTokens: 1000, cacheReadTokens: 0, cacheWriteTokens: 0 }, outputTokens: 100 } as never);
    await meter.abort();
    expect(settled).toEqual([['res-9', 'user-1', { cacheHitTokens: 0, cacheMissTokens: 1000, outputTokens: 100 }, 210]]);
  });

  it('pedido abortado sem nenhum passo mantém a estimativa reservada', async () => {
    const settled: unknown[] = [];
    const meter = createUsageMeter({ settle: async (...a) => void settled.push(a), reserve: async () => 'x' }, 'user-1', 'res-9', () => new Date());
    await meter.abort();
    expect(settled).toEqual([]);
  });
});
