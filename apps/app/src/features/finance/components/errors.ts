// Motivo curto para o aviso de erro (sem dados pessoais nem mensagens técnicas): o que deu errado e onde olhar.
// Vai depois de "Não foi possível …:", por isso começa em minúscula e termina em ponto.
import { isRepositoryError } from '@glife/domain/core';

import { userReason } from '@/shared/lib/errorText';

const sentence = (s: string) => {
  const t = s.trim();
  return t.charAt(0).toLocaleLowerCase('pt-BR') + t.slice(1) + (/[.!?]$/.test(t) ? '' : '.');
};

export function failureReason(e: unknown, validation = 'confira os dados preenchidos.'): string {
  if (isRepositoryError(e, 'validation')) return validation;
  if (isRepositoryError(e, 'not_found')) return 'o registro não existe mais neste aparelho.';
  const reason = userReason(e);
  if (reason) return sentence(reason);
  if (isRepositoryError(e, 'conflict')) return 'o item mudou enquanto isso. Confira e tente de novo.';
  if (isRepositoryError(e)) return 'o banco do aparelho recusou a gravação. Tente de novo.';
  return 'algo deu errado neste aparelho. Tente de novo.';
}
