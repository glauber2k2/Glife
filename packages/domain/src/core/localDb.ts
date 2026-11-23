// Contrato do banco local (SQLite no aparelho). Implementado sobre o PowerSync no app e sobre sql.js nos testes.
// TS puro: os repositórios locais dependem só disto, nunca do SDK.
import type { Unsubscribe } from './repository.ts';

/** Valores aceitos como parâmetro: sempre parâmetros `?`, nunca SQL concatenado. */
export type SqlValue = string | number | null;

export interface LocalQueries {
  getAll<T>(sql: string, params?: SqlValue[]): Promise<T[]>;
  getOptional<T>(sql: string, params?: SqlValue[]): Promise<T | null>;
  execute(sql: string, params?: SqlValue[]): Promise<void>;
}

export interface LocalDb extends LocalQueries {
  /** Tudo dentro de `fn` grava junto ou nada grava. */
  writeTransaction<R>(fn: (tx: LocalQueries) => Promise<R>): Promise<R>;
  /** Emite o resultado agora e a cada mudança nas tabelas da consulta, até cancelar. */
  watch<T>(sql: string, params: SqlValue[], onRows: (rows: T[]) => void, onError?: (e: unknown) => void): Unsubscribe;
}
