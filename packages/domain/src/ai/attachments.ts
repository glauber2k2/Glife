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
