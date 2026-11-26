// Implementações em memória dos repositórios: referência executável do contrato e dublês para testes.
// Não persistem nada; não use em produção.
import {
  RepositoryError,
  encodeCursor,
  newId,
  normalizePageRequest,
  nowIso,
  parseOrThrow,
  restore as restoreEntity,
  softDelete,
  type CursorKey,
  type EntityType,
  type Listener,
  type Page,
  type PageRequest,
  type Unsubscribe,
} from '../core/index.ts';
import { validateNewLink, type DesiredLink, type Link, type LinksRepository, type SourceAddress } from '../links/index.ts';
import {
  newTag,
  normalizeTagName,
  tagKey,
  taggedEntitySchema,
  type EntityTag,
  type Tag,
  type TaggedEntity,
  type TagsRepository,
} from '../tags/index.ts';
import {
  applyNotePatch,
  folderNameSchema,
  newNote,
  newNoteFolder,
  FOLDER_CYCLE_MESSAGE,
  wouldCreateFolderCycle,
  type Note,
  type NoteFolder,
  type NoteFoldersRepository,
  type NoteListQuery,
  type NotesRepository,
} from '../notes/index.ts';

// ---------- utilidades ----------

/** Ordena por (sort, id) decrescente e devolve a página depois do cursor. */
function paginate<T extends { id: string }>(
  rows: T[],
  sortOf: (row: T) => string | number,
  req?: PageRequest,
): Page<T> {
  const { limit, cursor } = normalizePageRequest(req);
  const desc = (a: T, b: T) => {
    const sa = sortOf(a);
    const sb = sortOf(b);
    if (sa !== sb) return sa < sb ? 1 : -1;
    return a.id < b.id ? 1 : a.id > b.id ? -1 : 0;
  };
  const after = (row: T, c: CursorKey) => {
    const s = sortOf(row);
    return s < c.sort || (s === c.sort && row.id < c.id);
  };
  const sorted = rows.slice().sort(desc).filter((r) => !cursor || after(r, cursor));
  const items = sorted.slice(0, limit).map((r) => ({ ...r }));
  const last = items.at(-1);
  return { items, nextCursor: sorted.length > limit && last ? encodeCursor({ sort: sortOf(last), id: last.id }) : null };
}

class Subscribers {
  private readonly fns = new Set<() => void>();

  add(fn: () => void): Unsubscribe {
    this.fns.add(fn);
    queueMicrotask(() => this.fns.has(fn) && fn());
    return () => void this.fns.delete(fn);
  }

  notify(): void {
    for (const fn of [...this.fns]) queueMicrotask(() => this.fns.has(fn) && fn());
  }
}

// ---------- notas ----------

export function createInMemoryNotes(userId: string): { notes: NotesRepository; folders: NoteFoldersRepository } {
  const notes = new Map<string, Note>();
  const folders = new Map<string, NoteFolder>();
  const subs = new Subscribers();

  const aliveNote = (id: string) => {
    const n = notes.get(id);
    if (!n || n.deleted_at !== null) throw new RepositoryError('not_found');
    return n;
  };
  const aliveFolder = (id: string) => {
    const f = folders.get(id);
    if (!f || f.deleted_at !== null) throw new RepositoryError('not_found');
    return f;
  };
  const save = <T>(map: Map<string, T>, id: string, row: T): T => {
    map.set(id, row);
    subs.notify();
    return { ...row };
  };

  const matches = (n: Note, q: NoteListQuery) => {
    if (n.deleted_at !== null) return false;
    if (q.folderId !== undefined && n.folder_id !== q.folderId) return false;
    if (q.kind !== undefined && n.kind !== q.kind) return false;
    if (q.pinned !== undefined && n.pinned !== q.pinned) return false;
    if (q.search) {
      const s = q.search.toLowerCase();
      if (!n.title.toLowerCase().includes(s) && !n.body_md.toLowerCase().includes(s)) return false;
    }
    return true;
  };
  const list = (q: NoteListQuery = {}, page?: PageRequest) =>
    paginate([...notes.values()].filter((n) => matches(n, q)), (n) => n.updated_at, page);

  const notesRepo: NotesRepository = {
    async get(id) {
      const n = notes.get(id);
      return n && n.deleted_at === null ? { ...n } : null;
    },
    async list(q, page) {
      return list(q, page);
    },
    watch(q, listener: Listener<Note[]>) {
      return subs.add(() => listener(list(q, { limit: q.limit }).items));
    },
    async findIdByTitle(title) {
      const t = title.trim().toLowerCase();
      for (const n of notes.values()) if (n.deleted_at === null && n.title.toLowerCase() === t) return n.id;
      return null;
    },
    async create(draft) {
      const n = newNote(draft, userId);
      if (n.folder_id) aliveFolder(n.folder_id);
      return save(notes, n.id, n);
    },
    async update(id, patch) {
      const n = applyNotePatch(aliveNote(id), patch);
      if (n.folder_id) aliveFolder(n.folder_id);
      return save(notes, id, n);
    },
    async remove(id) {
      save(notes, id, softDelete(aliveNote(id)));
    },
    async restore(id) {
      const n = notes.get(id);
      if (!n) throw new RepositoryError('not_found');
      return save(notes, id, restoreEntity(n));
    },
    async updateMany(changes) {
      // Calcula tudo numa cópia; só grava se todas passarem (atomicidade).
      const staged = new Map<string, Note>();
      for (const { id, patch } of changes) {
        const base = staged.get(id) ?? aliveNote(id);
        const n = applyNotePatch(base, patch);
        if (n.folder_id) aliveFolder(n.folder_id);
        staged.set(id, n);
      }
      for (const [id, n] of staged) notes.set(id, n);
      subs.notify();
      return changes.map(({ id }) => ({ ...staged.get(id)! }));
    },
    async removeMany(ids) {
      const rows = ids.map((id) => softDelete(aliveNote(id)));
      for (const n of rows) notes.set(n.id, n);
      subs.notify();
    },
    async restoreMany(ids) {
      const rows = ids.map((id) => {
        const n = notes.get(id);
        if (!n) throw new RepositoryError('not_found');
        return restoreEntity(n);
      });
      for (const n of rows) notes.set(n.id, n);
      subs.notify();
    },
    async listTrash(page) {
      return paginate([...notes.values()].filter((n) => n.deleted_at !== null), (n) => n.deleted_at ?? '', page);
    },
    async countTrash() {
      return [...notes.values()].filter((n) => n.deleted_at !== null).length;
    },
    async deleteForever(id) {
      const n = notes.get(id);
      if (!n) throw new RepositoryError('not_found');
      if (n.deleted_at === null) throw new RepositoryError('conflict');
      notes.delete(id);
      subs.notify();
    },
    async emptyTrash() {
      const trashed = [...notes.values()].filter((n) => n.deleted_at !== null);
      for (const n of trashed) notes.delete(n.id);
      if (trashed.length) subs.notify();
      return trashed.length;
    },

    async purgeTrash(deletedBefore) {
      const cutoff = Date.parse(deletedBefore);
      const old = [...notes.values()].filter((n) => n.deleted_at !== null && Date.parse(n.deleted_at) < cutoff);
      for (const n of old) notes.delete(n.id);
      if (old.length) subs.notify();
      return old.length;
    },
  };

  const foldersRepo: NoteFoldersRepository = {
    async listSummaries() {
      const noteCounts = new Map<string, number>();
      const childCounts = new Map<string, number>();
      for (const n of notes.values()) if (n.deleted_at === null && n.folder_id) noteCounts.set(n.folder_id, (noteCounts.get(n.folder_id) ?? 0) + 1);
      for (const f of folders.values()) if (f.deleted_at === null && f.parent_id) childCounts.set(f.parent_id, (childCounts.get(f.parent_id) ?? 0) + 1);
      return (await foldersRepo.list()).map((folder) => ({ folder, notes: noteCounts.get(folder.id) ?? 0, children: childCounts.get(folder.id) ?? 0 }));
    },
    async list() {
      return [...folders.values()]
        .filter((f) => f.deleted_at === null)
        .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR', { sensitivity: 'base' }))
        .map((f) => ({ ...f }));
    },
    async create(draft) {
      const f = newNoteFolder(draft, userId);
      if (f.parent_id) aliveFolder(f.parent_id);
      return save(folders, f.id, f);
    },
    async rename(id, name) {
      const clean = parseOrThrow(folderNameSchema, name);
      const f = aliveFolder(id);
      return save(folders, id, { ...f, name: clean, updated_at: nowIso() });
    },
    async move(id, parentId) {
      const f = aliveFolder(id);
      if (parentId !== null && parentId !== id) aliveFolder(parentId);
      if (wouldCreateFolderCycle(id, parentId, (x) => folders.get(x)?.parent_id ?? null)) {
        throw new RepositoryError('validation', { cause: new RangeError(FOLDER_CYCLE_MESSAGE) });
      }
      return save(folders, id, { ...f, parent_id: parentId, updated_at: nowIso() });
    },
    async remove(id) {
      const f = aliveFolder(id);
      const busy =
        [...notes.values()].some((n) => n.deleted_at === null && n.folder_id === id) ||
        [...folders.values()].some((c) => c.deleted_at === null && c.parent_id === id);
      if (busy) throw new RepositoryError('conflict');
      save(folders, id, softDelete(f));
    },
    async removeWithContents(id, mode) {
      const f = aliveFolder(id);
      for (const c of [...folders.values()]) {
        if (c.deleted_at === null && c.parent_id === id) save(folders, c.id, { ...c, parent_id: f.parent_id, updated_at: nowIso() });
      }
      for (const n of [...notes.values()]) {
        if (n.folder_id !== id) continue;
        const moved = { ...n, folder_id: f.parent_id, updated_at: nowIso() };
        save(notes, n.id, mode === 'trash' && n.deleted_at === null ? softDelete(moved) : moved);
      }
      save(folders, id, softDelete(f));
    },
  };

  return { notes: notesRepo, folders: foldersRepo };
}

// ---------- links ----------

export function createInMemoryLinks(userId: string): LinksRepository {
  const rows = new Map<string, Link>();
  const subs = new Subscribers();
  const alive = () => [...rows.values()].filter((l) => l.deleted_at === null);
  const fromSource = (s: SourceAddress) => (l: Link) => l.source_type === s.type && l.source_id === s.id;
  const backlinks = (type: string, ref: string, page?: PageRequest) =>
    paginate(alive().filter((l) => l.target_type === type && l.target_ref === ref), (l) => l.created_at, page);

  const insert = (source: SourceAddress, link: DesiredLink, origin: Link['origin']): Link => {
    const existing = alive().find(
      (l) =>
        fromSource(source)(l) &&
        l.target_type === link.target_type &&
        l.target_ref === link.target_ref &&
        l.relation === link.relation &&
        l.origin === origin,
    );
    if (existing) return existing;
    const now = nowIso();
    const row: Link = {
      id: newId(),
      user_id: userId,
      source_type: source.type,
      source_id: source.id,
      ...link,
      origin,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    };
    rows.set(row.id, row);
    return row;
  };

  return {
    async outgoing(source) {
      return alive().filter(fromSource(source)).map((l) => ({ ...l }));
    },
    async backlinks(target, page) {
      return backlinks(target.type, target.ref, page);
    },
    watchBacklinks(target, listener) {
      return subs.add(() => listener(backlinks(target.type, target.ref).items));
    },
    async add(source, link) {
      const v = validateNewLink(source, link);
      const row = insert(v.source, v.link, 'manual');
      subs.notify();
      return { ...row };
    },
    async remove(id) {
      const l = rows.get(id);
      if (!l || l.deleted_at !== null) throw new RepositoryError('not_found');
      rows.set(id, softDelete(l));
      subs.notify();
    },
    async applyMarkdownDiff(source, diff) {
      // Valida tudo antes de gravar qualquer coisa (atomicidade).
      const adds = diff.add.map((l) => validateNewLink(source, l));
      for (const id of diff.remove) {
        const l = rows.get(id);
        if (!l || l.deleted_at !== null || l.origin !== 'markdown' || !fromSource(source)(l)) {
          throw new RepositoryError('validation');
        }
      }
      for (const id of diff.remove) rows.set(id, softDelete(rows.get(id)!));
      for (const v of adds) insert(v.source, v.link, 'markdown');
      subs.notify();
    },
  };
}

// ---------- tags ----------

export function createInMemoryTags(userId: string): TagsRepository {
  const tags = new Map<string, Tag>();
  const links = new Map<string, EntityTag>();
  const subs = new Subscribers();
  const byName = (a: Tag, b: Tag) => a.name.localeCompare(b.name, 'pt-BR', { sensitivity: 'base' });
  const aliveTags = () => [...tags.values()].filter((t) => t.deleted_at === null);
  const linksOf = (e: TaggedEntity) =>
    [...links.values()].filter((l) => l.deleted_at === null && l.entity_type === e.type && l.entity_id === e.id);
  const forEntity = (e: TaggedEntity) => {
    const ids = new Set(linksOf(e).map((l) => l.tag_id));
    return aliveTags().filter((t) => ids.has(t.id)).sort(byName).map((t) => ({ ...t }));
  };
  const aliveTag = (id: string) => {
    const tag = tags.get(id);
    if (!tag || tag.deleted_at !== null) throw new RepositoryError('not_found');
    return tag;
  };

  return {
    async list() {
      return aliveTags().sort(byName).map((t) => ({ ...t }));
    },
    async forEntity(entity) {
      return forEntity(parseOrThrow(taggedEntitySchema, entity));
    },
    watchForEntity(entity, listener) {
      return subs.add(() => listener(forEntity(entity)));
    },
    async entitiesWithTag(tagId, type) {
      return [...links.values()]
        .filter((l) => l.deleted_at === null && l.tag_id === tagId && l.entity_type === type)
        .map((l) => l.entity_id);
    },
    async add(entity, name) {
      const e = parseOrThrow(taggedEntitySchema, entity);
      const clean = normalizeTagName(name);
      let tag = aliveTags().find((t) => tagKey(t.name) === tagKey(clean));
      if (!tag) {
        tag = newTag(clean, userId);
        tags.set(tag.id, tag);
      }
      if (!linksOf(e).some((l) => l.tag_id === tag.id)) {
        const now = nowIso();
        const row: EntityTag = {
          id: newId(),
          user_id: userId,
          tag_id: tag.id,
          entity_type: e.type,
          entity_id: e.id,
          created_at: now,
          updated_at: now,
          deleted_at: null,
        };
        links.set(row.id, row);
      }
      subs.notify();
      return { ...tag };
    },
    async remove(entity, tagId) {
      for (const l of linksOf(entity)) if (l.tag_id === tagId) links.set(l.id, softDelete(l));
      subs.notify();
    },
    async listWithCounts() {
      return aliveTags()
        .sort(byName)
        .map((tag) => {
          const counts: Partial<Record<EntityType, number>> = {};
          for (const l of links.values()) {
            if (l.deleted_at === null && l.tag_id === tag.id) counts[l.entity_type] = (counts[l.entity_type] ?? 0) + 1;
          }
          return { tag: { ...tag }, counts };
        });
    },
    async rename(tagId, name) {
      const clean = normalizeTagName(name);
      const tag = aliveTag(tagId);
      if (aliveTags().some((t) => t.id !== tagId && tagKey(t.name) === tagKey(clean))) throw new RepositoryError('conflict');
      const next = { ...tag, name: clean, updated_at: nowIso() };
      tags.set(tagId, next);
      subs.notify();
      return { ...next };
    },
    async merge(fromId, intoId) {
      if (fromId === intoId) throw new RepositoryError('validation');
      const from = aliveTag(fromId);
      const into = aliveTag(intoId);
      const has = new Set(
        [...links.values()].filter((l) => l.deleted_at === null && l.tag_id === intoId).map((l) => `${l.entity_type}:${l.entity_id}`),
      );
      const now = nowIso();
      const movedLinkIds: string[] = [];
      const removedLinkIds: string[] = [];
      for (const l of [...links.values()]) {
        if (l.deleted_at !== null || l.tag_id !== fromId) continue;
        const key = `${l.entity_type}:${l.entity_id}`;
        if (has.has(key)) {
          links.set(l.id, softDelete(l));
          removedLinkIds.push(l.id);
        } else {
          links.set(l.id, { ...l, tag_id: intoId, updated_at: now });
          movedLinkIds.push(l.id);
          has.add(key);
        }
      }
      tags.set(fromId, softDelete(from));
      subs.notify();
      return { into: { ...into }, from: { ...from }, movedLinkIds, removedLinkIds };
    },
    async unmerge(receipt) {
      const from = tags.get(receipt.from.id);
      if (!from) throw new RepositoryError('not_found');
      if (aliveTags().some((t) => t.id !== from.id && tagKey(t.name) === tagKey(from.name))) throw new RepositoryError('conflict');
      const now = nowIso();
      tags.set(from.id, { ...restoreEntity(from), updated_at: now });
      for (const id of receipt.movedLinkIds) {
        const l = links.get(id);
        if (l && l.deleted_at === null && l.tag_id === receipt.into.id) links.set(id, { ...l, tag_id: from.id, updated_at: now });
      }
      for (const id of receipt.removedLinkIds) {
        const l = links.get(id);
        if (l && l.deleted_at !== null) links.set(id, restoreEntity(l));
      }
      subs.notify();
    },
    async create(name) {
      const clean = normalizeTagName(name);
      const found = aliveTags().find((t) => tagKey(t.name) === tagKey(clean));
      if (found) return { tag: { ...found }, created: false };
      const tag = newTag(clean, userId);
      tags.set(tag.id, tag);
      subs.notify();
      return { tag: { ...tag }, created: true };
    },
    async replaceMany(entries) {
      const list = entries.map((x) => ({ entity: parseOrThrow(taggedEntitySchema, x.entity), tagIds: new Set(x.tagIds) }));
      const alive = new Set(aliveTags().map((t) => t.id));
      for (const { entity, tagIds } of list) {
        const current = linksOf(entity);
        for (const l of current) if (!tagIds.has(l.tag_id)) links.set(l.id, softDelete(l));
        for (const tagId of tagIds) {
          if (!alive.has(tagId) || current.some((l) => l.tag_id === tagId)) continue;
          const now = nowIso();
          const row: EntityTag = {
            id: newId(),
            user_id: userId,
            tag_id: tagId,
            entity_type: entity.type,
            entity_id: entity.id,
            created_at: now,
            updated_at: now,
            deleted_at: null,
          };
          links.set(row.id, row);
        }
      }
      subs.notify();
    },
    async delete(tagId) {
      const tag = aliveTag(tagId);
      for (const l of [...links.values()]) if (l.deleted_at === null && l.tag_id === tagId) links.set(l.id, softDelete(l));
      tags.set(tagId, softDelete(tag));
      subs.notify();
    },
    async applyMany(entities, change) {
      // Valida tudo antes de gravar qualquer coisa (atomicidade).
      const list = entities.map((e) => parseOrThrow(taggedEntitySchema, e));
      const cleanNames = change.add.map(normalizeTagName);
      for (const name of cleanNames) {
        let tag = aliveTags().find((t) => tagKey(t.name) === tagKey(name));
        if (!tag) {
          tag = newTag(name, userId);
          tags.set(tag.id, tag);
        }
        for (const e of list) {
          if (linksOf(e).some((l) => l.tag_id === tag.id)) continue;
          const now = nowIso();
          const row: EntityTag = { id: newId(), user_id: userId, tag_id: tag.id, entity_type: e.type, entity_id: e.id, created_at: now, updated_at: now, deleted_at: null };
          links.set(row.id, row);
        }
      }
      for (const tagId of change.remove) {
        for (const e of list) for (const l of linksOf(e)) if (l.tag_id === tagId) links.set(l.id, softDelete(l));
      }
      subs.notify();
    },
  };
}
