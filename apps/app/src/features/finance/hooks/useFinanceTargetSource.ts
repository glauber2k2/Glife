import { useMemo } from 'react';

import type { TargetSource } from '@/features/links';

import { useFinanceMaybe } from './FinanceData';

/** Lançamentos (abrem o extrato da conta) e ativos como alvo de vínculos e avisos; vazio sem sessão. */
export function useFinanceTargetSources(): TargetSource[] {
  const repos = useFinanceMaybe()?.repos ?? null;
  return useMemo(() => {
    if (!repos) return [];
    const tx: TargetSource = {
      type: 'tx',
      table: 'transactions',
      noun: 'Este lançamento',
      href: async (id) => {
        const tx = await repos.transactions.get(id);
        return tx ? `/financas/conta/${tx.account_id}` : null;
      },
      restore: async (id) => void (await repos.transactions.restore(id)),
      kindLabel: 'Lançamento',
      title: async (id) => {
        const tx = await repos.transactions.get(id);
        return tx && tx.deleted_at === null ? tx.description || 'Lançamento' : null;
      },
    };
    const asset: TargetSource = {
      type: 'asset',
      table: 'investment_assets',
      noun: 'Este ativo',
      routePrefix: '/financas/investimento/',
      href: async (id) => `/financas/investimento/${id}`,
      kindLabel: 'Investimento',
      title: async (id) => (await repos.investments.snapshot()).assets.find((a) => a.id === id)?.name ?? null,
    };
    return [tx, asset];
  }, [repos]);
}
