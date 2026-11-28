// Soma os anexos já escolhidos com os novos e aplica os limites da mensagem inteira (não só da última escolha).
import { fitAttachments } from '@glife/domain/ai';

import type { PromptAttachment } from '@/shared/lib/aiPrompt';

export function mergeAttachments(current: readonly PromptAttachment[], incoming: readonly PromptAttachment[]): { items: PromptAttachment[]; notices: string[] } {
  const all = [...current, ...incoming];
  const { kept, notices } = fitAttachments(all);
  const wasCut = new Set(all.filter((x) => x.truncated).map((x) => x.name));
  return { items: kept.map((k) => ({ name: k.name, text: k.text, truncated: k.truncated || wasCut.has(k.name) })), notices };
}
