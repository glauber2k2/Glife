// Texto digitado → consultas seguras. Nada do que o usuário digita vira operador do FTS5 nem SQL.
import {
  DEFAULT_GROUP_LIMITS,
  SEARCH_GROUPS,
  type SearchAction,
  type SearchGroup,
  type SearchHit,
  type SearchSection,
} from './model.ts';

const MAX_TERMS = 8;
const HAS_WORD = /[\p{L}\p{N}]/u;

/** "  Café   ÇÃO " → "cafe cao": sem acentos, minúsculas, espaços simples. */
export function normalizeText(s: string): string {
  return s
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

const terms = (input: string) => input.split(/\s+/).filter((t) => HAS_WORD.test(t)).slice(0, MAX_TERMS);

/**
 * "café com" → `"café"* AND "com"*`. Cada palavra é uma frase entre aspas com prefixo, então
 * aspas, `-`, `OR`, `*` e parênteses digitados são texto. Sem palavra útil → null (não consultar).
 */
export function toFtsQuery(input: string): string | null {
  const list = terms(input);
  if (list.length === 0) return null;
  return list.map((t) => `"${t.replace(/"/g, '""')}"*`).join(' AND ');
}

/** Toda palavra digitada precisa ser início de alguma palavra do rótulo ou das palavras-chave. */
export function matchActions(actions: SearchAction[], input: string): SearchHit[] {
  const query = input.trim();
  const wanted = normalizeText(query).split(' ').filter(Boolean);
  return actions
    .filter((a) => {
      if (wanted.length === 0 || a.anyQuery) return true;
      const words = normalizeText([a.label(''), ...a.keywords].join(' ')).split(' ');
      return wanted.every((w) => words.some((word) => word.startsWith(w)));
    })
    .map((a) => ({ group: 'actions', id: a.id, title: a.label(query), href: a.href(query) }));
}

/** Agrupa na ordem de SEARCH_GROUPS, sem repetir item e com limite por grupo. */
export function mergeResults(
  hits: SearchHit[],
  limits: Partial<Record<SearchGroup, number>> = {},
): SearchSection[] {
  return SEARCH_GROUPS.flatMap((group) => {
    const seen = new Set<string>();
    const max = limits[group] ?? DEFAULT_GROUP_LIMITS[group];
    const list = hits.filter((h) => h.group === group && !seen.has(h.id) && !!seen.add(h.id)).slice(0, max);
    return list.length ? [{ group, hits: list }] : [];
  });
}
