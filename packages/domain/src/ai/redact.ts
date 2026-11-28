// Dados pessoais que nunca devem sair para o provedor de IA (LGPD art. 6º, III — necessidade). Mesmos padrões do
// GUF AI. O app troca esses valores por marcadores locais antes de enviar (aliases.ts); o servidor ainda passa
// tudo por `redactPersonalData` como segunda rede. A ordem importa: link e número longo antes do telefone, para o
// telefone não "morder" o meio de um número de cartão.

export type PersonalKind = 'link' | 'email' | 'num' | 'tel';

export const PERSONAL_PATTERNS: readonly { kind: PersonalKind; pattern: RegExp }[] = [
  { kind: 'link', pattern: /\bhttps?:\/\/\S+/g },
  { kind: 'email', pattern: /[\w.+-]+@[\w-]+\.[\w.-]+/g },
  { kind: 'num', pattern: /\b\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}\b/g }, // CNPJ
  { kind: 'num', pattern: /\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b/g }, // CPF
  { kind: 'num', pattern: /\b\d{9,}\b/g }, // cartão, conta, documentos
  { kind: 'tel', pattern: /(?:\+?55\s?)?(?:\(?\d{2}\)?\s?)?9?\d{4}[-\s]?\d{4}\b/g },
];

export const REDACTED = '[dado removido]';

/** Texto sem e-mail, CPF/CNPJ, telefone, links e números longos. Marcadores como `[tel1]` passam intactos. */
export function redactPersonalData(text: string): string {
  return PERSONAL_PATTERNS.reduce((out, { pattern }) => out.replace(pattern, REDACTED), text);
}
