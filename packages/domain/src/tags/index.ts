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
  /** Tags ativas, por nome, com quantos itens de cada tipo têm cada uma (tipos sem item ficam de fora). */
  listWithCounts(): Promise<TagWithCounts[]>;
  /** Novo nome; outra tag com o mesmo nome (sem diferenciar maiúsculas) → `conflict` (a saída é juntar). */
  rename(tagId: string, name: string): Promise<Tag>;
  /**
   * Junta `fromId` em `intoId`: os itens passam para a escolhida (sem duplicar quem já tinha as duas) e a de
   * origem é excluída. Tudo numa transação. Juntar com ela mesma → `validation`; inexistente → `not_found`.
   */
  merge(fromId: string, intoId: string): Promise<MergeReceipt>;
  /**
   * Desfaz um `merge` numa transação: a tag de origem volta, os vínculos movidos voltam para ela e os que foram
   * apagados por duplicar voltam. Se outra tag viva já usa o nome da origem → `conflict` (nada muda).
   */
  unmerge(receipt: MergeReceipt): Promise<void>;
  /** Cria a tag pelo nome sem aplicar a nada; se já existe (sem diferenciar maiúsculas), devolve a existente. */
  create(name: string): Promise<{ tag: Tag; created: boolean }>;
  /** Exclui a tag e os vínculos (exclusão lógica); os itens ficam, só perdem a tag. */
  delete(tagId: string): Promise<void>;
  /** Em lote e tudo ou nada: aplica as tags `add` (por nome) e tira as `remove` (por id) de todas as entidades. */
  applyMany(entities: readonly TaggedEntity[], change: { add: readonly string[]; remove: readonly string[] }): Promise<void>;
  /**
   * Em lote e tudo ou nada: deixa cada entidade com exatamente estas tags (o "Desfazer" do `applyMany`, a partir do
   * retrato tirado antes). Tags que não existem mais são ignoradas.
   */
  replaceMany(entries: readonly { entity: TaggedEntity; tagIds: readonly string[] }[]): Promise<void>;
}

/** O que um `merge` mudou, para poder desfazer. */
export interface MergeReceipt {
  /** a tag que ficou */
  into: Tag;
  /** a tag que foi absorvida (como era antes) */
  from: Tag;
  /** vínculos que trocaram de tag (origem → escolhida) */
  movedLinkIds: string[];
  /** vínculos da origem apagados porque a entidade já tinha a escolhida */
  removedLinkIds: string[];
}

export interface TagWithCounts {
  tag: Tag;
  counts: Partial<Record<EntityType, number>>;
}

/** Item de qualquer módulo com uma tag, já pronto para a tela da tag. */
export interface TaggedItem {
  id: string;
  title: string;
  meta?: string;
  /** rota interna (Expo Router) para abrir o item */
  href: string;
}

/**
 * Cada módulo diz como mostrar os seus itens com tag (registro aberto, como as fontes da busca).
 * `resolve` ignora ids que não existem mais ou estão na lixeira.
 */
export interface TaggedItemSource {
  type: EntityType;
  /** rótulo do grupo e do filtro (ex.: "Notas", "Gastos") */
  label: string;
  resolve(ids: readonly string[]): Promise<TaggedItem[]>;
  /** Só os ids que ainda existem vivos (fora da lixeira) — para as contagens baterem com a tela da tag. */
  alive(ids: readonly string[]): Promise<string[]>;
}

/** Texto curto "5 notas · 6 gastos" a partir das contagens; `units` dá singular/plural por tipo. */
export function describeTagCounts(
  counts: Partial<Record<EntityType, number>>,
  units: Partial<Record<EntityType, readonly [string, string]>>,
): string {
  const parts: string[] = [];
  for (const [type, n] of Object.entries(counts) as [EntityType, number][]) {
    if (!n) continue;
    const u = units[type] ?? ['item', 'itens'];
    parts.push(`${n} ${n === 1 ? u[0] : u[1]}`);
  }
  return parts.join(' · ');
}

/** Total de itens de uma tag. */
export const tagTotal = (counts: Partial<Record<EntityType, number>>) =>
  Object.values(counts).reduce<number>((a, n) => a + (n ?? 0), 0);
