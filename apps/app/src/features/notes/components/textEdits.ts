// Edições de texto do editor (barra de formatação e [[ ]]), puras e testáveis.

export interface Selection {
  start: number;
  end: number;
}

export interface Edit {
  text: string;
  selection: Selection;
}

export function insertAt(text: string, sel: Selection, insert: string): Edit {
  const next = text.slice(0, sel.start) + insert + text.slice(sel.end);
  const cursor = sel.start + insert.length;
  return { text: next, selection: { start: cursor, end: cursor } };
}

/** **negrito** em volta da seleção; se ela já estiver entre **, tira. */
export function toggleBold(text: string, sel: Selection): Edit {
  const { start, end } = sel;
  if (text.slice(start - 2, start) === '**' && text.slice(end, end + 2) === '**') {
    return {
      text: text.slice(0, start - 2) + text.slice(start, end) + text.slice(end + 2),
      selection: { start: start - 2, end: end - 2 },
    };
  }
  return {
    text: `${text.slice(0, start)}**${text.slice(start, end)}**${text.slice(end)}`,
    selection: { start: start + 2, end: end + 2 },
  };
}

/** Marca (ou desmarca) o começo de cada linha tocada pela seleção com "- " ou "> ". */
export function prefixLines(text: string, sel: Selection, prefix: string): Edit {
  const lineStart = text.lastIndexOf('\n', sel.start - 1) + 1;
  const nextBreak = text.indexOf('\n', sel.end);
  const lineEnd = nextBreak === -1 ? text.length : nextBreak;
  const lines = text.slice(lineStart, lineEnd).split('\n');
  const remove = lines.every((l) => l.startsWith(prefix));
  const changed = lines.map((l) => (remove ? l.slice(prefix.length) : prefix + l));
  const delta = (remove ? -1 : 1) * prefix.length;
  return {
    text: text.slice(0, lineStart) + changed.join('\n') + text.slice(lineEnd),
    selection: {
      start: Math.max(lineStart, sel.start + delta),
      end: sel.end + delta * lines.length,
    },
  };
}

/** `[[` aberto antes do cursor (na mesma linha, sem `]]`): início e o que já foi digitado. */
export function wikilinkQuery(text: string, cursor: number): { start: number; query: string } | null {
  const before = text.slice(0, cursor);
  const open = before.lastIndexOf('[[');
  if (open === -1) return null;
  const query = before.slice(open + 2);
  if (/[\n\]]/.test(query)) return null;
  return { start: open, query };
}

/** Troca `[[consulta` por `[[Título]]` e põe o cursor depois do vínculo. */
export function applyWikilink(text: string, start: number, cursor: number, title: string): Edit {
  const after = text.slice(cursor).startsWith(']]') ? text.slice(cursor + 2) : text.slice(cursor);
  const link = `[[${title}]]`;
  const end = start + link.length;
  return { text: text.slice(0, start) + link + after, selection: { start: end, end } };
}
