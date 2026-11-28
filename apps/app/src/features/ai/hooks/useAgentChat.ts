// Conversa com o Glife IA: useChat (AI SDK) com o transporte seguro; as ferramentas que o modelo pede são
// executadas aqui no aparelho (executor + política), e o resultado volta ao modelo automaticamente. Cada conversa
// tem seu livro de apelidos (ids e dados pessoais nunca saem do aparelho).
import { useChat } from '@ai-sdk/react';
import { attachmentPart, createAliasBook } from '@glife/domain/ai';
import { newId } from '@glife/domain/core';
import { localNow } from '@glife/domain/time';
import { useCallback, useMemo, useState } from 'react';

import type { PromptAttachment } from '@/shared/lib/aiPrompt';

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

/** `sessionKey` = usuário da sessão: ao trocar de conta (ou sair), a conversa e os apelidos recomeçam do zero. */
export function useAgentChat(sessionKey: string | null = null) {
  const { kit, log } = useAiTools();
  const [conversationId, setConversationId] = useState(newId);
  const aliases = useMemo(() => createAliasBook(), [conversationId]); // eslint-disable-line react-hooks/exhaustive-deps
  const [pending, setPending] = useState<PendingConfirm | null>(null);
  const [actions, setActions] = useState<Record<string, AiActionEntry>>({});
  // troca de conta: estado derivado (ajustado no render, sem efeito), como manda o React
  const [seenSession, setSeenSession] = useState(sessionKey);
  if (seenSession !== sessionKey) {
    setSeenSession(sessionKey);
    setActions({});
    setPending(null);
    setConversationId(newId());
  }
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

  // Anexos vão como partes de texto marcadas "[Anexo: nome]" (passam pela mesma máscara do texto do usuário).
  const send = useCallback(
    (text: string, attachments: readonly PromptAttachment[] = []) => {
      turn.reset();
      if (!attachments.length) return chat.sendMessage({ text });
      const ask = text.trim() || (attachments.length === 1 ? 'Leia o anexo.' : 'Leia os anexos.');
      return chat.sendMessage({
        role: 'user',
        parts: [{ type: 'text', text: ask }, ...attachments.map((a) => ({ type: 'text' as const, text: attachmentPart(a.name, a.text) }))],
      });
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
