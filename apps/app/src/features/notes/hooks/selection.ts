// Regras puras da seleção múltipla da lista de notas (testadas sem React).
import type { Note } from '@glife/domain/notes';

export const selectionLabel = (n: number) => (n === 0 ? 'Nenhuma' : n === 1 ? '1 selecionada' : `${n} selecionadas`);

/** Novo conjunto com o id marcado ou desmarcado (o anterior não muda). */
export function toggleId(set: ReadonlySet<string>, id: string): Set<string> {
  const next = new Set(set);
  if (next.has(id)) next.delete(id);
  else next.add(id);
  return next;
}

/** "Fixar" em lote: se todas já estão fixadas, desafixa; senão fixa todas. */
export const bulkPinTarget = (notes: readonly Note[]) => !notes.every((n) => n.pinned);

export type TagState = 'all' | 'some' | 'none';

/** Quantas das notas selecionadas têm a tag. */
export function commonTagState(ids: readonly string[], tagsOf: ReadonlyMap<string, ReadonlySet<string>>, tagId: string): TagState {
  const n = ids.filter((id) => tagsOf.get(id)?.has(tagId)).length;
  return n === 0 ? 'none' : n === ids.length ? 'all' : 'some';
}
