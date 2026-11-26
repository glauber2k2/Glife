// Mensagem curta para o usuário a partir de um erro: o motivo escrito para ele (`UserFacingError`) ou o motivo da
// regra do domain (ex.: "O fim é antes do início"), senão um texto pelo código. Nunca expõe detalhes técnicos nem dados.
import { isRepositoryError } from '@glife/domain/core';

/**
 * Erro cuja mensagem foi escrita para o usuário (curta, em pt-BR, sem dados pessoais) e pode aparecer no aviso.
 * Qualquer outro `Error` (SQLite, JS) é técnico e vira um texto genérico.
 */
export class UserFacingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'UserFacingError';
  }
}

const BY_CODE: Record<string, string> = {
  validation: 'Confira os campos.',
  not_found: 'Não encontrado: talvez tenha sido excluído.',
  conflict: 'Não deu: o item mudou enquanto isso. Confira e tente de novo.',
  unavailable: 'Não deu para gravar no aparelho. Tente de novo.',
};

/** Motivo escrito para o usuário, se houver: o do `UserFacingError` ou o da regra recusada pelo domain. */
export function userReason(e: unknown): string | null {
  if (e instanceof UserFacingError) return e.message;
  if (!isRepositoryError(e) || (e.code !== 'validation' && e.code !== 'conflict')) return null;
  const cause = e.cause as { issues?: { message?: string }[]; message?: string } | undefined;
  // Zod (validation) traz `issues`; regra do domain vem como RangeError. Outras causas são técnicas.
  if (e.code === 'validation' && cause?.issues?.[0]?.message) return cause.issues[0].message;
  return cause instanceof RangeError ? cause.message : null;
}

export function errorText(e: unknown): string {
  const reason = userReason(e);
  if (reason) return reason;
  return isRepositoryError(e) ? (BY_CODE[e.code] ?? BY_CODE.unavailable!) : BY_CODE.unavailable!;
}
