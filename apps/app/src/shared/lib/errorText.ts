// Mensagem curta para o usuário a partir de um erro de repositório: o motivo da regra quando houver (ex.: "O fim é
// antes do início"), senão um texto pelo código. Nunca expõe detalhes técnicos nem dados.
import { isRepositoryError } from '@glife/domain/core';

const BY_CODE: Record<string, string> = {
  validation: 'Confira os campos.',
  not_found: 'Não encontrado: talvez tenha sido excluído.',
  unavailable: 'Não deu para gravar no aparelho. Tente de novo.',
};

export function errorText(e: unknown): string {
  if (!isRepositoryError(e)) return BY_CODE.unavailable!;
  const cause = e.cause as { issues?: { message?: string }[]; message?: string } | undefined;
  const reason = cause?.issues?.[0]?.message ?? (cause instanceof RangeError ? cause.message : undefined);
  return reason && e.code === 'validation' ? reason : (BY_CODE[e.code] ?? BY_CODE.unavailable!);
}
