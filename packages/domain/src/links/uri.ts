// Endereço universal: vida://<tipo>/<ref>
// ref é um UUID para entidades comuns, ou uma referência OSIS para a Bíblia (JHN.3.16-18).
import { ENTITY_TYPES, type EntityType } from '../core/index.ts';
import { parseOsis } from '../bible/index.ts';

export const VIDA_SCHEME = 'vida';

export interface EntityAddress {
  type: EntityType;
  ref: string;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isEntityType(s: string): s is EntityType {
  return (ENTITY_TYPES as readonly string[]).includes(s);
}

export function isValidRef(type: EntityType, ref: string): boolean {
  if (type === 'bible') return parseOsis(ref) !== null;
  return UUID_RE.test(ref);
}

export function toUri({ type, ref }: EntityAddress): string {
  return `${VIDA_SCHEME}://${type}/${ref}`;
}

export function parseUri(uri: string): EntityAddress | null {
  const m = uri.trim().match(/^vida:\/\/([a-z_]+)\/([^/?#\s]+)$/);
  if (!m) return null;
  const [, type, ref] = m;
  if (!type || !ref || !isEntityType(type) || !isValidRef(type, ref)) return null;
  return { type, ref: type === 'bible' ? ref : ref.toLowerCase() };
}
