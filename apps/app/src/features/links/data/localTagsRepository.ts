// Tags sobre o banco local (SQLite via PowerSync). Mesmo comportamento da implementação em memória:
// as duas passam por tagsRepositoryContract. SQL sempre parametrizado.
import { RepositoryError, newId, nowIso, parseOrThrow, type EntityType, type LocalDb, type LocalQueries } from '@glife/domain/core';
import {
  newTag,
  normalizeTagName,
  tagKey,
  taggedEntitySchema,
  type Tag,
  type TaggedEntity,
  type TagsRepository,
} from '@glife/domain/tags';

const TAG_COLUMNS = 'id, user_id, name, created_at, updated_at, deleted_at';
const byName = (a: Tag, b: Tag) => a.name.localeCompare(b.name, 'pt-BR', { sensitivity: 'base' });

const FOR_ENTITY_SQL = `SELECT t.id, t.user_id, t.name, t.created_at, t.updated_at, t.deleted_at
  FROM tags t JOIN entity_tags et ON et.tag_id = t.id
  WHERE t.deleted_at IS NULL AND et.deleted_at IS NULL AND et.entity_type = ? AND et.entity_id = ?`;

const aliveTags = (q: LocalQueries) => q.getAll<Tag>(`SELECT ${TAG_COLUMNS} FROM tags WHERE deleted_at IS NULL`);

/** Tag viva pelo id, ou `not_found`. */
async function aliveTag(q: LocalQueries, id: string): Promise<Tag> {
  const tag = await q.getOptional<Tag>(`SELECT ${TAG_COLUMNS} FROM tags WHERE deleted_at IS NULL AND id = ?`, [id]);
  if (!tag) throw new RepositoryError('not_found');
  return tag;
}

/** Tag viva com o nome (sem diferenciar maiúsculas) ou uma nova. Comparação em JS: o lower() do SQLite não trata acentos. */
async function tagByName(q: LocalQueries, userId: string, clean: string): Promise<Tag> {
  const found = (await aliveTags(q)).find((t) => tagKey(t.name) === tagKey(clean));
  if (found) return found;
  const tag = newTag(clean, userId);
  await q.execute('INSERT INTO tags (id, user_id, name, created_at, updated_at, deleted_at) VALUES (?, ?, ?, ?, ?, ?)', [
    tag.id,
    tag.user_id,
    tag.name,
    tag.created_at,
    tag.updated_at,
    tag.deleted_at,
  ]);
  return tag;
}

/** Liga a tag à entidade se ainda não estiver ligada (idempotente). */
async function link(q: LocalQueries, userId: string, tagId: string, e: TaggedEntity) {
  const linked = await q.getOptional<{ id: string }>(
    'SELECT id FROM entity_tags WHERE deleted_at IS NULL AND tag_id = ? AND entity_type = ? AND entity_id = ?',
    [tagId, e.type, e.id],
  );
  if (linked) return;
  const now = nowIso();
  await q.execute(
    `INSERT INTO entity_tags (id, user_id, tag_id, entity_type, entity_id, created_at, updated_at, deleted_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, NULL)`,
    [newId(), userId, tagId, e.type, e.id, now, now],
  );
}

async function unlink(q: LocalQueries, tagId: string, e: TaggedEntity) {
  const now = nowIso();
  await q.execute(
    `UPDATE entity_tags SET deleted_at = ?, updated_at = ?
     WHERE deleted_at IS NULL AND tag_id = ? AND entity_type = ? AND entity_id = ?`,
    [now, now, tagId, e.type, e.id],
  );
}

export function createLocalTagsRepository(db: LocalDb, userId: string): TagsRepository {
  const list = async () => (await aliveTags(db)).sort(byName);
  return {
    list,

    async forEntity(entity) {
      const e = parseOrThrow(taggedEntitySchema, entity);
      return (await db.getAll<Tag>(FOR_ENTITY_SQL, [e.type, e.id])).sort(byName);
    },

    watchForEntity(entity: TaggedEntity, listener) {
      return db.watch<Tag>(FOR_ENTITY_SQL, [entity.type, entity.id], (rows) => listener(rows.sort(byName)));
    },

    async entitiesWithTag(tagId, type) {
      const rows = await db.getAll<{ entity_id: string }>(
        'SELECT entity_id FROM entity_tags WHERE deleted_at IS NULL AND tag_id = ? AND entity_type = ?',
        [tagId, type],
      );
      return rows.map((r) => r.entity_id);
    },

    async add(entity, name) {
      const e = parseOrThrow(taggedEntitySchema, entity);
      const clean = normalizeTagName(name);
      return db.writeTransaction(async (tx) => {
        const tag = await tagByName(tx, userId, clean);
        await link(tx, userId, tag.id, e);
        return tag;
      });
    },

    async remove(entity, tagId) {
      await unlink(db, tagId, parseOrThrow(taggedEntitySchema, entity));
    },

    async listWithCounts() {
      const [all, rows] = await Promise.all([
        list(),
        db.getAll<{ tag_id: string; entity_type: EntityType; n: number }>(
          'SELECT tag_id, entity_type, COUNT(*) AS n FROM entity_tags WHERE deleted_at IS NULL GROUP BY tag_id, entity_type',
        ),
      ]);
      return all.map((tag) => {
        const counts: Partial<Record<EntityType, number>> = {};
        for (const r of rows) if (r.tag_id === tag.id) counts[r.entity_type] = Number(r.n);
        return { tag, counts };
      });
    },

    async rename(tagId, name) {
      const clean = normalizeTagName(name);
      return db.writeTransaction(async (tx) => {
        const tag = await aliveTag(tx, tagId);
        const alive = await aliveTags(tx);
        if (alive.some((t) => t.id !== tagId && tagKey(t.name) === tagKey(clean))) throw new RepositoryError('conflict');
        const now = nowIso();
        await tx.execute('UPDATE tags SET name = ?, updated_at = ? WHERE id = ?', [clean, now, tagId]);
        return { ...tag, name: clean, updated_at: now };
      });
    },

    async merge(fromId, intoId) {
      if (fromId === intoId) throw new RepositoryError('validation');
      return db.writeTransaction(async (tx) => {
        await aliveTag(tx, fromId);
        const into = await aliveTag(tx, intoId);
        const now = nowIso();
        // Quem já tem as duas: o vínculo da origem só é apagado (sem duplicar).
        await tx.execute(
          `UPDATE entity_tags SET deleted_at = ?, updated_at = ?
           WHERE deleted_at IS NULL AND tag_id = ? AND EXISTS (
             SELECT 1 FROM entity_tags o WHERE o.deleted_at IS NULL AND o.tag_id = ?
               AND o.entity_type = entity_tags.entity_type AND o.entity_id = entity_tags.entity_id)`,
          [now, now, fromId, intoId],
        );
        await tx.execute('UPDATE entity_tags SET tag_id = ?, updated_at = ? WHERE deleted_at IS NULL AND tag_id = ?', [
          intoId,
          now,
          fromId,
        ]);
        await tx.execute('UPDATE tags SET deleted_at = ?, updated_at = ? WHERE id = ?', [now, now, fromId]);
        return into;
      });
    },

    async delete(tagId) {
      await db.writeTransaction(async (tx) => {
        await aliveTag(tx, tagId);
        const now = nowIso();
        await tx.execute('UPDATE entity_tags SET deleted_at = ?, updated_at = ? WHERE deleted_at IS NULL AND tag_id = ?', [
          now,
          now,
          tagId,
        ]);
        await tx.execute('UPDATE tags SET deleted_at = ?, updated_at = ? WHERE id = ?', [now, now, tagId]);
      });
    },

    async applyMany(entities, change) {
      // Valida tudo antes de abrir a transação.
      const targets = entities.map((e) => parseOrThrow(taggedEntitySchema, e));
      const names = change.add.map(normalizeTagName);
      await db.writeTransaction(async (tx) => {
        for (const name of names) {
          const tag = await tagByName(tx, userId, name);
          for (const e of targets) await link(tx, userId, tag.id, e);
        }
        for (const tagId of change.remove) for (const e of targets) await unlink(tx, tagId, e);
      });
    },
  };
}
