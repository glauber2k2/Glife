import { RepositoryError } from '@glife/domain/core';
import { describe, expect, it } from 'vitest';

import { failureReason } from '../src/features/finance/components/errors';
import { UserFacingError, errorText } from '../src/shared/lib/errorText';

const sqlite = new Error('SQLITE_CONSTRAINT: NOT NULL constraint failed: transactions.account_id');

describe('errorText: texto do aviso de erro', () => {
  it('motivo escrito para o usuário passa como está', () => {
    expect(errorText(new UserFacingError('Este aviso não está mais pendente.'))).toBe('Este aviso não está mais pendente.');
    expect(errorText(new UserFacingError('Escolha um horário futuro.'))).toBe('Escolha um horário futuro.');
  });

  it('erro técnico comum nunca aparece cru', () => {
    expect(errorText(sqlite)).toBe('Não deu para gravar no aparelho. Tente de novo.');
    expect(errorText(new RepositoryError('unavailable', { cause: sqlite }))).toBe('Não deu para gravar no aparelho. Tente de novo.');
    expect(errorText('x')).toBe('Não deu para gravar no aparelho. Tente de novo.');
  });

  it('regra recusada mostra o motivo do domain (validation e conflict)', () => {
    expect(errorText(new RepositoryError('validation', { cause: new RangeError('O fim é antes do início') }))).toBe('O fim é antes do início');
    expect(errorText(new RepositoryError('conflict', { cause: new RangeError('A conta deste lançamento foi excluída.') }))).toBe(
      'A conta deste lançamento foi excluída.',
    );
    expect(errorText(new RepositoryError('conflict'))).toBe('Não deu: o item mudou enquanto isso. Confira e tente de novo.');
    // Causa técnica num conflict não vaza.
    expect(errorText(new RepositoryError('conflict', { cause: sqlite }))).toBe('Não deu: o item mudou enquanto isso. Confira e tente de novo.');
  });
});

describe('failureReason (finanças): motivo depois de "Não foi possível …:"', () => {
  it('sem mensagens cruas do SQLite ou do JS', () => {
    expect(failureReason(new RepositoryError('unavailable', { cause: sqlite }))).toBe('o banco do aparelho recusou a gravação. Tente de novo.');
    expect(failureReason(sqlite)).toBe('algo deu errado neste aparelho. Tente de novo.');
    expect(failureReason(new TypeError("Cannot read properties of undefined (reading 'id')"))).toBe('algo deu errado neste aparelho. Tente de novo.');
  });

  it('motivo do usuário e regra do domain passam, com inicial minúscula', () => {
    expect(failureReason(new UserFacingError('Conta não encontrada.'))).toBe('conta não encontrada.');
    expect(failureReason(new RepositoryError('conflict', { cause: new RangeError('A conta deste lançamento foi excluída.') }))).toBe(
      'a conta deste lançamento foi excluída.',
    );
    expect(failureReason(new RepositoryError('validation'), 'confira o valor.')).toBe('confira o valor.');
    expect(failureReason(new RepositoryError('not_found'))).toBe('o registro não existe mais neste aparelho.');
  });
});
