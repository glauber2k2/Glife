// Exportar notas em markdown: um arquivo .md (uma nota, ou várias separadas por linha horizontal).
import type { Note } from '@glife/domain/notes';

const UNTITLED = 'Sem título';

export function notesToMarkdown(notes: readonly Note[]): string {
  return notes.map((n) => `# ${n.title.trim() || UNTITLED}\n\n${n.body_md.trim()}\n`).join('\n---\n\n');
}

/** Nome do arquivo: o título da nota (sem caracteres que os sistemas recusam) ou `notas-AAAA-MM-DD.md`. */
export function exportFileName(notes: readonly Note[], today: string): string {
  if (notes.length > 1) return `notas-${today}.md`;
  const title = (notes[0]?.title ?? '')
    .replace(/[\/:*?"<>|#\r\n]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 80);
  return title ? `${title}.md` : `nota-${today}.md`;
}
