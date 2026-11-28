// Regras do laço da conversa, fora do hook para serem testadas:
// - portão da vez: "Nova conversa" e "Parar" invalidam a vez atual; saída de ferramenta que chegar depois é
//   descartada (não reabre o laço nem custa um pedido);
// - limite de rodadas: as ferramentas rodam no aparelho e o reenvio é automático, então o limite é aqui.
import { lastAssistantMessageIsCompleteWithToolCalls, type UIMessage } from 'ai';

export const MAX_TOOL_CALLS_PER_REPLY = 12;

export function createTurnGate() {
  let current = 0;
  return {
    begin: () => current,
    isCurrent: (turn: number) => turn === current,
    invalidate: () => {
      current += 1;
    },
  };
}

function toolCallsInLastReply(messages: readonly UIMessage[]): number {
  const last = messages[messages.length - 1];
  if (!last || last.role !== 'assistant') return 0;
  return last.parts.filter((p) => p.type.startsWith('tool-') || p.type === 'dynamic-tool').length;
}

export function toolCallsExceeded(messages: readonly UIMessage[]): boolean {
  return toolCallsInLastReply(messages) >= MAX_TOOL_CALLS_PER_REPLY;
}

export function shouldAutoSend({ messages }: { messages: UIMessage[] }): boolean {
  return lastAssistantMessageIsCompleteWithToolCalls({ messages }) && !toolCallsExceeded(messages);
}

/** Gravações diretas da vez atual (o executor soma; zera a cada mensagem do usuário e em "Nova conversa"). */
export function createWriteCounter() {
  const counter = {
    writes: 0,
    reset() {
      counter.writes = 0;
    },
  };
  return counter;
}
