// Busca universal: o que cada fonte devolve e como a tela agrupa. Cada feature entrega a sua fonte;
// a tela só conhece estes tipos (a composição fica na raiz do app).

/** Grupos na ordem em que aparecem na tela. Módulos novos acrescentam o seu grupo aqui. */
export const SEARCH_GROUPS = ['actions', 'notes', 'folders', 'tags'] as const;
export type SearchGroup = (typeof SEARCH_GROUPS)[number];

export interface SearchHit {
  group: SearchGroup;
  id: string;
  title: string;
  /** Trecho com o termo marcado entre SNIPPET_MARK_START e SNIPPET_MARK_END. */
  snippet?: string;
  /** Texto curto à direita (pasta, data…). */
  meta?: string;
  /** Rota do app que abre o item (a feature dona conhece as próprias rotas). */
  href: string;
}

export interface SearchSource {
  group: SearchGroup;
  /** `query` é o texto digitado, já aparado e não vazio. */
  search(query: string, limit: number): Promise<SearchHit[]>;
  /** Sugestões com o campo vazio (ex.: notas recentes). */
  recent?(limit: number): Promise<SearchHit[]>;
}

export interface SearchAction {
  id: string;
  /** Rótulo; recebe a consulta aparada ('' com o campo vazio). */
  label: (query: string) => string;
  keywords: string[];
  href: (query: string) => string;
  /** Aparece para qualquer consulta (ex.: "Nova nota: <consulta>"). */
  anyQuery?: boolean;
}

export interface SearchSection {
  group: SearchGroup;
  hits: SearchHit[];
}

export const SNIPPET_MARK_START = '\u0002';
export const SNIPPET_MARK_END = '\u0003';

export const DEFAULT_GROUP_LIMITS: Record<SearchGroup, number> = { actions: 5, notes: 20, folders: 5, tags: 5 };
