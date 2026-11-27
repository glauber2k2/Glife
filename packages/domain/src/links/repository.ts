// Contrato do grafo de links. Implementações: `features/links/data` (PowerSync)
// e `@glife/domain/testing` (memória). Toda implementação passa por `linksRepositoryContract`.
import { z } from 'zod';

import {
  ENTITY_TYPES,
  RepositoryError,
  parseOrThrow,
  type EntityType,
  type ErrorListener,
  type Listener,
  type Page,
  type PageRequest,
  type Unsubscribe,
} from '../core/index.ts';
import type { DesiredLink, LinkDiff, LinkRow } from './sync.ts';
import { isValidRef, type EntityAddress } from './uri.ts';

/** Link gravado, como sai do banco. */
export type Link = LinkRow & { user_id: string; created_at: string; updated_at: string };

/** Origem de um link: sempre uma entidade com UUID (a Bíblia só pode ser alvo). */
export type SourceType = Exclude<EntityType, 'bible'>;
export interface SourceAddress {
  type: SourceType;
  id: string;
}

const SOURCE_TYPES = ENTITY_TYPES.filter((t): t is SourceType => t !== 'bible');

export const sourceAddressSchema = z.object({ type: z.enum(SOURCE_TYPES), id: z.uuid() });

export const desiredLinkSchema = z
  .object({
    target_type: z.enum(ENTITY_TYPES),
    target_ref: z.string(),
    relation: z.enum(['ref', 'embed', 'receipt', 'about']),
  })
  .refine((l) => isValidRef(l.target_type, l.target_ref), 'Referência inválida para o tipo.');

/** Valida origem + alvo e recusa link de uma entidade para ela mesma. */
export function validateNewLink(source: SourceAddress, link: DesiredLink): { source: SourceAddress; link: DesiredLink } {
  const s = parseOrThrow(sourceAddressSchema, source);
  const l = parseOrThrow(desiredLinkSchema, link) as DesiredLink;
  if (l.target_type === s.type && l.target_ref.toLowerCase() === s.id.toLowerCase()) {
    throw new RepositoryError('validation');
  }
  return { source: s, link: l };
}

export interface LinksRepository {
  /** Links ativos que saem da entidade (qualquer origem). */
  outgoing(source: SourceAddress): Promise<Link[]>;
  /** Links ativos que apontam para o alvo, do mais recente ao mais antigo. */
  backlinks(target: EntityAddress, page?: PageRequest): Promise<Page<Link>>;
  /** Emite os backlinks (primeira página) agora e a cada mudança, até cancelar. */
  watchBacklinks(target: EntityAddress, listener: Listener<Link[]>, onError?: ErrorListener): Unsubscribe;
  /** Emite agora e a cada mudança os links ativos para qualquer ref bíblica do livro (`JHN.…`), sem paginar. */
  watchBibleBook(book: string, listener: Listener<Link[]>, onError?: ErrorListener): Unsubscribe;
  /** Emite agora e a cada mudança todos os links ativos para refs bíblicas, do mais recente ao mais antigo. */
  watchBibleAll(listener: Listener<Link[]>, onError?: ErrorListener): Unsubscribe;
  /**
   * Link manual. Idempotente: se já existe link ativo igual (mesma origem, alvo, relação e origem),
   * devolve o existente — inclusive quando o banco responde 23505 por cópia criada em outro aparelho.
   */
  add(source: SourceAddress, link: DesiredLink): Promise<Link>;
  /** Exclusão lógica. */
  remove(id: string): Promise<void>;
  /**
   * Aplica, de forma atômica, o resultado de `diffMarkdownLinks` para a entidade.
   * `remove` só aceita ids de links `markdown` ativos dessa mesma origem (senão `validation`, nada aplicado).
   */
  applyMarkdownDiff(source: SourceAddress, diff: LinkDiff): Promise<void>;
}
