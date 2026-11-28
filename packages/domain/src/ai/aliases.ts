// Livro de apelidos de uma conversa: ids reais (UUID) e dados pessoais digitados pelo usuário nunca saem do
// aparelho. O modelo vê `n1`, `e2`, `[tel1]`; o app troca de volta ao executar. Vive em memória, uma por conversa.
import { PERSONAL_PATTERNS, type PersonalKind } from './redact.ts';

export type AliasKind = 'note' | 'folder' | 'event' | 'reminder';

const PREFIX: Record<AliasKind, string> = { note: 'n', folder: 'p', event: 'e', reminder: 'r' };
const KIND_OF_PREFIX = new Map(Object.entries(PREFIX).map(([kind, p]) => [p, kind as AliasKind]));

export interface AliasBook {
  alias(kind: AliasKind, id: string): string;
  resolve(alias: string): { kind: AliasKind; id: string } | null;
  /** Troca telefone, e-mail, link e número longo por marcadores (`[tel1]`); o mesmo valor ganha o mesmo marcador. */
  mask(text: string): string;
  /** Repõe os valores reais dos marcadores conhecidos; desconhecidos ficam como estão. */
  unmask(text: string): string;
}

export function createAliasBook(): AliasBook {
  const byId = new Map<string, string>();
  const byAlias = new Map<string, { kind: AliasKind; id: string }>();
  const counters = new Map<string, number>();
  const markerOf = new Map<string, string>();
  const valueOf = new Map<string, string>();

  const next = (key: string) => {
    const n = (counters.get(key) ?? 0) + 1;
    counters.set(key, n);
    return n;
  };

  const marker = (kind: PersonalKind, value: string) => {
    const known = markerOf.get(`${kind}:${value}`);
    if (known) return known;
    const m = `[${kind}${next(`m:${kind}`)}]`;
    markerOf.set(`${kind}:${value}`, m);
    valueOf.set(m, value);
    return m;
  };

  return {
    alias(kind, id) {
      const key = `${kind}:${id}`;
      const known = byId.get(key);
      if (known) return known;
      const a = `${PREFIX[kind]}${next(`a:${kind}`)}`;
      byId.set(key, a);
      byAlias.set(a, { kind, id });
      return a;
    },
    resolve(alias) {
      const hit = byAlias.get(alias.trim());
      return hit && KIND_OF_PREFIX.get(alias.trim().charAt(0)) === hit.kind ? hit : null;
    },
    mask(text) {
      return PERSONAL_PATTERNS.reduce((out, { kind, pattern }) => out.replace(pattern, (value) => marker(kind, value)), text);
    },
    unmask(text) {
      return text.replace(/\[(?:tel|email|link|num)\d+\]/g, (m) => valueOf.get(m) ?? m);
    },
  };
}
