// Executores das ferramentas de notas do Glife IA (definições em `@glife/domain/notes` → ai-tools). Usam o mesmo
// repositório das telas (mesmas regras). O que volta ao modelo leva só apelidos e texto mascarado (sem ids reais,
// telefones, e-mails ou links); o que vem do modelo para gravar tem os marcadores repostos.
import { AiToolError, assertUnchanged, resolveAlias, type AiExecContext, type AiToolKit } from '@glife/domain/ai';
import { RepositoryError } from '@glife/domain/core';
import type { Note, NoteFoldersRepository, NotePatch, NotesRepository } from '@glife/domain/notes';

const SNIPPET_MAX = 200;
const BODY_MAX = 8000;

const shortDate = (iso: string) => iso.slice(0, 10);

function view(n: Note, ctx: AiExecContext) {
  return {
    note: ctx.aliases.alias('note', n.id),
    title: ctx.aliases.mask(n.title),
    pinned: n.pinned,
    folder: n.folder_id ? ctx.aliases.alias('folder', n.folder_id) : null,
    updated: shortDate(n.updated_at),
  };
}

async function existing(notes: NotesRepository, id: string): Promise<Note> {
  const n = await notes.get(id);
  if (!n) throw new AiToolError('Essa nota não existe mais.');
  return n;
}

const label = (n: Note) => n.title.trim() || 'Sem título';

export function createNotesAiKit(notes: NotesRepository, _folders: NoteFoldersRepository): AiToolKit {
  const folderId = (alias: string | null | undefined, ctx: AiExecContext) =>
    alias === undefined ? undefined : alias === null ? null : resolveAlias(ctx.aliases, 'folder', alias);

  return {
    executors: {
      async notes_search(input, ctx) {
        const { query, pinned, limit } = input as { query?: string; pinned?: boolean; limit: number };
        const page = await notes.list({ search: query ? ctx.aliases.unmask(query) : undefined, pinned }, { limit });
        return {
          output: { notes: page.items.map((n) => ({ ...view(n, ctx), snippet: ctx.aliases.mask(n.body_md.slice(0, SNIPPET_MAX)) })) },
          touches: [],
          summary: '',
        };
      },
      async notes_get(input, ctx) {
        const n = await existing(notes, resolveAlias(ctx.aliases, 'note', (input as { note: string }).note));
        const truncated = n.body_md.length > BODY_MAX;
        return { output: { ...view(n, ctx), body_md: ctx.aliases.mask(n.body_md.slice(0, BODY_MAX)), truncated }, touches: [], summary: '' };
      },
      async notes_create(input, ctx) {
        const i = input as { title: string; body_md?: string; folder?: string; pinned?: boolean };
        const n = await notes.create({
          title: ctx.aliases.unmask(i.title),
          body_md: i.body_md === undefined ? undefined : ctx.aliases.unmask(i.body_md),
          folder_id: folderId(i.folder, ctx) ?? null,
          pinned: i.pinned,
        });
        return { output: { note: ctx.aliases.alias('note', n.id) }, touches: [{ entity: 'note', id: n.id, kind: 'create', before: null }], summary: `Nota criada: ${label(n)}` };
      },
      async notes_update(input, ctx) {
        const i = input as { note: string; title?: string; body_md?: string; folder?: string | null; pinned?: boolean };
        const before = await existing(notes, resolveAlias(ctx.aliases, 'note', i.note));
        const patch: NotePatch = {};
        if (i.title !== undefined) patch.title = ctx.aliases.unmask(i.title);
        if (i.body_md !== undefined) patch.body_md = ctx.aliases.unmask(i.body_md);
        if (i.folder !== undefined) patch.folder_id = folderId(i.folder, ctx);
        if (i.pinned !== undefined) patch.pinned = i.pinned;
        const after = await notes.update(before.id, patch);
        const old = Object.fromEntries(Object.keys(patch).map((k) => [k, before[k as keyof Note]]));
        return { output: { note: i.note, ok: true }, touches: [{ entity: 'note', id: after.id, kind: 'update', before: old, version: after.updated_at }], summary: `Nota alterada: ${label(after)}` };
      },
      async notes_trash(input, ctx) {
        const ids = [...new Set((input as { notes: string[] }).notes.map((a) => resolveAlias(ctx.aliases, 'note', a)))];
        const found = await Promise.all(ids.map((id) => existing(notes, id)));
        await notes.removeMany(ids);
        // Uma ação só: desfazer tira todas da lixeira juntas (restoreMany é tudo ou nada).
        const touches = [{ entity: 'note' as const, id: ids[0]!, ids, kind: 'trash' as const, before: null }];
        const summary = found.length === 1 ? `Nota na lixeira: ${label(found[0]!)}` : `${found.length} notas na lixeira`;
        return { output: { ok: true, trashed: ids.length }, touches, summary };
      },
    },
    preview: {
      async notes_trash(input, ctx) {
        const ids = (input as { notes: string[] }).notes.map((a) => resolveAlias(ctx.aliases, 'note', a));
        const found = await Promise.all(ids.map((id) => existing(notes, id)));
        return `Mandar para a lixeira: ${found.map(label).join(', ')}`;
      },
    },
    undo: {
      async note(t) {
        if (t.kind === 'create') await notes.remove(t.id);
        else if (t.kind === 'trash') await notes.restoreMany(t.ids ?? [t.id]);
        else {
          const current = await notes.get(t.id);
          if (!current) throw new RepositoryError('not_found');
          assertUnchanged(t, current);
          await notes.update(t.id, (t.before ?? {}) as NotePatch);
        }
      },
    },
  };
}
