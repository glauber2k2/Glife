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

const words = (s: string) => normalizeText(s).split(/[^\p{L}\p{N}]+/u).filter(Boolean);

/** Toda palavra digitada é início de alguma palavra do texto (sem acento nem maiúscula). Vazio casa tudo. */
export function matchesWords(text: string, input: string): boolean {
  const have = words(text);
  return words(input).every((w) => have.some((word) => word.startsWith(w)));
}

/** Casa pelo rótulo e pelas palavras-chave; `anyQuery` aparece sempre. */
export function matchActions(actions: SearchAction[], input: string): SearchHit[] {
  const query = input.trim();
  return actions
    .filter((a) => a.anyQuery || matchesWords([a.label(''), ...a.keywords].join(' '), query))
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
