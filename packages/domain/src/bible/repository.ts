// Repositório das marcações sobre um RowStore. Sem `unique` no banco (dois aparelhos offline podem criar a mesma):
// a leitura escolhe a mais recente e cada gravação apaga as cópias do versículo.
import { guardRules, parseOrThrow, repositoryErrorOf, softDelete, stampUpdate, type ErrorListener, type Listener, type RowStore, type RowStoreTx, type Unsubscribe } from '../core/index.ts';
import { latestPerVerse, newHighlight, verseRefSchema, type BibleHighlight, type HighlightMark } from './highlights.ts';

export type BibleRows = { bible_highlights: BibleHighlight };
export const BIBLE_TABLES = ['bible_highlights'] as const;

export interface BibleHighlightsRepository {
  /** Uma marcação por versículo (a de `updated_at` mais recente). */
  list(): Promise<BibleHighlight[]>;
  watch(listener: Listener<BibleHighlight[]>, onError?: ErrorListener): Unsubscribe;
  /** Marca todos os versículos (tudo ou nada): atualiza a existente e apaga as cópias. */
  set(refs: readonly string[], mark: HighlightMark): Promise<void>;
  /** Tira a marcação desses versículos (todas as linhas vivas de cada um). */
  clear(refs: readonly string[]): Promise<void>;
}

export function createBibleHighlightsRepository(store: RowStore<BibleRows>, userId: string, clock?: () => Date): BibleHighlightsRepository {
  const list = async () => latestPerVerse(await store.listAlive('bible_highlights'));
  const checkRefs = (refs: readonly string[]) => refs.forEach((r) => parseOrThrow(verseRefSchema, r));

  const byRef = async (tx: RowStoreTx<BibleRows>, refs: readonly string[]) => {
    const wanted = new Set(refs);
    const rows = (await tx.listAlive('bible_highlights')).filter((h) => wanted.has(h.ref));
    const keep = new Map(latestPerVerse(rows).map((h) => [h.ref, h]));
    return { keep, copies: rows.filter((h) => keep.get(h.ref)?.id !== h.id) };
  };

  return {
    list,
    watch: (listener, onError) =>
      store.watch(
        () => void list().then(listener, (e) => onError?.(repositoryErrorOf(e))),
        (e) => onError?.(repositoryErrorOf(e)),
      ),
    set: (refs, mark) =>
      guardRules(async () => {
        checkRefs(refs);
        await store.transaction(async (tx) => {
          const { keep, copies } = await byRef(tx, refs);
          for (const c of copies) await tx.put('bible_highlights', softDelete(c, clock));
          for (const ref of new Set(refs)) {
            const cur = keep.get(ref);
            const next = cur ? stampUpdate(cur, { color: mark.color, style: mark.style }, clock) : newHighlight({ ref, ...mark }, userId, clock);
            await tx.put('bible_highlights', next);
          }
        });
      }),
    clear: (refs) =>
      guardRules(async () => {
        checkRefs(refs);
        await store.transaction(async (tx) => {
          const wanted = new Set(refs);
          for (const h of await tx.listAlive('bible_highlights')) if (wanted.has(h.ref)) await tx.put('bible_highlights', softDelete(h, clock));
        });
      }),
  };
}
