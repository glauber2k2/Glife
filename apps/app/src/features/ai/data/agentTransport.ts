// Transporte da conversa com a Edge Function `ai-agent`. Antes de sair do aparelho, o texto do usuário tem
// telefone, e-mail, link e número longo trocados por marcadores ([tel1]…) e ids crus removidos; vai junto a data
// local de hoje. Sem sessão, nada é enviado. O token é o da sessão (aal2), lido a cada pedido.
import type { AliasBook } from '@glife/domain/ai';
import type { IsoDate } from '@glife/domain/time';
import { DefaultChatTransport, type UIMessage } from 'ai';

const UUID = /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi;

export interface AgentTransportOptions {
  url: string;
  apikey: string;
  getToken: () => Promise<string | null>;
  aliases: AliasBook;
  today: () => IsoDate;
  fetch?: typeof fetch;
}

/** Só as partes de texto do usuário: as de ferramenta já saem mascaradas pelos kits. */
function maskMessages(messages: UIMessage[], aliases: AliasBook): UIMessage[] {
  return messages.map((m) =>
    m.role !== 'user'
      ? m
      : { ...m, parts: m.parts.map((p) => (p.type === 'text' ? { ...p, text: aliases.mask(p.text).replace(UUID, '[id]') } : p)) },
  );
}

export function createAgentTransport(opts: AgentTransportOptions) {
  return new DefaultChatTransport<UIMessage>({
    api: opts.url,
    fetch: opts.fetch,
    prepareSendMessagesRequest: async ({ messages }) => {
      const token = await opts.getToken();
      if (!token) throw new Error('Entre de novo: a sessão terminou.');
      return {
        headers: { Authorization: `Bearer ${token}`, apikey: opts.apikey },
        body: { messages: maskMessages(messages, opts.aliases), today: opts.today() },
      };
    },
  });
}
