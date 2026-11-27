// Registros da Bíblia para o início e a tela Registros: grifos e sublinhados (camada do usuário) e anotações (notas
// comuns ligadas a versículos). Versículos seguidos marcados juntos viram um registro só.
import { HIGHLIGHT_COLORS, type BibleHighlight, type HighlightColor } from './highlights.ts';
import { parseOsis } from './refs.ts';

export type BibleRecord =
  | { kind: 'highlight' | 'underline'; id: string; book: string; chapter: number; verses: number[]; color: HighlightColor; at: string }
  | { kind: 'note'; id: string; ref: string; extra: number; title: string; href: string; at: string };

export interface LinkedNote {
  id: string;
  title: string;
  href: string;
  updatedAt: string;
  /** alvos bíblicos (OSIS) que a nota cita, do mais recente ao mais antigo */
  refs: readonly string[];
}

const minute = (iso: string) => iso.slice(0, 16);

export function buildRecords(highlights: readonly BibleHighlight[], notes: readonly LinkedNote[]): BibleRecord[] {
  const marks = highlights
    .map((h) => ({ h, ref: parseOsis(h.ref) }))
    .filter((x): x is { h: BibleHighlight; ref: NonNullable<ReturnType<typeof parseOsis>> } => x.ref !== null && x.ref.verse !== undefined && HIGHLIGHT_COLORS.includes(x.h.color))
    .sort((a, b) => a.ref.book.localeCompare(b.ref.book) || a.ref.chapter - b.ref.chapter || a.ref.verse! - b.ref.verse!);

  const out: BibleRecord[] = [];
  let open: Extract<BibleRecord, { kind: 'highlight' | 'underline' }> | null = null;
  for (const { h, ref } of marks) {
    const kind = h.style === 'underline' ? 'underline' : 'highlight';
    const joins =
      open &&
      open.kind === kind &&
      open.color === h.color &&
      open.book === ref.book &&
      open.chapter === ref.chapter &&
      open.verses[open.verses.length - 1] === ref.verse! - 1 &&
      minute(open.at) === minute(h.updated_at);
    if (joins && open) {
      open.verses.push(ref.verse!);
      if (h.updated_at > open.at) open.at = h.updated_at;
    } else {
      open = { kind, id: h.id, book: ref.book, chapter: ref.chapter, verses: [ref.verse!], color: h.color, at: h.updated_at };
      out.push(open);
    }
  }
  for (const n of notes) {
    const [first, ...rest] = [...new Set(n.refs)];
    if (first) out.push({ kind: 'note', id: n.id, ref: first, extra: rest.length, title: n.title, href: n.href, at: n.updatedAt });
  }
  return out.sort((a, b) => (a.at < b.at ? 1 : a.at > b.at ? -1 : 0));
}
