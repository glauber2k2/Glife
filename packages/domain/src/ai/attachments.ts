// Anexos na conversa da Glife IA: só o TEXTO de PDF, TXT, MD e CSV vai para o modelo (o arquivo não). O texto
// entra na mensagem como uma parte de texto marcada "[Anexo: nome]" e passa pela mesma máscara de dados pessoais.

export const ATTACH = { perFile: 60_000, perMessage: 120_000, maxFiles: 3, pdfBytes: 10_000_000 } as const;

export type AttachmentKind = 'pdf' | 'text';

const TEXT_EXT = /\.(txt|md|markdown|csv)$/i;
const NAME_MAX = 80;
const PREFIX = /^\[Anexo: ([^\]\n]*)\]\n/;

export function attachmentKind(name: string, mime?: string | null): AttachmentKind | null {
  if (/\.pdf$/i.test(name) || mime === 'application/pdf') return 'pdf';
  if (TEXT_EXT.test(name) || mime === 'text/plain' || mime === 'text/markdown' || mime === 'text/csv') return 'text';
  return null;
}

const cleanName = (name: string) => name.replace(/[\r\n\]]+/g, ' ').trim().slice(0, NAME_MAX) || 'arquivo';

export function attachmentPart(name: string, text: string): string {
  return `[Anexo: ${cleanName(name)}]\n${text}`;
}

export function parseAttachmentPart(part: string): { name: string; text: string } | null {
  const m = PREFIX.exec(part);
  return m ? { name: m[1]!, text: part.slice(m[0].length) } : null;
}

export interface FittedAttachment {
  name: string;
  text: string;
  truncated: boolean;
}

/** Aplica os limites (arquivos, por arquivo, por mensagem) e diz em português o que foi cortado. */
export function fitAttachments(list: readonly { name: string; text: string }[]): { kept: FittedAttachment[]; notices: string[] } {
  const kept: FittedAttachment[] = [];
  const notices: string[] = [];
  let room: number = ATTACH.perMessage;
  for (const item of list) {
    const name = cleanName(item.name);
    if (!item.text.trim()) {
      notices.push(`${name} está vazio.`);
      continue;
    }
    if (kept.length === ATTACH.maxFiles) {
      notices.push(`Só ${ATTACH.maxFiles} anexos por mensagem: ${name} ficou de fora.`);
      continue;
    }
    if (room <= 0) {
      notices.push(`${name} ficou de fora: a mensagem já chegou a 120 mil caracteres.`);
      continue;
    }
    let text = item.text;
    let truncated = false;
    if (text.length > ATTACH.perFile) {
      text = text.slice(0, ATTACH.perFile);
      truncated = true;
      notices.push(`${name} passou de 60 mil caracteres: só o começo vai para a IA.`);
    }
    if (text.length > room) {
      text = text.slice(0, room);
      truncated = true;
      notices.push(`${name} foi cortado para caber no limite de 120 mil caracteres por mensagem.`);
    }
    room -= text.length;
    kept.push({ name, text, truncated });
  }
  return { kept, notices };
}

/** Quanto de um anexo antigo continua indo no histórico (o resto já foi lido na mensagem em que ele entrou). */
export const OLD_ATTACHMENT_KEEP = 2_000;
const OLD_NOTE = '\n[trecho: o anexo inteiro foi lido numa mensagem anterior]';

interface MessageLike {
  role: string;
  parts: readonly { type: string; text?: string }[];
}

/**
 * A conversa inteira é reenviada a cada pedido: só a mensagem do usuário mais recente que tem anexos leva o texto
 * inteiro; anexos de mensagens anteriores viram um trecho curto. Assim a conversa não estoura o limite depressa.
 */
export function compactAttachmentHistory<M extends MessageLike>(messages: readonly M[]): M[] {
  const hasAttachment = (m: M) => m.role === 'user' && m.parts.some((p) => p.type === 'text' && typeof p.text === 'string' && parseAttachmentPart(p.text));
  let latest = -1;
  messages.forEach((m, i) => {
    if (hasAttachment(m)) latest = i;
  });
  return messages.map((m, i) => {
    if (i === latest || !hasAttachment(m)) return m;
    return {
      ...m,
      parts: m.parts.map((p) => {
        const file = p.type === 'text' && typeof p.text === 'string' ? parseAttachmentPart(p.text) : null;
        if (!file || file.text.length <= OLD_ATTACHMENT_KEEP) return p;
        return { ...p, text: attachmentPart(file.name, file.text.slice(0, OLD_ATTACHMENT_KEEP) + OLD_NOTE) };
      }),
    };
  });
}
