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

/**
 * Próximo estado de um chip de tag na folha de tags em lote. Tag que só algumas notas têm passa por
 * algumas → todas → nenhuma → algumas (voltar ao "algumas" não mexe em nada); as outras alternam todas ↔ nenhuma.
 */
export function nextTagState(initial: TagState, current: TagState): TagState {
  if (current === 'all') return 'none';
  if (current === 'none' && initial === 'some') return 'some';
  return 'all';
}

/** O que gravar: aplicar as que terminam em "todas" (e não eram) e as novas; tirar as que terminam em "nenhuma" (e não eram). */
export function tagChange(
  all: readonly { id: string; name: string }[],
  initial: ReadonlyMap<string, TagState>,
  wanted: ReadonlyMap<string, TagState>,
  fresh: readonly string[],
): { add: string[]; remove: string[] } {
  const add = [...fresh];
  const remove: string[] = [];
  for (const tag of all) {
    const before = initial.get(tag.id) ?? 'none';
    const after = wanted.get(tag.id) ?? before;
    if (after === before) continue;
    if (after === 'all') add.push(tag.name);
    if (after === 'none') remove.push(tag.id);
  }
  return { add, remove };
}

/** Chave estável do conjunto selecionado (para não recarregar a folha a cada renderização). */
export const selectionKey = (ids: ReadonlySet<string>) => [...ids].sort().join(',');
