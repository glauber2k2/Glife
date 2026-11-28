// Contrato entre o executor do agente (feature `ai` no app) e as features que executam ferramentas. Fica no domínio
// para as features implementarem sem importar `features/ai` (features não se conhecem).
import type { IsoDate } from '../time/index.ts';
import type { AliasBook, AliasKind } from './aliases.ts';

export interface AiExecContext {
  aliases: AliasBook;
  today: IsoDate;
}

/** Um item tocado por uma ação, com o estado anterior dos campos mudados (para desfazer). */
export interface AiTouch {
  entity: AliasKind;
  id: string;
  kind: 'create' | 'update' | 'trash';
  before: Record<string, unknown> | null;
}

export interface AiExecResult {
  /** O que volta ao modelo: só apelidos e marcadores, nunca ids reais. */
  output: unknown;
  touches: AiTouch[];
  /** Frase curta em pt-BR para o cartão da ação ("Lembrete criado: Comprar café · 28/11 09:00"). */
  summary: string;
}

export type AiExecutor = (input: unknown, ctx: AiExecContext) => Promise<AiExecResult>;
export type AiUndo = (touch: AiTouch) => Promise<void>;
/** Frase do cartão "Confirmar?" antes de executar (ex.: "Mandar para a lixeira: Compras do mês"). */
export type AiPreview = (input: unknown, ctx: AiExecContext) => Promise<string>;

export interface AiToolKit {
  executors: Record<string, AiExecutor>;
  undo: Partial<Record<AliasKind, AiUndo>>;
  preview?: Record<string, AiPreview>;
}

/** Erro com mensagem segura para devolver ao modelo (sem dados pessoais nem detalhes técnicos). */
export class AiToolError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AiToolError';
  }
}

/** Troca o apelido pelo id real; apelido desconhecido, de outro tipo ou UUID cru é recusado. */
export function resolveAlias(aliases: AliasBook, kind: AliasKind, alias: string): string {
  const hit = aliases.resolve(alias);
  if (!hit || hit.kind !== kind) throw new AiToolError(`Não conheço "${alias.slice(0, 20)}". Busque o item antes de usá-lo.`);
  return hit.id;
}
