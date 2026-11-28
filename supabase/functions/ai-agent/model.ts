// Único ponto que conhece o provedor de IA. Trocar de provedor = trocar este arquivo (e os secrets).
// Secrets: DEEPSEEK_API_KEY (obrigatório) e GLIFE_AI_MODEL (opcional, padrão deepseek-flash).
// @ai-sdk/deepseek 3.0.61: mesmas dependências internas (@ai-sdk/provider 4.0.24, provider-utils 5.0.56) do ai@7.0.131.
import { createDeepSeek } from '@ai-sdk/deepseek';

export const DEFAULT_MODEL = 'deepseek-flash';

/** Sem raciocínio estendido: as respostas são curtas e com ferramentas; pensar deixaria cada passo lento e caro. */
export const MODEL_PROVIDER_OPTIONS = { deepseek: { thinking: { type: 'disabled' as const } } };

export function buildLanguageModel() {
  const deepseek = createDeepSeek({ apiKey: Deno.env.get('DEEPSEEK_API_KEY') });
  return deepseek(Deno.env.get('GLIFE_AI_MODEL')?.trim() || DEFAULT_MODEL);
}
