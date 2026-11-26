// Modo "Ordenar" de contas e categorias: subir/descer uma linha dentro do grupo que aparece na tela, sem mexer na
// posição de quem fica de fora (arquivadas, outro tipo). O repositório recebe sempre a lista completa daquele tipo.

/**
 * Troca `id` com o vizinho de cima (`delta` −1) ou de baixo (+1) dentro de `group`, devolvendo a ordem completa
 * (`full`). `null` quando não há o que mover (ponta do grupo ou id fora dele).
 */
export function moveWithin(full: readonly string[], group: readonly string[], id: string, delta: -1 | 1): string[] | null {
  const at = group.indexOf(id);
  const neighbor = group[at + delta];
  if (at < 0 || neighbor === undefined) return null;
  const a = full.indexOf(id);
  const b = full.indexOf(neighbor);
  if (a < 0 || b < 0) return null;
  const next = [...full];
  next[a] = neighbor;
  next[b] = id;
  return next;
}

/** Aplica uma ordem de ids a itens (os que não estão na ordem vão para o fim, na ordem original). */
export function sortByIds<T extends { id: string }>(items: readonly T[], order: readonly string[]): T[] {
  const pos = new Map(order.map((id, i) => [id, i]));
  return items
    .map((item, i) => ({ item, key: pos.get(item.id) ?? order.length + i }))
    .sort((x, y) => x.key - y.key)
    .map((x) => x.item);
}

/**
 * Fila de gravação da ordem: uma por vez, na ordem dos toques. Se uma falha, as que já estavam na fila (montadas
 * sobre a ordem que falhou) são descartadas; as pedidas depois disso gravam normalmente.
 */
export function createOrderQueue() {
  let tail: Promise<void> = Promise.resolve();
  let generation = 0;
  return {
    push(task: () => Promise<void>, onError: (e: unknown) => void): Promise<void> {
      const gen = generation;
      tail = tail.then(async () => {
        if (gen !== generation) return;
        try {
          await task();
        } catch (e) {
          generation++;
          onError(e);
        }
      });
      return tail;
    },
  };
}
