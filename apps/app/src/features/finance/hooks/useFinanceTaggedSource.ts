import type { TaggedItemSource } from '@glife/domain/tags';
import { useMemo } from 'react';

import { dm, signed } from '../components/format';
import { useFinanceMaybe } from './FinanceData';

/** Como os lançamentos aparecem na tela de uma tag (abrem o extrato da conta); null sem sessão. */
export function useFinanceTaggedSource(): TaggedItemSource | null {
  const repos = useFinanceMaybe()?.repos ?? null;
  return useMemo(() => {
    if (!repos) return null;
    return {
      type: 'tx',
      label: 'Gastos',
      async resolve(ids) {
        const [found, accounts, categories] = await Promise.all([
          Promise.all(ids.map((id) => repos.transactions.get(id))),
          repos.accounts.list({ includeArchived: true }),
          repos.categories.list({ includeArchived: true }),
        ]);
        const accountName = new Map(accounts.map((a) => [a.id, a.name]));
        const categoryName = new Map(categories.map((c) => [c.id, c.name]));
        return found
          .filter((tx) => tx !== null && tx.deleted_at === null)
          .map((tx) => tx!)
          .sort((a, b) => (a.date < b.date ? 1 : -1))
          .map((tx) => {
            const cents = tx.type === 'expense' ? -tx.amount_cents : tx.amount_cents;
            const title = tx.description || (tx.category_id && categoryName.get(tx.category_id)) || 'Lançamento';
            const meta = [dm(tx.date), accountName.get(tx.account_id), tx.type === 'transfer' ? undefined : signed(cents)]
              .filter(Boolean)
              .join(' · ');
            return { id: tx.id, title, meta, href: `/financas/conta/${tx.account_id}` };
          });
      },
    };
  }, [repos]);
}
