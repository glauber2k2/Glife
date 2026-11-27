// Marcações da Bíblia (camada do usuário sobre o texto, que é só leitura): marca-texto numa cor ou sublinhado,
// presas à referência OSIS de um versículo — valem em qualquer tradução.
import { z } from 'zod';

import { baseEntitySchema, createEntity, type BaseEntity } from '../core/index.ts';
import { parseOsis } from './refs.ts';

export const HIGHLIGHT_COLORS = ['yellow', 'green', 'blue', 'pink'] as const;
export const HIGHLIGHT_STYLES = ['highlight', 'underline'] as const;
export type HighlightColor = (typeof HIGHLIGHT_COLORS)[number];
export type HighlightStyle = (typeof HIGHLIGHT_STYLES)[number];
export interface HighlightMark {
  color: HighlightColor;
  style: HighlightStyle;
}

/** OSIS de um único versículo (`JHN.3.16`): nem capítulo, nem trecho. */
export const verseRefSchema = z.string().refine((s) => {
  const r = parseOsis(s);
  return r !== null && r.verse !== undefined && r.verseEnd === undefined && r.chapterEnd === undefined;
}, 'Referência de um versículo.');

const highlightFields = z.object({
  ref: verseRefSchema,
  color: z.enum(HIGHLIGHT_COLORS),
  style: z.enum(HIGHLIGHT_STYLES),
  // reservados para o grifo de parte do versículo (nulos = versículo inteiro)
  char_start: z.number().int().min(0).nullable(),
  char_end: z.number().int().min(0).nullable(),
});

export const bibleHighlightSchema = baseEntitySchema.extend(highlightFields.shape);
export type BibleHighlight = BaseEntity & z.infer<typeof highlightFields>;

export function newHighlight(input: { ref: string } & HighlightMark, userId: string, clock?: () => Date): BibleHighlight {
  return createEntity(highlightFields, { char_start: null, char_end: null }, input, userId, clock);
}

/** Uma por versículo: se o sync trouxe cópias, vale a editada por último. */
export function latestPerVerse(rows: readonly BibleHighlight[]): BibleHighlight[] {
  const best = new Map<string, BibleHighlight>();
  for (const h of rows) {
    const cur = best.get(h.ref);
    if (!cur || h.updated_at > cur.updated_at || (h.updated_at === cur.updated_at && h.id > cur.id)) best.set(h.ref, h);
  }
  return [...best.values()];
}

export function recentHighlights(rows: readonly BibleHighlight[], limit: number): BibleHighlight[] {
  return [...rows].sort((a, b) => (a.updated_at < b.updated_at ? 1 : a.updated_at > b.updated_at ? -1 : 0)).slice(0, limit);
}
