import type { UIMessage } from 'ai';
import { describe, expect, it } from 'vitest';

import { MAX_TOOL_CALLS_PER_REPLY, createTurnGate, shouldAutoSend, toolCallsExceeded } from '@/features/ai/conversation';

const toolPart = (id: string) => ({ type: 'tool-notes_search', toolCallId: id, state: 'output-available', input: {}, output: {} });
const assistant = (n: number): UIMessage => ({ id: 'a', role: 'assistant', parts: Array.from({ length: n }, (_, i) => toolPart(`c${i}`)) as UIMessage['parts'] });
const user: UIMessage = { id: 'u', role: 'user', parts: [{ type: 'text', text: 'oi' }] };

describe('portão da vez', () => {
  it('saída de uma vez invalidada (Nova conversa ou Parar) é descartada', () => {
    const gate = createTurnGate();
    const a = gate.begin();
    expect(gate.isCurrent(a)).toBe(true);
    gate.invalidate();
    expect(gate.isCurrent(a)).toBe(false);
    expect(gate.isCurrent(gate.begin())).toBe(true);
  });
});

describe('limite de rodadas automáticas', () => {
  it('continua sozinho enquanto as ferramentas da resposta estão abaixo do limite', () => {
    expect(shouldAutoSend({ messages: [user, assistant(1)] })).toBe(true);
    expect(toolCallsExceeded([user, assistant(1)])).toBe(false);
  });

  it('para ao chegar no limite e avisa', () => {
    const many = assistant(MAX_TOOL_CALLS_PER_REPLY);
    expect(shouldAutoSend({ messages: [user, many] })).toBe(false);
    expect(toolCallsExceeded([user, many])).toBe(true);
  });

  it('não reenvia sem chamada de ferramenta completa', () => {
    expect(shouldAutoSend({ messages: [user] })).toBe(false);
  });
});
