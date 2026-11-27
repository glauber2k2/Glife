import { useMemo } from 'react';

import type { TargetSource } from '@/features/links';

import { useFinanceMaybe } from './FinanceData';

/** Lançamentos como alvo de vínculos e avisos (abrem o extrato da conta); null sem sessão. */
export function useFinanceTargetSource(): TargetSource | null {
  const repos = useFinanceMaybe()?.repos ?? null;
  return useMemo(() => {
    if (!repos) return null;
    return {
      type: 'tx',
      table: 'transactions',
      noun: 'Este lançamento',
      href: async (id) => {
        const tx = await repos.transactions.get(id);
        return tx ? `/financas/conta/${tx.account_id}` : null;
      },
      restore: async (id) => void (await repos.transactions.restore(id)),
    };
  }, [repos]);
}
