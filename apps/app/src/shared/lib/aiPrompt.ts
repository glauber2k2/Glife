// Canal de pedidos para a Glife IA. Quem pede (botão central, detalhe do ativo…) não conhece a feature da IA:
// deixa o pedido aqui e a conversa, montada na raiz, pega e envia. O texto nunca vai pela URL.

/** Texto extraído de um arquivo anexado (o arquivo em si não sai do aparelho). */
export interface PromptAttachment {
  name: string;
  text: string;
  /** o texto foi cortado no limite */
  truncated?: boolean;
}

export interface AiPrompt {
  text: string;
  attachments?: readonly PromptAttachment[];
}

export interface PromptBus {
  ask(prompt: AiPrompt): void;
  /** Pega o pedido pendente (uma vez só). */
  take(): AiPrompt | null;
  subscribe(listener: () => void): () => void;
}

export function createPromptBus(): PromptBus {
  let pending: AiPrompt | null = null;
  const listeners = new Set<() => void>();
  return {
    ask(prompt) {
      if (!prompt.text.trim() && !prompt.attachments?.length) return;
      pending = prompt;
      for (const l of listeners) l();
    },
    take() {
      const p = pending;
      pending = null;
      return p;
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}

/** O canal do app. */
export const aiPrompts = createPromptBus();
