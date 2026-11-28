// Contrato de uma ferramenta do agente Glife IA. A definição (nome, descrição, entrada Zod e risco) vive no
// domínio da feature; a Edge Function só a repassa ao modelo e o app a executa. Se uma ação pede confirmação é
// decidido aqui, pela definição, e nunca pelo modelo: um texto malicioso numa nota não pula o "Confirmar?".
import type { z } from 'zod';

/** read: só lê · write: grava direto com "Desfazer" · confirm: pede "Confirmar?" antes de gravar. */
export type AiRisk = 'read' | 'write' | 'confirm';

export interface AiToolDefinition<I = unknown> {
  name: string;
  description: string;
  input: z.ZodType<I>;
  risk: AiRisk;
  /** Mexe com dinheiro (lançamentos, contas, investimentos): sempre confirma. */
  money?: boolean;
  /** Mexe em vários itens de uma vez: sempre confirma. */
  bulk?: boolean;
}

const NAME = /^[a-z][a-z0-9_]{2,47}$/;

export function defineAiTool<I>(def: AiToolDefinition<I>): AiToolDefinition<I> {
  if (!NAME.test(def.name)) throw new Error(`Nome de ferramenta inválido: ${def.name}`);
  if (!def.description.trim()) throw new Error(`Ferramenta sem descrição: ${def.name}`);
  return def;
}

export function needsConfirmation(def: Pick<AiToolDefinition, 'risk' | 'money' | 'bulk'>): boolean {
  return def.risk === 'confirm' || !!def.money || !!def.bulk;
}
