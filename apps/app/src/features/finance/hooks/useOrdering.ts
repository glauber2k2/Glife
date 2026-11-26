// Estado do modo "Ordenar": a ordem muda na hora (as linhas abrem espaço com a mola) e é gravada em fila, sempre
// com a lista completa daquele tipo. Falhou: volta à ordem gravada e avisa.
import { useRef, useState } from 'react';

import { moveWithin, sortByIds } from '../components/ordering';

export function useOrdering(fullIds: readonly string[], persist: (ids: readonly string[]) => Promise<void>, onError: (e: unknown) => void) {
  const [order, setOrder] = useState<string[] | null>(null);
  const queue = useRef<Promise<void>>(Promise.resolve());
  const current = order ?? [...fullIds];

  const sort = <T extends { id: string }>(items: readonly T[]): T[] => (order ? sortByIds(items, order) : [...items]);

  /** `group`: os itens da lista na tela, já na ordem mostrada. */
  const move = (group: readonly { id: string }[], id: string, delta: -1 | 1) => {
    const next = moveWithin(current, group.map((g) => g.id), id, delta);
    if (!next) return;
    setOrder(next);
    queue.current = queue.current
      .then(() => persist(next))
      .catch((e: unknown) => {
        setOrder(null);
        onError(e);
      });
  };

  return { sort, move, reset: () => setOrder(null) };
}
