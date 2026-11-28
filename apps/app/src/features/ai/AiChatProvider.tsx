// A conversa da Glife IA vive na raiz: sair da tela /ia não perde a conversa, e os pedidos deixados no canal
// (botão central, detalhe do ativo…) são enviados aqui assim que a IA está livre.
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

import { aiPrompts } from '@/shared/lib/aiPrompt';

import { useAgentChat } from './hooks/useAgentChat';

export type AiChat = ReturnType<typeof useAgentChat>;

const Ctx = createContext<AiChat | null>(null);

export function AiChatProvider({ children }: { children: ReactNode }) {
  const chat = useAgentChat();
  const [asked, setAsked] = useState(0);
  useEffect(() => aiPrompts.subscribe(() => setAsked((n) => n + 1)), []);

  const busy = chat.status === 'submitted' || chat.status === 'streaming' || chat.pending !== null;
  const { send, clearError } = chat;
  useEffect(() => {
    if (busy) return;
    const prompt = aiPrompts.take();
    if (!prompt) return;
    clearError();
    void send(prompt.text);
  }, [asked, busy, send, clearError]);

  return <Ctx.Provider value={chat}>{children}</Ctx.Provider>;
}

export function useAiChat(): AiChat {
  const v = useContext(Ctx);
  if (!v) throw new Error('useAiChat fora do AiChatProvider');
  return v;
}
