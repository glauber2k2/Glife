// Motivo curto para o aviso de erro (sem dados pessoais): o que deu errado e onde olhar.
import { isRepositoryError } from '@glife/domain/core';

export function failureReason(e: unknown, validation = 'confira os dados preenchidos.'): string {
  if (isRepositoryError(e, 'validation')) return validation;
  if (isRepositoryError(e, 'not_found')) return 'o registro não existe mais neste aparelho.';
  if (isRepositoryError(e, 'unavailable')) {
    const cause = (e as { cause?: unknown }).cause;
    return `o banco do aparelho recusou (${cause instanceof Error ? cause.message.slice(0, 80) : 'sem detalhe'}).`;
  }
  return e instanceof Error ? `${e.message.slice(0, 80)}.` : 'erro desconhecido.';
}
