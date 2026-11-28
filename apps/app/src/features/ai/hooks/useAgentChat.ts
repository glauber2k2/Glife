// Conversa com o Glife IA: useChat (AI SDK) com o transporte seguro; as ferramentas que o modelo pede são
// executadas aqui no aparelho (executor + política), e o resultado volta ao modelo automaticamente. Cada conversa
// tem seu livro de apelidos (ids e dados pessoais nunca saem do aparelho).
import { useChat } from '@ai-sdk/react';
import { createAliasBook } from '@glife/domain/ai';
import { newId } from '@glife/domain/core';
import { localNow } from '@glife/domain/time';
import { useCallback, useMemo, useState } from 'react';

import { useAiTools } from '../AiToolsProvider';
import { createTurnGate, createWriteCounter, shouldAutoSend, toolCallsExceeded } from '../conversation';
import { agentConnection } from '../data/agentConnection';
import { createAgentTransport } from '../data/agentTransport';
import { executeToolCall, type AiActionEntry } from '../executor';

export interface PendingConfirm {
  summary: string;
  answer: (yes: boolean) => void;
}

/** A Edge Function responde erros como JSON `{ error }`; o transporte os entrega como texto da mensagem. */
export function agentErrorText(error: Error | undefined): string | null {
  if (!error) return null;
  try {
    const parsed = JSON.parse(error.message) as { error?: unknown };
    if (typeof parsed.error === 'string') return parsed.error;
  } catch {
    // não é JSON: mensagem do próprio app ou do provedor
  }
  return error.message || 'O Glife IA não respondeu. Tente de novo.';
}

export function useAgentChat() {
  const { kit, log } = useAiTools();
  const [conversationId, setConversationId] = useState(newId);
  const aliases = useMemo(() => createAliasBook(), [conversationId]); // eslint-disable-line react-hooks/exhaustive-deps
  const [pending, setPending] = useState<PendingConfirm | null>(null);
  const [actions, setActions] = useState<Record<string, AiActionEntry>>({});
  const today = () => localNow().date;
  // "Nova conversa" e "Parar" invalidam a vez: saída de ferramenta que chegar depois é descartada.
  const [gate] = useState(createTurnGate);
  // Gravações diretas desta vez (zera a cada mensagem do usuário): muitas em sequência pedem confirmação.
  const [turn] = useState(createWriteCounter);

  const transport = useMemo(() => createAgentTransport({ ...agentConnection(), aliases, today }), [aliases]);

  const confirm = useCallback(
    (summary: string) =>
      new Promise<boolean>((resolve) => {
        setPending({
          summary,
          answer: (yes) => {
            setPending(null);
            resolve(yes);
          },
        });
      }),
    [],
  );

  const chat = useChat({
    id: conversationId,
    transport,
    experimental_throttle: 50,
    sendAutomaticallyWhen: shouldAutoSend,
    async onToolCall({ toolCall }) {
      const myTurn = gate.begin();
      const output = await executeToolCall(
        { toolName: toolCall.toolName, input: toolCall.input },
        {
          kit,
          ctx: { aliases, today: today() },
          confirm,
          log: log ?? { record: async () => Promise.reject(new Error('Sem sessão.')) },
          conversationId,
          onAction: (entry) => setActions((a) => ({ ...a, [toolCall.toolCallId]: entry })),
          turn,
        },
      );
      if (!gate.isCurrent(myTurn)) return;
      // Chamado depois do retorno do useChat: `chat` já existe.
      void chat.addToolOutput({ tool: toolCall.toolName, toolCallId: toolCall.toolCallId, output } as Parameters<typeof chat.addToolOutput>[0]);
    },
  });

  const undo = useCallback(
    async (entry: AiActionEntry) => {
      if (!log) return { ok: false as const, reason: 'Sem sessão.' };
      const r = await log.undo(entry.id, kit);
      if (r.ok) setActions((a) => Object.fromEntries(Object.entries(a).map(([k, v]) => [k, v.id === entry.id ? { ...v, undone_at: new Date().toISOString() } : v])));
      return r;
    },
    [log, kit],
  );

  const newConversation = useCallback(() => {
    gate.invalidate();
    pending?.answer(false);
    void chat.stop();
    setActions({});
    turn.reset();
    setConversationId(newId());
  }, [gate, pending, chat, turn]);

  const stop = useCallback(() => {
    gate.invalidate();
    pending?.answer(false);
    void chat.stop();
  }, [gate, pending, chat]);

  const send = useCallback(
    (text: string) => {
      turn.reset();
      return chat.sendMessage({ text });
    },
    [chat, turn],
  );

  return {
    messages: chat.messages,
    status: chat.status,
    error: agentErrorText(chat.error),
    send,
    stop,
    /** A resposta chegou ao limite de ferramentas seguidas: o laço parou e a tela avisa. */
    limitReached: chat.status === 'ready' && toolCallsExceeded(chat.messages),
    clearError: chat.clearError,
    unmask: aliases.unmask,
    pending,
    actions,
    undo,
    newConversation,
  };
}
