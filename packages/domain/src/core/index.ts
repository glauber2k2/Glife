// Base de toda entidade do Glife: UUID, dono, timestamps e exclusão lógica.
// Imports relativos usam extensão .ts explícita para rodar também no Deno (Edge Functions).
import { z } from 'zod';
import { parseOrThrow } from './repository.ts';

export const ENTITY_TYPES = [
  'note',
  'tx',
  'account',
  'asset',
  'shopping_item',
  'event',
  'reminder',
  'meal',
  'media',
  'bible',
  'bible_annotation',
  'inbox',
] as const;

export type EntityType = (typeof ENTITY_TYPES)[number];

export const entityTypeSchema = z.enum(ENTITY_TYPES);

export const isoDateTime = z.string().datetime({ offset: true });

export const baseEntitySchema = z.object({
  id: z.uuid(),
  user_id: z.uuid(),
  created_at: isoDateTime,
  updated_at: isoDateTime,
  deleted_at: isoDateTime.nullable(),
});

export type BaseEntity = z.infer<typeof baseEntitySchema>;

// ---------- IDs ----------

type IdGenerator = () => string;

let generator: IdGenerator = () => {
  const c = (globalThis as { crypto?: { randomUUID?: () => string } }).crypto;
  if (c?.randomUUID) return c.randomUUID();
  throw new Error('Nenhum gerador de UUID configurado. Chame setIdGenerator() na inicialização.');
};

/** Permite ao app injetar o gerador da plataforma (ex.: expo-crypto no Android). */
export function setIdGenerator(fn: IdGenerator): void {
  generator = fn;
}

export function newId(): string {
  return generator();
}

// ---------- Timestamps e exclusão lógica ----------

export function nowIso(clock: () => Date = () => new Date()): string {
  return clock().toISOString();
}

export function stampNew<T extends object>(
  data: T,
  userId: string,
  clock?: () => Date,
): T & BaseEntity {
  const now = nowIso(clock);
  return { ...data, id: newId(), user_id: userId, created_at: now, updated_at: now, deleted_at: null };
}

export function stampUpdate<T extends BaseEntity>(entity: T, patch: Partial<T>, clock?: () => Date): T {
  return { ...entity, ...patch, id: entity.id, user_id: entity.user_id, updated_at: nowIso(clock) };
}

export function softDelete<T extends BaseEntity>(entity: T, clock?: () => Date): T {
  const now = nowIso(clock);
  return { ...entity, deleted_at: now, updated_at: now };
}

export function restore<T extends BaseEntity>(entity: T, clock?: () => Date): T {
  return { ...entity, deleted_at: null, updated_at: nowIso(clock) };
}

export function isAlive(entity: Pick<BaseEntity, 'deleted_at'>): boolean {
  return entity.deleted_at === null;
}

// ---------- Criar e atualizar com validação ----------

/** Aplica padrões, valida (Zod) e carimba id, dono e datas. Campos `undefined` do rascunho são ignorados. */
export function createEntity<T extends object>(schema: z.ZodType<T>, defaults: Partial<T>, draft: object, userId: string, clock?: () => Date): T & BaseEntity {
  const clean = Object.fromEntries(Object.entries(draft).filter(([, v]) => v !== undefined));
  return stampNew(parseOrThrow(schema, { ...defaults, ...clean }), userId, clock);
}

/** Junta as mudanças (só campos definidos) e revalida a entidade inteira. */
export function updateEntity<E extends BaseEntity, T extends object>(schema: z.ZodType<T>, entity: E, changes: object, clock?: () => Date): E {
  const clean = Object.fromEntries(Object.entries(changes).filter(([, v]) => v !== undefined));
  const { id: _i, user_id: _u, created_at: _c, updated_at: _up, deleted_at: _d, ...current } = entity;
  const merged = parseOrThrow(schema, { ...current, ...clean });
  return stampUpdate(entity, merged as unknown as Partial<E>, clock);
}

// ---------- Contratos de repositório ----------

export {
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
  RepositoryError,
  decodeCursor,
  encodeCursor,
  isRepositoryError,
  normalizePageRequest,
  parseOrThrow,
  type CursorKey,
  type ErrorListener,
  type Listener,
  type Page,
  type PageRequest,
  type RepositoryErrorCode,
  type Unsubscribe,
} from './repository.ts';
export type { LocalDb, LocalQueries, SqlValue } from './localDb.ts';
export { aliveRow, guardRules, repositoryErrorOf, type RowMap, type RowStore, type RowStoreReads, type RowStoreTx } from './rowStore.ts';
