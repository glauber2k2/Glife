// Notas vinculadas a um item (lembrete, gasto, refeição…): links manuais `about` do item para a nota. A tela guarda a
// lista de notas escolhidas; ao salvar, isto diz o que gravar e o que apagar.
import type { DesiredLink, LinkRow } from './sync.ts';

export const NOTE_LINK_RELATION = 'about' as const;

/** É um vínculo de nota feito à mão (os do markdown e da IA não entram nesta lista). */
export const isManualNoteLink = (l: Pick<LinkRow, 'target_type' | 'relation' | 'origin' | 'deleted_at'>) =>
  l.deleted_at === null && l.target_type === 'note' && l.relation === NOTE_LINK_RELATION && l.origin === 'manual';

/** Notas vinculadas hoje, na ordem em que foram ligadas e sem repetir. */
export function linkedNoteIds(links: readonly LinkRow[]): string[] {
  return [...new Set(links.filter(isManualNoteLink).map((l) => l.target_ref.toLowerCase()))];
}

export interface NoteLinkChange {
  add: DesiredLink[];
  /** ids das linhas de link a excluir */
  remove: string[];
}

/** O que muda para os vínculos de nota do item ficarem exatamente `wanted`. */
export function noteLinkChange(existing: readonly LinkRow[], wanted: readonly string[]): NoteLinkChange {
  const want = new Set(wanted.map((id) => id.toLowerCase()));
  const manual = existing.filter(isManualNoteLink);
  const have = new Set(manual.map((l) => l.target_ref.toLowerCase()));
  return {
    add: [...want].filter((id) => !have.has(id)).map((id) => ({ target_type: 'note', target_ref: id, relation: NOTE_LINK_RELATION })),
    remove: manual.filter((l) => !want.has(l.target_ref.toLowerCase())).map((l) => l.id),
  };
}
