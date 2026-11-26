// "Item não encontrado": para onde aponta um vínculo ou aviso, e se o alvo está vivo, na lixeira ou ausente.
// Registro aberto: cada módulo entrega a fonte dos seus tipos (composta na raiz); links não conhece os módulos.
import type { EntityType, LocalQueries } from '@glife/domain/core';
import { isEntityType } from '@glife/domain/links';

export type TargetStatus = 'alive' | 'trash' | 'missing';

export interface TargetSource {
  type: EntityType;
  /** tabela local do tipo (do próprio módulo) */
  table: string;
  /** como a tela se refere ao item: "Esta nota", "Este lembrete" */
  noun: string;
  /** tela do item vivo (null: não há tela própria) */
  href(id: string): Promise<string | null>;
  /** rota direta `<prefixo><uuid>` usada por avisos (para reconhecer o alvo) */
  routePrefix?: string;
  /** tira da lixeira (a restauração do próprio módulo) */
  restore?(id: string): Promise<void>;
  /** tela da lixeira do módulo */
  trashHref?: string;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const TABLE_RE = /^[a-z_]+$/;

export type RowStatus = (table: string, id: string) => Promise<TargetStatus>;

/** Situação da linha do dono no banco local: viva, com `deleted_at` (lixeira) ou ausente. */
export function createRowStatus(db: Pick<LocalQueries, 'getOptional'>, userId: string): RowStatus {
  return async (table, id) => {
    // A tabela vem do registro dos módulos (nunca de fora), mas só nomes simples entram no SQL.
    if (!TABLE_RE.test(table)) return 'missing';
    const row = await db.getOptional<{ deleted_at: string | null }>(`SELECT deleted_at FROM ${table} WHERE id = ? AND user_id = ?`, [id, userId]);
    if (!row) return 'missing';
    return row.deleted_at ? 'trash' : 'alive';
  };
}

export type ResolveTarget = (type: EntityType, id: string) => Promise<TargetStatus>;

export function createTargetResolver(rowStatus: RowStatus, sources: readonly TargetSource[]): ResolveTarget {
  const byType = new Map(sources.map((s) => [s.type, s]));
  return async (type, id) => {
    const source = byType.get(type);
    if (!source || !UUID_RE.test(id)) return 'missing';
    return rowStatus(source.table, id.toLowerCase());
  };
}

/** semtela: existe, mas não há tela para abrir esse tipo por aqui. */
export type NotFoundView = 'lixeira' | 'naosync' | 'apagado' | 'semtela';

/** Ausente antes da primeira sincronização (ou enquanto baixa) ainda pode chegar; depois, foi excluído de vez. */
export function notFoundView(status: TargetStatus, sync: { hasSynced: boolean | undefined; downloading: boolean }): NotFoundView {
  if (status === 'alive') return 'semtela';
  if (status === 'trash') return 'lixeira';
  return sync.hasSynced !== true || sync.downloading ? 'naosync' : 'apagado';
}

export interface TargetRef {
  type: EntityType;
  id: string;
}

/** Parâmetros da rota /nao-encontrado: tipo conhecido (não Bíblia) e uuid. */
export function parseNotFoundParams(params: Record<string, string | string[] | undefined>): TargetRef | null {
  const { tipo, id } = params;
  if (typeof tipo !== 'string' || typeof id !== 'string') return null;
  if (!isEntityType(tipo) || tipo === 'bible' || !UUID_RE.test(id)) return null;
  return { type: tipo, id: id.toLowerCase() };
}

/** Rota aberta por um aviso que aponta direto para um item registrado (`/agenda/lembrete/<uuid>`). */
export function targetOfRoute(route: string, sources: readonly TargetSource[]): TargetRef | null {
  for (const s of sources) {
    if (!s.routePrefix || !route.startsWith(s.routePrefix)) continue;
    const id = route.slice(s.routePrefix.length);
    if (UUID_RE.test(id)) return { type: s.type, id: id.toLowerCase() };
  }
  return null;
}

export const notFoundHref = ({ type, id }: TargetRef) => `/nao-encontrado?tipo=${type}&id=${id}`;
