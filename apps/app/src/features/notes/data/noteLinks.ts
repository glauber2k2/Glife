// Mantém a tabela `links` em dia com os [[vínculos]] do markdown da nota.
// Só mexe nos links de origem 'markdown'; os manuais e os da IA ficam como estão.
import { diffMarkdownLinks, parseWikilinks, type LinksRepository } from '@glife/domain/links';
import type { NotesRepository } from '@glife/domain/notes';

export interface NoteLinkRepos {
  notes: Pick<NotesRepository, 'findIdByTitle'>;
  links: Pick<LinksRepository, 'outgoing' | 'applyMarkdownDiff'>;
}

/** Devolve os títulos citados que ainda não existem (para sugerir criar a nota). */
export async function syncNoteLinks(repos: NoteLinkRepos, noteId: string, markdown: string) {
  const source = { type: 'note' as const, id: noteId };
  const wikilinks = parseWikilinks(markdown);

  // O cálculo do diff é síncrono: resolve antes os títulos citados.
  const titles = new Map<string, string | undefined>();
  for (const w of wikilinks) {
    const title = w.target.type === 'note_title' ? w.target.title : w.titleFallback;
    if (title && !titles.has(title)) titles.set(title, (await repos.notes.findIdByTitle(title)) ?? undefined);
  }
  // Uma nota citando a si mesma não vira vínculo.
  const resolve = (title: string) => {
    const id = titles.get(title);
    return id === noteId ? undefined : id;
  };

  const existing = await repos.links.outgoing(source);
  const diff = diffMarkdownLinks(existing, wikilinks, resolve);
  const selfTitles = [...titles].filter(([, id]) => id === noteId).map(([t]) => t);
  const unresolved = diff.unresolved.filter((t) => !selfTitles.includes(t));
  if (diff.add.length || diff.remove.length) {
    await repos.links.applyMarkdownDiff(source, { ...diff, unresolved });
  }
  return { unresolved };
}
