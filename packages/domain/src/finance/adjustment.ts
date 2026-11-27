// Ajuste de saldo: lançamento que leva o saldo da conta no app ao saldo que o banco mostra.
// Entra no saldo, mas fica fora de orçamento, gráficos e totais do mês (ver `budgetMonth` e `chartEntries`).

export const ADJUSTMENT_DESCRIPTION = 'Ajuste de saldo';

export interface BalanceAdjustment {
  type: 'income' | 'expense';
  amount_cents: number;
}

/** Diferença entre o saldo do banco e o do app: receita se o banco tem mais, despesa se tem menos; `null` se iguais. */
export function balanceAdjustment(currentCents: number, bankCents: number): BalanceAdjustment | null {
  if (!Number.isSafeInteger(currentCents) || !Number.isSafeInteger(bankCents)) throw new RangeError('Saldo inválido');
  const diff = bankCents - currentCents;
  if (diff === 0) return null;
  return { type: diff > 0 ? 'income' : 'expense', amount_cents: Math.abs(diff) };
}
