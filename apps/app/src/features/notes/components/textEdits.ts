// Edições de texto do editor (barra de formatação e [[ ]]), puras e testáveis.

export interface Selection {
  start: number;
  end: number;
}

export interface Edit {
  text: string;
  selection: Selection;
}

/** Native selection events may still refer to the text before the last edit. */
export function normalizeSelection(text: string, selection: Selection): Selection {
  const index = (value: number) => Number.isFinite(value) ? Math.max(0, Math.min(text.length, Math.trunc(value))) : 0;
  const start = index(selection.start);
  const end = index(selection.end);
  return { start: Math.min(start, end), end: Math.max(start, end) };
}

const editResult = (text: string, selection: Selection): Edit => ({ text, selection: normalizeSelection(text, selection) });
const lineStartAt = (text: string, cursor: number) => cursor === 0 ? 0 : text.lastIndexOf('\n', cursor - 1) + 1;

export function insertAt(text: string, sel: Selection, insert: string): Edit {
  sel = normalizeSelection(text, sel);
  const next = text.slice(0, sel.start) + insert + text.slice(sel.end);
  const cursor = sel.start + insert.length;
  return { text: next, selection: { start: cursor, end: cursor } };
}

/**
 * Envolve a seleção com a marcação (`**`, `*`, `++`, `~~`, `==`); se ela já estiver entre a mesma marcação, tira.
 * Itálico não confunde negrito: o `*` de dentro de `**x**` não conta como itálico.
 */
export function toggleWrap(text: string, sel: Selection, mark: string): Edit {
  sel = normalizeSelection(text, sel);
  const { start, end } = sel;
  const n = mark.length;
  const wrapped = start >= n && text.slice(start - n, start) === mark && text.slice(end, end + n) === mark;
  const insideBold = mark === '*' && text[start - 2] === '*' && text[end + 1] === '*' && text[start - 3] !== '*';
  if (wrapped && !insideBold) {
    return {
      text: text.slice(0, start - n) + text.slice(start, end) + text.slice(end + n),
      selection: { start: start - n, end: end - n },
    };
  }
  return {
    text: `${text.slice(0, start)}${mark}${text.slice(start, end)}${mark}${text.slice(end)}`,
    selection: { start: start + n, end: end + n },
  };
}

/** **negrito** em volta da seleção; se ela já estiver entre **, tira. */
export const toggleBold = (text: string, sel: Selection): Edit => toggleWrap(text, sel, '**');

/**
 * Título (`# `) ou subtítulo (`## `) nas linhas tocadas pela seleção. Linha já nesse nível volta a ser texto
 * comum; em outro nível (ou sem nível), passa para este.
 */
export function toggleHeading(text: string, sel: Selection, level: 1 | 2): Edit {
  sel = normalizeSelection(text, sel);
  const prefix = `${'#'.repeat(level)} `;
  const lineStart = lineStartAt(text, sel.start);
  const nextBreak = text.indexOf('\n', sel.end);
  const lineEnd = nextBreak === -1 ? text.length : nextBreak;
  const lines = text.slice(lineStart, lineEnd).split('\n');
  const levelOf = (l: string) => l.match(/^(#{1,6})\s+/)?.[1]?.length ?? 0;
  const strip = (l: string) => l.replace(/^#{1,6}\s+/, '');
  const remove = lines.every((l) => levelOf(l) === level);
  const changed = lines.map((l) => (remove ? strip(l) : prefix + strip(l)));
  const firstDelta = changed[0]!.length - lines[0]!.length;
  const totalDelta = changed.join('\n').length - lines.join('\n').length;
  return editResult(text.slice(0, lineStart) + changed.join('\n') + text.slice(lineEnd), {
    start: Math.max(lineStart, sel.start + firstDelta),
    end: Math.max(lineStart, sel.end + totalDelta),
  });
}

/** Marca (ou desmarca) o começo de cada linha tocada pela seleção com "- " ou "> ". */
export function prefixLines(text: string, sel: Selection, prefix: string): Edit {
  sel = normalizeSelection(text, sel);
  const lineStart = lineStartAt(text, sel.start);
  const nextBreak = text.indexOf('\n', sel.end);
  const lineEnd = nextBreak === -1 ? text.length : nextBreak;
  const lines = text.slice(lineStart, lineEnd).split('\n');
  const remove = lines.every((l) => l.startsWith(prefix));
  const changed = lines.map((l) => (remove ? l.slice(prefix.length) : prefix + l));
  const delta = (remove ? -1 : 1) * prefix.length;
  return editResult(text.slice(0, lineStart) + changed.join('\n') + text.slice(lineEnd), {
    start: Math.max(lineStart, sel.start + delta),
    end: Math.max(lineStart, sel.end + delta * lines.length),
  });
}

/** `[[` aberto antes do cursor (na mesma linha, sem `]]`): início e o que já foi digitado. */
export function wikilinkQuery(text: string, cursor: number): { start: number; query: string } | null {
  cursor = normalizeSelection(text, { start: cursor, end: cursor }).start;
  const before = text.slice(0, cursor);
  const open = before.lastIndexOf('[[');
  if (open === -1) return null;
  const query = before.slice(open + 2);
  if (/[\n\]]/.test(query)) return null;
  return { start: open, query };
}

/** Troca `[[consulta` por `[[Título]]` e põe o cursor depois do vínculo. */
export function applyWikilink(text: string, start: number, cursor: number, title: string): Edit {
  ({ start, end: cursor } = normalizeSelection(text, { start, end: cursor }));
  const after = text.slice(cursor).startsWith(']]') ? text.slice(cursor + 2) : text.slice(cursor);
  const link = `[[${title}]]`;
  const end = start + link.length;
  return { text: text.slice(0, start) + link + after, selection: { start: end, end } };
}
