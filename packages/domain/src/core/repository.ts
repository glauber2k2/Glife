// Contratos comuns a todos os repositórios: erros, paginação por cursor e observação.
// As telas dependem destas interfaces; as implementações (PowerSync, memória) ficam fora do domain.
import { z } from 'zod';

// ---------- Erros ----------

export type RepositoryErrorCode =
  /** Registro ausente, excluído ou de outro dono (indistinguíveis de propósito). */
  | 'not_found'
  /** Entrada inválida (rascunho, patch, cursor, ciclo de pastas…). */
  | 'validation'
  /** Estado impede a operação (ex.: excluir pasta com conteúdo). */
  | 'conflict'
  /** Sem sessão aal2 ou sem permissão. */
  | 'unauthorized'
  /** Armazenamento local indisponível ou falha inesperada. */
  | 'unavailable';

const MESSAGES: Record<RepositoryErrorCode, string> = {
  not_found: 'Registro não encontrado.',
  validation: 'Dados inválidos.',
  conflict: 'A operação conflita com o estado atual.',
  unauthorized: 'Sessão sem permissão para esta operação.',
  unavailable: 'Armazenamento indisponível no momento.',
};

/**
 * Único erro que um repositório lança. A mensagem é fixa e segura para a interface:
 * detalhes (SQL, dados do usuário) só ficam em `cause`, nunca no texto.
 */
export class RepositoryError extends Error {
  readonly code: RepositoryErrorCode;

  constructor(code: RepositoryErrorCode, options?: { cause?: unknown }) {
    super(MESSAGES[code], options);
    this.name = 'RepositoryError';
    this.code = code;
  }
}

export function isRepositoryError(e: unknown, code?: RepositoryErrorCode): e is RepositoryError {
  return e instanceof RepositoryError && (code === undefined || e.code === code);
}

/** Valida com Zod e converte falha em RepositoryError('validation'). */
export function parseOrThrow<T>(schema: z.ZodType<T>, input: unknown): T {
  const r = schema.safeParse(input);
  if (!r.success) throw new RepositoryError('validation', { cause: r.error });
  return r.data;
}

// ---------- Paginação (keyset) ----------

export const DEFAULT_PAGE_SIZE = 50;
export const MAX_PAGE_SIZE = 200;

/** Posição na ordenação: valor da coluna de ordem + id para desempate. */
export interface CursorKey {
  sort: string | number;
  id: string;
}

const cursorKeySchema = z.object({ sort: z.union([z.string(), z.number()]), id: z.uuid() }).strict();

export interface PageRequest {
  limit?: number;
  /** `nextCursor` da página anterior; ausente/null = primeira página. */
  cursor?: string | null;
}

export interface Page<T> {
  items: T[];
  /** Opaco para quem chama. null = não há mais páginas. */
  nextCursor: string | null;
}

export function encodeCursor(key: CursorKey): string {
  return JSON.stringify({ sort: key.sort, id: key.id });
}

export function decodeCursor(raw: string): CursorKey {
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch (cause) {
    throw new RepositoryError('validation', { cause });
  }
  return parseOrThrow(cursorKeySchema, value);
}

export function normalizePageRequest(req: PageRequest = {}): { limit: number; cursor: CursorKey | null } {
  const n = req.limit;
  const limit = n === undefined || Number.isNaN(n)
    ? DEFAULT_PAGE_SIZE
    : Math.min(MAX_PAGE_SIZE, Math.max(1, Math.trunc(n)));
  return { limit, cursor: req.cursor ? decodeCursor(req.cursor) : null };
}

// ---------- Observação ----------

export type Unsubscribe = () => void;
/** Recebe o estado completo a cada mudança (a primeira emissão é o estado atual). */
export type Listener<T> = (value: T) => void;
export type ErrorListener = (error: RepositoryError) => void;
