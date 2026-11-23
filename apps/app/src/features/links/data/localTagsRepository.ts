// Tags sobre o banco local (SQLite via PowerSync). Mesmo comportamento da implementação em memória:
// as duas passam por tagsRepositoryContract. SQL sempre parametrizado.
import { newId, nowIso, parseOrThrow, type LocalDb } from '@glife/domain/core';
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

export function createLocalTagsRepository(db: LocalDb, userId: string): TagsRepository {
  return {
    async list() {
      return (await db.getAll<Tag>(`SELECT ${TAG_COLUMNS} FROM tags WHERE deleted_at IS NULL`)).sort(byName);
    },

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
        // Comparação sem maiúsculas em JS: o lower() do SQLite não trata acentos.
        const alive = await tx.getAll<Tag>(`SELECT ${TAG_COLUMNS} FROM tags WHERE deleted_at IS NULL`);
        let tag = alive.find((t) => tagKey(t.name) === tagKey(clean));
        if (!tag) {
          tag = newTag(clean, userId);
          await tx.execute(
            'INSERT INTO tags (id, user_id, name, created_at, updated_at, deleted_at) VALUES (?, ?, ?, ?, ?, ?)',
            [tag.id, tag.user_id, tag.name, tag.created_at, tag.updated_at, tag.deleted_at],
          );
        }
        const linked = await tx.getOptional<{ id: string }>(
          `SELECT id FROM entity_tags WHERE deleted_at IS NULL AND tag_id = ? AND entity_type = ? AND entity_id = ?`,
          [tag.id, e.type, e.id],
        );
        if (!linked) {
          const now = nowIso();
          await tx.execute(
            `INSERT INTO entity_tags (id, user_id, tag_id, entity_type, entity_id, created_at, updated_at, deleted_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, NULL)`,
            [newId(), userId, tag.id, e.type, e.id, now, now],
          );
        }
        return tag;
      });
    },

    async remove(entity, tagId) {
      const e = parseOrThrow(taggedEntitySchema, entity);
      const now = nowIso();
      await db.execute(
        `UPDATE entity_tags SET deleted_at = ?, updated_at = ?
         WHERE deleted_at IS NULL AND tag_id = ? AND entity_type = ? AND entity_id = ?`,
        [now, now, tagId, e.type, e.id],
      );
    },
  };
}
