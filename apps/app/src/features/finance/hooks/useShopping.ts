// Listas e itens de compras, ao vivo (o repositório avisa a cada mudança, inclusive vinda do sync).
import type { ShoppingSnapshot } from '@glife/domain/finance';
import { useEffect, useState } from 'react';

import { useFinance } from './FinanceData';

/** null enquanto a primeira leitura não termina. */
export function useShopping(): ShoppingSnapshot | null {
  const { repos } = useFinance();
  const [snap, setSnap] = useState<{ repos: typeof repos; data: ShoppingSnapshot } | null>(null);
  useEffect(
    () =>
      repos.shopping.watch(
        (data) => setSnap({ repos, data }),
        (e) => console.warn('Falha ao ler as compras', e),
      ),
    [repos],
  );
  return snap && snap.repos === repos ? snap.data : null;
}

const fold = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim()
    .toLowerCase();

/** Categoria sugerida para uma lista nova: a de gasto com o mesmo nome ("Mercado" → Mercado). */
export function suggestCategory<C extends { id: string; name: string; kind: string; archived: boolean }>(name: string, categories: readonly C[]) {
  const key = fold(name);
  return categories.find((c) => c.kind === 'expense' && !c.archived && fold(c.name) === key)?.id ?? null;
}
