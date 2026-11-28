import { createAliasBook } from '@glife/domain/ai';
import type { UIMessage } from 'ai';
import { describe, expect, it } from 'vitest';

import { createAgentTransport } from '@/features/ai/data/agentTransport';

const UUID = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;

function capture() {
  const calls: { url: string; init: RequestInit }[] = [];
  const fetchFn = (async (url: string | URL | Request, init?: RequestInit) => {
    calls.push({ url: String(url), init: init ?? {} });
    return new Response('data: [DONE]\n\n', { headers: { 'Content-Type': 'text/event-stream' } });
  }) as typeof fetch;
  return { calls, fetchFn };
}

const msg = (text: string): UIMessage => ({ id: 'm1', role: 'user', parts: [{ type: 'text', text }] });

describe('transporte do Glife IA', () => {
  it('manda para a função ai-agent com o token da sessão, a data de hoje e o texto mascarado', async () => {
    const { calls, fetchFn } = capture();
    const transport = createAgentTransport({
      url: 'https://exemplo.supabase.co/functions/v1/ai-agent',
      apikey: 'anon',
      getToken: async () => 't1',
      aliases: createAliasBook(),
      today: () => '2026-11-27',
      fetch: fetchFn,
    });
    await transport.sendMessages({
      chatId: 'c1',
      messages: [msg('ligar 11 98765-4321 sobre a nota 0b9e1a52-8c39-4a0e-9d58-2f0c3b2f8a11')],
      abortSignal: undefined,
      trigger: 'submit-message',
      messageId: undefined,
    });
    expect(calls).toHaveLength(1);
    expect(calls[0]!.url).toBe('https://exemplo.supabase.co/functions/v1/ai-agent');
    const headers = new Headers(calls[0]!.init.headers);
    expect(headers.get('authorization')).toBe('Bearer t1');
    expect(headers.get('apikey')).toBe('anon');
    const body = JSON.parse(String(calls[0]!.init.body)) as { today: string; messages: UIMessage[] };
    expect(body.today).toBe('2026-11-27');
    const text = (body.messages[0]!.parts[0] as { text: string }).text;
    expect(text).toContain('ligar [tel1]');
    expect(String(calls[0]!.init.body)).not.toMatch(UUID);
    expect(String(calls[0]!.init.body)).not.toContain('98765-4321');
  });

  it('sem sessão não envia nada', async () => {
    const { calls, fetchFn } = capture();
    const transport = createAgentTransport({ url: 'https://x/functions/v1/ai-agent', apikey: 'anon', getToken: async () => null, aliases: createAliasBook(), today: () => '2026-11-27', fetch: fetchFn });
    await expect(transport.sendMessages({ chatId: 'c1', messages: [msg('oi')], abortSignal: undefined, trigger: 'submit-message', messageId: undefined })).rejects.toThrow(/sessão/i);
    expect(calls).toHaveLength(0);
  });
});
