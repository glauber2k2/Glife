// Calcula como a tabela `links` deve mudar quando o markdown de uma entidade é salvo.
// Só mexe em links de origem 'markdown'; links manuais e da IA são preservados.
import type { EntityType } from '../core/index.ts';
import type { LinkRelation, Wikilink } from './wikilinks.ts';

export interface LinkRow {
  id: string;
  source_type: EntityType;
  source_id: string;
  target_type: EntityType;
  target_ref: string;
  relation: LinkRelation;
  origin: 'manual' | 'markdown' | 'ai';
  deleted_at: string | null;
}

export interface DesiredLink {
  target_type: EntityType;
  target_ref: string;
  relation: LinkRelation;
}

export interface LinkDiff {
  add: DesiredLink[];
  /** ids das linhas a marcar com deleted_at */
  remove: string[];
  /** títulos de notas que ainda não existem */
  unresolved: string[];
}

export type TitleResolver = (title: string) => string | undefined;

const key = (l: DesiredLink) => `${l.target_type}|${l.target_ref}|${l.relation}`;

export function desiredLinks(
  wikilinks: Wikilink[],
  resolveTitle: TitleResolver,
): { links: DesiredLink[]; unresolved: string[] } {
  const seen = new Map<string, DesiredLink>();
  const unresolved = new Set<string>();
  for (const w of wikilinks) {
    let target_type: EntityType;
    let target_ref: string;
    if (w.target.type === 'note_title') {
      const id = resolveTitle(w.target.title);
      if (!id) {
        unresolved.add(w.target.title);
        continue;
      }
      target_type = 'note';
      target_ref = id;
    } else {
      target_type = w.target.type;
      target_ref = w.target.ref;
    }
    const d: DesiredLink = { target_type, target_ref, relation: w.relation };
    seen.set(key(d), d);
  }
  return { links: [...seen.values()], unresolved: [...unresolved] };
}

export function diffMarkdownLinks(
  existing: LinkRow[],
  wikilinks: Wikilink[],
  resolveTitle: TitleResolver,
): LinkDiff {
  const { links, unresolved } = desiredLinks(wikilinks, resolveTitle);
  const current = existing.filter((l) => l.origin === 'markdown' && l.deleted_at === null);
  const currentKeys = new Set(current.map(key));
  const desiredKeys = new Set(links.map(key));
  return {
    add: links.filter((l) => !currentKeys.has(key(l))),
    remove: current.filter((l) => !desiredKeys.has(key(l))).map((l) => l.id),
    unresolved,
  };
}
