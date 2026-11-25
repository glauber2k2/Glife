// Armazenamento genérico de linhas de uma feature (o que cada plataforma implementa: SQLite no app, memória nos
// testes). Só guarda e lê linhas do dono da sessão; as regras ficam no repositório da feature, no domain.
import type { BaseEntity } from './index.ts'; // só tipo: sem ciclo em tempo de execução
import { RepositoryError, isRepositoryError, type Unsubscribe } from './repository.ts';

/** Mapa nome da tabela → tipo da linha. */
export type RowMap = Record<string, BaseEntity>;

export interface RowStoreReads<R extends RowMap> {
  /** Linha do dono, inclusive excluída; de outro dono ou inexistente = null. */
  get<K extends keyof R & string>(table: K, id: string): Promise<R[K] | null>;
  /** Linhas não excluídas do dono. */
  listAlive<K extends keyof R & string>(table: K): Promise<R[K][]>;
}

export interface RowStoreTx<R extends RowMap> extends RowStoreReads<R> {
  /** Insere ou substitui pela chave `id`. */
  put<K extends keyof R & string>(table: K, row: R[K]): Promise<void>;
}

export interface RowStore<R extends RowMap> extends RowStoreTx<R> {
  /** Tudo dentro de `fn` grava junto ou nada grava. */
  transaction<T>(fn: (tx: RowStoreTx<R>) => Promise<T>): Promise<T>;
  /** Avisa agora e a cada mudança nas tabelas da feature. */
  watch(onChange: () => void, onError?: (e: unknown) => void): Unsubscribe;
}

/** Erros de regra (RangeError, ZodError) viram `validation`; falha de armazenamento vira `unavailable`. */
export async function guardRules<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (e) {
    if (isRepositoryError(e)) throw e;
    if (e instanceof RangeError || (e instanceof Error && e.name === 'ZodError')) throw new RepositoryError('validation', { cause: e });
    throw new RepositoryError('unavailable', { cause: e });
  }
}

/** Qualquer falha vira RepositoryError (as de armazenamento como `unavailable`). */
export const repositoryErrorOf = (e: unknown): RepositoryError =>
  isRepositoryError(e) ? e : new RepositoryError('unavailable', { cause: e });

/** Linha viva do dono ou `not_found`. */
export async function aliveRow<R extends RowMap, K extends keyof R & string>(db: RowStoreReads<R>, table: K, id: string): Promise<R[K]> {
  const row = await db.get(table, id);
  if (!row || row.deleted_at !== null) throw new RepositoryError('not_found');
  return row;
}
