// Tags aplicáveis a qualquer entidade (`public.tags` + `public.entity_tags`).
// O nome é guardado sem "#", aparado; não diferencia maiúsculas (uma tag "Romanos" = "romanos").
import { z } from 'zod';

import {
  baseEntitySchema,
  entityTypeSchema,
  parseOrThrow,
  stampNew,
  type EntityType,
  type Unsubscribe,
} from '../core/index.ts';

export const TAG_NAME_MAX = 60;

export const tagSchema = baseEntitySchema.extend({ name: z.string() });
export type Tag = z.infer<typeof tagSchema>;

export const entityTagSchema = baseEntitySchema.extend({
  tag_id: z.uuid(),
  entity_type: entityTypeSchema,
  entity_id: z.uuid(),
});
export type EntityTag = z.infer<typeof entityTagSchema>;

/** "#Romanos 8 " → "Romanos 8". Uma linha, sem "#" no início, sem vazio. */
export const tagNameSchema = z
  .string()
  .transform((s) => s.trim().replace(/^#+/, '').trim())
  .pipe(z.string().min(1).max(TAG_NAME_MAX).refine((s) => !/[\r\n]/.test(s), 'Uma linha só.'));

export function normalizeTagName(raw: string): string {
  return parseOrThrow(tagNameSchema, raw);
}

/** Chave de comparação: igual para "Romanos" e "romanos". */
export const tagKey = (name: string) => name.toLocaleLowerCase('pt-BR');

export function newTag(name: string, userId: string, clock?: () => Date): Tag {
  return stampNew({ name: normalizeTagName(name) }, userId, clock);
}

export interface TaggedEntity {
  type: EntityType;
  id: string;
}

export const taggedEntitySchema = z.object({ type: entityTypeSchema, id: z.uuid() });

export interface TagsRepository {
  /** Tags ativas, por nome. */
  list(): Promise<Tag[]>;
  /** Tags ativas de uma entidade, por nome. */
  forEntity(entity: TaggedEntity): Promise<Tag[]>;
  /** Emite as tags da entidade agora e a cada mudança. */
  watchForEntity(entity: TaggedEntity, listener: (tags: Tag[]) => void): Unsubscribe;
  /** ids das entidades de um tipo que têm a tag. */
  entitiesWithTag(tagId: string, type: EntityType): Promise<string[]>;
  /** Aplica a tag pelo nome (reaproveita a existente, sem diferenciar maiúsculas). Idempotente. */
  add(entity: TaggedEntity, name: string): Promise<Tag>;
  /** Tira a tag da entidade (a tag continua existindo para as outras). */
  remove(entity: TaggedEntity, tagId: string): Promise<void>;
}
