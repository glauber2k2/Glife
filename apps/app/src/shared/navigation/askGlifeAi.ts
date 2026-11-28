// Pedir à Glife IA de qualquer tela: deixa o pedido no canal (a conversa, na raiz, envia) e abre /ia.
// O texto não vai pela URL.
import { router } from 'expo-router';

import { aiPrompts, type PromptAttachment } from '@/shared/lib/aiPrompt';

/** Limite do texto digitado numa mensagem (anexos têm limites próprios). */
export const AI_MESSAGE_MAX = 2000;

export function askGlifeAi(text: string, attachments?: readonly PromptAttachment[]) {
  aiPrompts.ask({ text: text.trim().slice(0, AI_MESSAGE_MAX), attachments });
  router.navigate('/ia');
}
