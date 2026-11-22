import { describe, expect, it } from 'vitest';

import {
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
  RepositoryError,
  decodeCursor,
  encodeCursor,
  isRepositoryError,
  normalizePageRequest,
} from '../index.ts';

const ID = '9f2c0000-0000-4000-8000-000000000003';

describe('paginação', () => {
  it('usa o tamanho padrão quando nada é pedido', () => {
    expect(normalizePageRequest()).toEqual({ limit: DEFAULT_PAGE_SIZE, cursor: null });
  });

  it('limita o tamanho entre 1 e o máximo', () => {
    expect(normalizePageRequest({ limit: 0 }).limit).toBe(1);
    expect(normalizePageRequest({ limit: -5 }).limit).toBe(1);
    expect(normalizePageRequest({ limit: 10_000 }).limit).toBe(MAX_PAGE_SIZE);
    expect(normalizePageRequest({ limit: 12.7 }).limit).toBe(12);
    expect(normalizePageRequest({ limit: Number.NaN }).limit).toBe(DEFAULT_PAGE_SIZE);
  });

  it('cursor faz ida e volta', () => {
    const key = { sort: '2026-11-22T10:00:00.000Z', id: ID };
    expect(decodeCursor(encodeCursor(key))).toEqual(key);
    expect(decodeCursor(encodeCursor({ sort: 3, id: ID }))).toEqual({ sort: 3, id: ID });
  });

  it.each(['', 'lixo', '{"sort":1}', '{"sort":1,"id":"nao-uuid"}', '{"sort":{},"id":"' + ID + '"}'])(
    'cursor inválido vira erro de validação: %s',
    (raw) => {
      expect(() => decodeCursor(raw)).toThrowError(RepositoryError);
      try {
        decodeCursor(raw);
      } catch (e) {
        expect(isRepositoryError(e, 'validation')).toBe(true);
      }
    },
  );

  it('normaliza e valida o cursor recebido', () => {
    const cursor = encodeCursor({ sort: 1, id: ID });
    expect(normalizePageRequest({ cursor }).cursor).toEqual({ sort: 1, id: ID });
    expect(() => normalizePageRequest({ cursor: 'lixo' })).toThrowError(RepositoryError);
  });
});

describe('RepositoryError', () => {
  it('carrega código e não expõe dados no texto', () => {
    const e = new RepositoryError('not_found');
    expect(e.code).toBe('not_found');
    expect(e.message).toBe('Registro não encontrado.');
    expect(e).toBeInstanceOf(Error);
    expect(isRepositoryError(e)).toBe(true);
    expect(isRepositoryError(e, 'conflict')).toBe(false);
    expect(isRepositoryError(new Error('x'))).toBe(false);
  });

  it('preserva a causa original sem colocá-la na mensagem', () => {
    const cause = new Error('duplicate key value violates unique constraint "links_unico_ativo"');
    const e = new RepositoryError('conflict', { cause });
    expect(e.cause).toBe(cause);
    expect(e.message).not.toContain('links_unico_ativo');
  });
});
